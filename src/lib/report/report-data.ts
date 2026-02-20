import { prisma } from '@/lib/prisma'

// ─── 타입 정의 ───

export interface ReportWorkplace {
  id: string
  name: string
  address: string | null
  contacts: { name: string; phone: string | null; email: string | null }[]
}

export interface ReportCard {
  id: string
  year: number
  evaluationType: string
  evaluationReason: string | null
  workerName: string
  evaluatorName: string
  workDescription: string
  unitName: string        // 평가단위명
  parentUnitName: string | null // 상위단위명
  hazardCount: number
}

export interface ReportHazard {
  id: string
  cardId: string
  hazardCategory: string
  hazardFactor: string
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  riskScore: number
  improvementPlan: string | null
  year: number
  unitName: string
  parentUnitName: string | null
  chemicalProductName: string | null
  // 최신 개선 기록
  latestImprovement: {
    riskScore: number
    status: string
  } | null
}

export interface ReportImprovement {
  id: string
  status: string
  updateDate: Date
  improvementContent: string
  responsiblePerson: string
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  riskScore: number
  remarks: string | null
  // 연관 위험요인 정보
  hazardFactor: string
  hazardCategory: string
  originalRiskScore: number
  unitName: string
  parentUnitName: string | null
}

export interface ReportData {
  workplace: ReportWorkplace
  cards: ReportCard[]
  hazards: ReportHazard[]
  improvements: ReportImprovement[]
}

// ─── 데이터 조회 ───

export async function fetchReportData(
  year: number,
  workplaceId: string
): Promise<ReportData> {
  const [workplace, cards, hazards, improvements] = await Promise.all([
    // 1. 사업장 정보
    prisma.workplace.findUniqueOrThrow({
      where: { id: workplaceId },
      include: {
        contacts: { select: { name: true, phone: true, email: true } },
      },
    }),

    // 2. 평가카드
    prisma.riskAssessmentCard.findMany({
      where: { workplaceId, year },
      orderBy: [
        { organizationUnit: { parent: { name: 'asc' } } },
        { organizationUnit: { name: 'asc' } },
        { evaluationType: 'asc' },
      ],
      include: {
        organizationUnit: {
          select: {
            name: true,
            parent: { select: { name: true } },
          },
        },
        _count: { select: { hazards: true } },
      },
    }),

    // 3. 위험요인
    prisma.riskHazard.findMany({
      where: { workplaceId, year },
      orderBy: [
        { card: { organizationUnit: { parent: { name: 'asc' } } } },
        { card: { organizationUnit: { name: 'asc' } } },
        { riskScore: 'desc' },
      ],
      include: {
        card: {
          select: {
            organizationUnit: {
              select: {
                name: true,
                parent: { select: { name: true } },
              },
            },
          },
        },
        chemicalProduct: { select: { name: true } },
        improvements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { riskScore: true, status: true },
        },
      },
    }),

    // 4. 개선 이력
    prisma.riskImprovementRecord.findMany({
      where: {
        hazard: { workplaceId, year },
      },
      orderBy: [{ status: 'asc' }, { updateDate: 'asc' }],
      include: {
        hazard: {
          select: {
            hazardFactor: true,
            hazardCategory: true,
            riskScore: true,
            card: {
              select: {
                organizationUnit: {
                  select: {
                    name: true,
                    parent: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ])

  return {
    workplace: {
      id: workplace.id,
      name: workplace.name,
      address: workplace.address,
      contacts: workplace.contacts,
    },
    cards: cards.map(c => ({
      id: c.id,
      year: c.year,
      evaluationType: c.evaluationType,
      evaluationReason: c.evaluationReason,
      workerName: c.workerName,
      evaluatorName: c.evaluatorName,
      workDescription: c.workDescription,
      unitName: c.organizationUnit.name,
      parentUnitName: c.organizationUnit.parent?.name ?? null,
      hazardCount: c._count.hazards,
    })),
    hazards: hazards.map(h => ({
      id: h.id,
      cardId: h.cardId,
      hazardCategory: h.hazardCategory,
      hazardFactor: h.hazardFactor,
      severityScore: h.severityScore,
      likelihoodScore: h.likelihoodScore,
      additionalPoints: h.additionalPoints,
      riskScore: h.riskScore,
      improvementPlan: h.improvementPlan,
      year: h.year,
      unitName: h.card.organizationUnit.name,
      parentUnitName: h.card.organizationUnit.parent?.name ?? null,
      chemicalProductName: h.chemicalProduct?.name ?? null,
      latestImprovement: h.improvements[0]
        ? { riskScore: h.improvements[0].riskScore, status: h.improvements[0].status }
        : null,
    })),
    improvements: improvements.map(imp => ({
      id: imp.id,
      status: imp.status,
      updateDate: imp.updateDate,
      improvementContent: imp.improvementContent,
      responsiblePerson: imp.responsiblePerson,
      severityScore: imp.severityScore,
      likelihoodScore: imp.likelihoodScore,
      additionalPoints: imp.additionalPoints,
      riskScore: imp.riskScore,
      remarks: imp.remarks,
      hazardFactor: imp.hazard.hazardFactor,
      hazardCategory: imp.hazard.hazardCategory,
      originalRiskScore: imp.hazard.riskScore,
      unitName: imp.hazard.card.organizationUnit.name,
      parentUnitName: imp.hazard.card.organizationUnit.parent?.name ?? null,
    })),
  }
}
