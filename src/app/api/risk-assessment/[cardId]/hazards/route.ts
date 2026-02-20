import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import { HazardCategory } from '@prisma/client'

type Params = { params: { cardId: string } }

function calcRiskScore(category: HazardCategory, severity: number, likelihood: number, additional: number) {
  if (category === 'ABSOLUTE') return 16
  return severity * likelihood + additional
}

// GET /api/risk-assessment/[cardId]/hazards
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const card = await prisma.riskAssessmentCard.findUnique({ where: { id: params.cardId } })
  if (!card) return NextResponse.json({ error: '카드를 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(card.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  const hazards = await prisma.riskHazard.findMany({
    where: { cardId: params.cardId },
    orderBy: [{ hazardCategory: 'asc' }, { createdAt: 'asc' }],
    include: {
      chemicalProduct: { select: { id: true, name: true } },
      improvements: { orderBy: { createdAt: 'desc' } },
      photos: { orderBy: { createdAt: 'asc' }, select: { id: true, photoPath: true, thumbnailPath: true } },
    },
  })

  return NextResponse.json({ hazards })
}

// POST /api/risk-assessment/[cardId]/hazards
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const card = await prisma.riskAssessmentCard.findUnique({ where: { id: params.cardId } })
  if (!card) return NextResponse.json({ error: '카드를 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(card.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  const body = await req.json()
  const { hazardCategory, hazardFactor, severityScore, likelihoodScore, additionalPoints, additionalDetails, improvementPlan, chemicalProductId } = body

  if (!hazardCategory || !hazardFactor || severityScore == null || likelihoodScore == null) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
  }

  const category = hazardCategory as HazardCategory
  const severity = parseInt(severityScore)
  const likelihood = parseInt(likelihoodScore)
  const additional = parseInt(additionalPoints ?? 0)
  const riskScore = calcRiskScore(category, severity, likelihood, additional)

  const hazard = await prisma.riskHazard.create({
    data: {
      cardId: params.cardId,
      workplaceId: card.workplaceId,
      hazardCategory: category,
      hazardFactor,
      severityScore: severity,
      likelihoodScore: likelihood,
      additionalPoints: additional,
      additionalDetails: additionalDetails || null,
      riskScore,
      improvementPlan: improvementPlan || null,
      year: card.year,
      chemicalProductId: category === 'CHEMICAL' ? (chemicalProductId || null) : null,
    },
    include: {
      chemicalProduct: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(hazard, { status: 201 })
}
