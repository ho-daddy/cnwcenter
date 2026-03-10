import { prisma } from '@/lib/prisma'

export interface MSReportData {
  workplace: {
    id: string
    name: string
    address: string | null
  }
  year: number
  assessments: MSReportAssessment[]
  orgLevelRange: { min: number; max: number }
}

// 조직도 계층 경로 (레벨별 단위명)
export interface OrgUnitPath {
  level: number
  name: string
}

export interface MSReportAssessment {
  id: string
  organizationUnit: { id: string; name: string }
  unitPath: OrgUnitPath[] // 루트부터 현재 단위까지의 경로
  assessmentType: string
  status: string
  workerName: string | null
  investigatorName: string | null
  dailyWorkHours: number | null
  workFrequency: string | null
  employmentType: string | null
  shiftType: string | null
  jobAutonomy: number | null
  managementLevel: string | null
  overallComment: string | null
  skipSheet2: boolean
  skipSheet3: boolean
  // 부담부위
  affectedHandWrist: boolean
  affectedElbow: boolean
  affectedShoulder: boolean
  affectedNeck: boolean
  affectedBack: boolean
  affectedKnee: boolean
  // 기타위험
  hasNoise: boolean
  hasThermal: boolean
  hasBurn: boolean
  hasDust: boolean
  hasAccident: boolean
  hasStress: boolean
  hasOtherRisk: boolean
  // 작업조건변화
  changeWorkHours: string | null
  changeWorkSpeed: string | null
  changeManpower: string | null
  changeWorkload: string | null
  changeEquipment: string | null

  elementWorks: MSReportElementWork[]
  improvements: MSReportImprovement[]
}

export interface MSReportElementWork {
  id: string
  sortOrder: number
  name: string
  description: string | null
  toolWeight: number | null
  loadWeight: number | null
  loadFrequency: number | null
  pushPullForce: number | null
  pushPullFreq: number | null
  vibrationSource: string | null
  vibrationHours: number | null
  rulaScore: number | null
  rulaLevel: string | null
  rebaScore: number | null
  rebaLevel: string | null
  pushPullArm: string | null
  pushPullHand: string | null
  evaluationResult: string | null
  bodyPartScores: {
    bodyPart: string
    postureScore: number
    additionalScore: number
    totalScore: number
  }[]
  measurements: {
    type: string
    name: string
    weight: number | null
    force: number | null
    frequency: number | null
    exposureHours: number | null
  }[]
}

export interface MSReportImprovement {
  id: string
  elementWorkId: string | null
  elementWorkName: string | null
  documentNo: string | null
  problem: string
  improvement: string
  source: string | null
  status: string | null
  updateDate: Date | null
  responsiblePerson: string | null
  remarks: string | null
}

export async function fetchMSReportData(
  year: number,
  workplaceId: string
): Promise<MSReportData> {
  const [workplace, rawAssessments, allOrgUnits] = await Promise.all([
    prisma.workplace.findUnique({
      where: { id: workplaceId },
      select: { id: true, name: true, address: true },
    }),
    prisma.musculoskeletalAssessment.findMany({
      where: { workplaceId, year },
      orderBy: [{ organizationUnit: { name: 'asc' } }, { assessmentType: 'asc' }],
      include: {
        organizationUnit: { select: { id: true, name: true } },
        elementWorks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            bodyPartScores: {
              select: {
                bodyPart: true,
                postureScore: true,
                additionalScore: true,
                totalScore: true,
              },
            },
            measurements: {
              orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
              select: {
                type: true,
                name: true,
                weight: true,
                force: true,
                frequency: true,
                exposureHours: true,
              },
            },
          },
        },
        improvements: {
          orderBy: { createdAt: 'asc' },
          include: {
            elementWork: { select: { name: true } },
          },
        },
      },
    }),
    // 조직도 전체 단위 로드 (계층 경로 구성용)
    prisma.organizationUnit.findMany({
      where: {
        organization: { workplaceId },
      },
      select: { id: true, name: true, level: true, parentId: true },
    }),
  ])

  if (!workplace) throw new Error('사업장을 찾을 수 없습니다.')

  // 조직 단위 ID → 단위 맵
  const unitMap = new Map(allOrgUnits.map((u) => [u.id, u]))

  // 루트부터 현재 단위까지의 경로 구성
  function buildUnitPath(unitId: string): OrgUnitPath[] {
    const path: OrgUnitPath[] = []
    let current = unitMap.get(unitId)
    while (current) {
      path.unshift({ level: current.level, name: current.name })
      current = current.parentId ? unitMap.get(current.parentId) : undefined
    }
    return path
  }

  const assessments: MSReportAssessment[] = rawAssessments.map((a) => ({
    id: a.id,
    organizationUnit: a.organizationUnit,
    unitPath: buildUnitPath(a.organizationUnitId),
    assessmentType: a.assessmentType,
    status: a.status,
    workerName: a.workerName,
    investigatorName: a.investigatorName,
    dailyWorkHours: a.dailyWorkHours,
    workFrequency: a.workFrequency,
    employmentType: a.employmentType,
    shiftType: a.shiftType,
    jobAutonomy: a.jobAutonomy,
    managementLevel: a.managementLevel,
    overallComment: a.overallComment,
    skipSheet2: a.skipSheet2,
    skipSheet3: a.skipSheet3,
    affectedHandWrist: a.affectedHandWrist,
    affectedElbow: a.affectedElbow,
    affectedShoulder: a.affectedShoulder,
    affectedNeck: a.affectedNeck,
    affectedBack: a.affectedBack,
    affectedKnee: a.affectedKnee,
    hasNoise: a.hasNoise,
    hasThermal: a.hasThermal,
    hasBurn: a.hasBurn,
    hasDust: a.hasDust,
    hasAccident: a.hasAccident,
    hasStress: a.hasStress,
    hasOtherRisk: a.hasOtherRisk,
    changeWorkHours: a.changeWorkHours,
    changeWorkSpeed: a.changeWorkSpeed,
    changeManpower: a.changeManpower,
    changeWorkload: a.changeWorkload,
    changeEquipment: a.changeEquipment,
    elementWorks: a.elementWorks.map((ew) => ({
      id: ew.id,
      sortOrder: ew.sortOrder,
      name: ew.name,
      description: ew.description,
      toolWeight: ew.toolWeight,
      loadWeight: ew.loadWeight,
      loadFrequency: ew.loadFrequency,
      pushPullForce: ew.pushPullForce,
      pushPullFreq: ew.pushPullFreq,
      vibrationSource: ew.vibrationSource,
      vibrationHours: ew.vibrationHours,
      rulaScore: ew.rulaScore,
      rulaLevel: ew.rulaLevel,
      rebaScore: ew.rebaScore,
      rebaLevel: ew.rebaLevel,
      pushPullArm: ew.pushPullArm,
      pushPullHand: ew.pushPullHand,
      evaluationResult: ew.evaluationResult,
      bodyPartScores: ew.bodyPartScores.map((bp) => ({
        bodyPart: bp.bodyPart,
        postureScore: bp.postureScore,
        additionalScore: bp.additionalScore,
        totalScore: bp.totalScore,
      })),
      measurements: ew.measurements.map((m) => ({
        type: m.type,
        name: m.name,
        weight: m.weight,
        force: m.force,
        frequency: m.frequency,
        exposureHours: m.exposureHours,
      })),
    })),
    improvements: a.improvements.map((imp) => ({
      id: imp.id,
      elementWorkId: imp.elementWorkId,
      elementWorkName: imp.elementWork?.name || null,
      documentNo: imp.documentNo,
      problem: imp.problem,
      improvement: imp.improvement,
      source: imp.source,
      status: imp.status,
      updateDate: imp.updateDate,
      responsiblePerson: imp.responsiblePerson,
      remarks: imp.remarks,
    })),
  }))

  // 조직도에서 사용된 레벨 범위 계산
  const allLevels = allOrgUnits.map((u) => u.level)
  const orgLevelRange = allLevels.length > 0
    ? { min: Math.min(...allLevels), max: Math.max(...allLevels) }
    : { min: 1, max: 1 }

  return { workplace, year, assessments, orgLevelRange }
}
