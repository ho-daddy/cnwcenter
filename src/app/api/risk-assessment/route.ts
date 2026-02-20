import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { RiskEvaluationType, Prisma } from '@prisma/client'

// GET /api/risk-assessment — 평가카드 목록
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const year = searchParams.get('year')
  const workplaceId = searchParams.get('workplaceId')

  const where: Prisma.RiskAssessmentCardWhereInput = {}

  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)
  if (accessibleIds !== null) where.workplaceId = { in: accessibleIds }
  if (year) where.year = parseInt(year)
  if (workplaceId) {
    if (accessibleIds === null || accessibleIds.includes(workplaceId)) {
      where.workplaceId = workplaceId
    }
  }

  const cards = await prisma.riskAssessmentCard.findMany({
    where,
    orderBy: [{ year: 'desc' }, { updatedAt: 'desc' }],
    include: {
      workplace: { select: { id: true, name: true } },
      organizationUnit: { select: { id: true, name: true } },
      _count: { select: { hazards: true } },
    },
  })

  return NextResponse.json({ cards })
}

// POST /api/risk-assessment — 평가카드 생성
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await req.json()
  const {
    workplaceId, organizationUnitId, year, evaluationType, evaluationReason,
    workerName, evaluatorName, dailyWorkingHours, dailyProduction,
    annualWorkingDays, workCycle, workDescription,
  } = body

  if (!workplaceId || !organizationUnitId || !year || !evaluationType || !workerName || !evaluatorName || !workDescription) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
  }

  // 접근 권한 확인
  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)
  if (accessibleIds !== null && !accessibleIds.includes(workplaceId)) {
    return NextResponse.json({ error: '해당 사업장에 대한 권한이 없습니다.' }, { status: 403 })
  }

  // 평가번호 자동생성: YYYY-RA-NNNN
  const count = await prisma.riskAssessmentCard.count({ where: { workplaceId, year: parseInt(year) } })
  const evaluationNumber = `${year}-RA-${String(count + 1).padStart(4, '0')}`

  try {
    const card = await prisma.riskAssessmentCard.create({
      data: {
        workplaceId,
        organizationUnitId,
        year: parseInt(year),
        evaluationType: evaluationType as RiskEvaluationType,
        evaluationReason: evaluationType === 'OCCASIONAL' ? evaluationReason : null,
        evaluationNumber,
        workerName,
        evaluatorName,
        dailyWorkingHours: dailyWorkingHours || null,
        dailyProduction: dailyProduction || null,
        annualWorkingDays: annualWorkingDays || null,
        workCycle: workCycle || null,
        workDescription,
      },
      include: {
        workplace: { select: { name: true } },
        organizationUnit: { select: { name: true } },
      },
    })
    return NextResponse.json(card, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: '해당 평가단위/연도/평가구분으로 이미 카드가 존재합니다.' }, { status: 409 })
    }
    throw e
  }
}
