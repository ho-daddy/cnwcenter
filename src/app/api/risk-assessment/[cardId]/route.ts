import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import { RiskEvaluationType } from '@prisma/client'

type Params = { params: { cardId: string } }

// GET /api/risk-assessment/[cardId]
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const card = await prisma.riskAssessmentCard.findUnique({
    where: { id: params.cardId },
    include: {
      workplace: { select: { id: true, name: true } },
      organizationUnit: { select: { id: true, name: true } },
      hazards: {
        orderBy: [{ hazardCategory: 'asc' }, { createdAt: 'asc' }],
        include: {
          chemicalProduct: { select: { id: true, name: true } },
          _count: { select: { improvements: true } },
        },
      },
      _count: { select: { hazards: true } },
    },
  })

  if (!card) return NextResponse.json({ error: '평가카드를 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(card.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  return NextResponse.json(card)
}

// PUT /api/risk-assessment/[cardId]
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const card = await prisma.riskAssessmentCard.findUnique({ where: { id: params.cardId } })
  if (!card) return NextResponse.json({ error: '평가카드를 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(card.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  const body = await req.json()
  const updated = await prisma.riskAssessmentCard.update({
    where: { id: params.cardId },
    data: {
      evaluationType: body.evaluationType as RiskEvaluationType,
      evaluationReason: body.evaluationType === 'OCCASIONAL' ? body.evaluationReason : null,
      workerName: body.workerName,
      evaluatorName: body.evaluatorName,
      dailyWorkingHours: body.dailyWorkingHours || null,
      dailyProduction: body.dailyProduction || null,
      annualWorkingDays: body.annualWorkingDays || null,
      workCycle: body.workCycle || null,
      workDescription: body.workDescription,
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/risk-assessment/[cardId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const card = await prisma.riskAssessmentCard.findUnique({ where: { id: params.cardId } })
  if (!card) return NextResponse.json({ error: '평가카드를 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(card.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  await prisma.riskAssessmentCard.delete({ where: { id: params.cardId } })
  return NextResponse.json({ success: true })
}
