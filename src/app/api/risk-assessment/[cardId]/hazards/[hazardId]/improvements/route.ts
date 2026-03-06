import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import { ImprovementStatus, HazardCategory } from '@prisma/client'
import { parseJsonBody, ApiError } from '@/lib/api-utils'

type Params = { params: { cardId: string; hazardId: string } }

function calcRiskScore(category: HazardCategory, severity: number, likelihood: number, additional: number) {
  if (category === 'ABSOLUTE') return 16
  return severity * likelihood + additional
}

// GET /api/risk-assessment/[cardId]/hazards/[hazardId]/improvements
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const hazard = await prisma.riskHazard.findUnique({ where: { id: params.hazardId } })
  if (!hazard || hazard.cardId !== params.cardId) {
    return NextResponse.json({ error: '유해요인을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(hazard.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  const improvements = await prisma.riskImprovementRecord.findMany({
    where: { hazardId: params.hazardId },
    orderBy: { updateDate: 'asc' },
    include: {
      photos: { orderBy: { createdAt: 'asc' }, select: { id: true, photoPath: true, thumbnailPath: true } },
    },
  })

  return NextResponse.json({ improvements })
}

// POST /api/risk-assessment/[cardId]/hazards/[hazardId]/improvements
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const hazard = await prisma.riskHazard.findUnique({ where: { id: params.hazardId } })
  if (!hazard || hazard.cardId !== params.cardId) {
    return NextResponse.json({ error: '유해요인을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(hazard.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  try {
    const body = await parseJsonBody(req)
    const { status, updateDate, improvementContent, responsiblePerson, severityScore, likelihoodScore, additionalPoints, remarks } = body

    if (!updateDate || !improvementContent || !responsiblePerson || severityScore == null || likelihoodScore == null) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }

    const severity = parseInt(severityScore)
    const likelihood = parseInt(likelihoodScore)
    const additional = parseInt(additionalPoints ?? 0)
    const riskScore = calcRiskScore(hazard.hazardCategory, severity, likelihood, additional)

    const improvement = await prisma.riskImprovementRecord.create({
      data: {
        hazardId: params.hazardId,
        status: (status as ImprovementStatus) || 'PLANNED',
        updateDate: new Date(updateDate),
        improvementContent,
        responsiblePerson,
        severityScore: severity,
        likelihoodScore: likelihood,
        additionalPoints: additional,
        riskScore,
        remarks: remarks || null,
      },
    })

    return NextResponse.json(improvement, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
