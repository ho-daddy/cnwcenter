import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import { archiveRiskImprovement } from '@/lib/archive-utils'
import { ImprovementStatus, HazardCategory } from '@prisma/client'
import { parseJsonBody, ApiError } from '@/lib/api-utils'

type Params = { params: { improvementId: string } }

function calcRiskScore(category: HazardCategory, severity: number, likelihood: number, additional: number) {
  if (category === 'ABSOLUTE') return 16
  return severity * likelihood + additional
}

// PUT /api/risk-assessment/improvements/[improvementId]
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const record = await prisma.riskImprovementRecord.findUnique({
    where: { id: params.improvementId },
    include: { hazard: true },
  })
  if (!record) return NextResponse.json({ error: '개선이력을 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(record.hazard.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  try {
    const body = await parseJsonBody(req)
    const severity = parseInt(body.severityScore ?? record.severityScore)
    const likelihood = parseInt(body.likelihoodScore ?? record.likelihoodScore)
    const additional = parseInt(body.additionalPoints ?? record.additionalPoints)
    const riskScore = calcRiskScore(record.hazard.hazardCategory, severity, likelihood, additional)

    const updated = await prisma.riskImprovementRecord.update({
      where: { id: params.improvementId },
      data: {
        status: (body.status as ImprovementStatus) || record.status,
        updateDate: body.updateDate ? new Date(body.updateDate) : record.updateDate,
        improvementContent: body.improvementContent ?? record.improvementContent,
        responsiblePerson: body.responsiblePerson ?? record.responsiblePerson,
        severityScore: severity,
        likelihoodScore: likelihood,
        additionalPoints: additional,
        riskScore,
        remarks: body.remarks ?? record.remarks,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE /api/risk-assessment/improvements/[improvementId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const record = await prisma.riskImprovementRecord.findUnique({
    where: { id: params.improvementId },
    include: { hazard: true },
  })
  if (!record) return NextResponse.json({ error: '개선이력을 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(record.hazard.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  // 삭제 전 아카이브
  await archiveRiskImprovement(params.improvementId, auth.user!.id)

  await prisma.riskImprovementRecord.delete({ where: { id: params.improvementId } })
  return NextResponse.json({ success: true })
}
