import { prisma } from '@/lib/prisma'

/**
 * 위험성평가 카드 전체를 아카이브
 */
export async function archiveRiskAssessmentCard(
  cardId: string,
  deletedById: string,
  reason: string = '직접 삭제'
) {
  const card = await prisma.riskAssessmentCard.findUnique({
    where: { id: cardId },
    include: {
      organizationUnit: {
        select: { name: true, organizationId: true },
      },
      photos: true,
      hazards: {
        include: {
          photos: true,
          improvements: { include: { photos: true, files: true } },
        },
      },
    },
  })

  if (!card) return null

  const unitPath = await buildUnitPathFromUnit(card.organizationUnitId, card.organizationUnit.organizationId)

  return prisma.archivedAssessment.create({
    data: {
      workplaceId: card.workplaceId,
      dataType: 'RISK_ASSESSMENT',
      unitName: card.organizationUnit.name,
      unitPath,
      assessmentData: JSON.parse(JSON.stringify(card)),
      year: card.year,
      assessmentType: card.evaluationType,
      originalAssessmentId: card.id,
      archivedReason: reason,
      deletedById,
    },
  })
}

/**
 * 위험요인 1개를 아카이브
 */
export async function archiveRiskHazard(
  hazardId: string,
  deletedById: string,
  reason: string = '직접 삭제'
) {
  const hazard = await prisma.riskHazard.findUnique({
    where: { id: hazardId },
    include: {
      card: {
        include: {
          organizationUnit: {
            select: { name: true, organizationId: true },
          },
        },
      },
      photos: true,
      improvements: { include: { photos: true, files: true } },
    },
  })

  if (!hazard) return null

  const unitPath = await buildUnitPathFromUnit(
    hazard.card.organizationUnitId,
    hazard.card.organizationUnit.organizationId
  )

  return prisma.archivedAssessment.create({
    data: {
      workplaceId: hazard.workplaceId,
      dataType: 'RISK_HAZARD',
      unitName: hazard.card.organizationUnit.name,
      unitPath,
      assessmentData: JSON.parse(JSON.stringify({
        hazard,
        parentCardId: hazard.cardId,
      })),
      year: hazard.year,
      assessmentType: hazard.card.evaluationType,
      originalAssessmentId: hazard.id,
      archivedReason: reason,
      deletedById,
    },
  })
}

/**
 * 개선이력 1개를 아카이브
 */
export async function archiveRiskImprovement(
  improvementId: string,
  deletedById: string,
  reason: string = '직접 삭제'
) {
  const record = await prisma.riskImprovementRecord.findUnique({
    where: { id: improvementId },
    include: {
      hazard: {
        include: {
          card: {
            include: {
              organizationUnit: {
                select: { name: true, organizationId: true },
              },
            },
          },
        },
      },
      photos: true,
      files: true,
    },
  })

  if (!record) return null

  const unitPath = await buildUnitPathFromUnit(
    record.hazard.card.organizationUnitId,
    record.hazard.card.organizationUnit.organizationId
  )

  return prisma.archivedAssessment.create({
    data: {
      workplaceId: record.hazard.workplaceId,
      dataType: 'RISK_IMPROVEMENT',
      unitName: record.hazard.card.organizationUnit.name,
      unitPath,
      assessmentData: JSON.parse(JSON.stringify({
        improvement: record,
        parentHazardId: record.hazardId,
        parentCardId: record.hazard.cardId,
      })),
      year: record.hazard.year,
      assessmentType: record.hazard.card.evaluationType,
      originalAssessmentId: record.id,
      archivedReason: reason,
      deletedById,
    },
  })
}

/**
 * 근골조사 전체를 아카이브
 */
export async function archiveMusculoskeletalAssessment(
  assessmentId: string,
  deletedById: string,
  reason: string = '직접 삭제'
) {
  const assessment = await prisma.musculoskeletalAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      organizationUnit: {
        select: { name: true, organizationId: true },
      },
      elementWorks: {
        include: { bodyPartScores: true, measurements: true },
      },
      improvements: true,
      attachments: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  if (!assessment) return null

  const unitPath = await buildUnitPathFromUnit(
    assessment.organizationUnitId,
    assessment.organizationUnit.organizationId
  )

  return prisma.archivedAssessment.create({
    data: {
      workplaceId: assessment.workplaceId,
      dataType: 'MUSCULOSKELETAL',
      unitName: assessment.organizationUnit.name,
      unitPath,
      assessmentData: JSON.parse(JSON.stringify(assessment)),
      year: assessment.year,
      assessmentType: assessment.assessmentType,
      originalAssessmentId: assessment.id,
      archivedReason: reason,
      deletedById,
    },
  })
}

/**
 * 요소작업 1개를 아카이브
 */
export async function archiveElementWork(
  workId: string,
  deletedById: string,
  reason: string = '직접 삭제'
) {
  const work = await prisma.elementWork.findUnique({
    where: { id: workId },
    include: {
      assessment: {
        include: {
          organizationUnit: {
            select: { name: true, organizationId: true },
          },
        },
      },
      bodyPartScores: true,
      measurements: true,
    },
  })

  if (!work) return null

  const unitPath = await buildUnitPathFromUnit(
    work.assessment.organizationUnitId,
    work.assessment.organizationUnit.organizationId
  )

  return prisma.archivedAssessment.create({
    data: {
      workplaceId: work.assessment.workplaceId,
      dataType: 'ELEMENT_WORK',
      unitName: work.assessment.organizationUnit.name,
      unitPath,
      assessmentData: JSON.parse(JSON.stringify({
        elementWork: work,
        parentAssessmentId: work.assessmentId,
      })),
      year: work.assessment.year,
      assessmentType: work.assessment.assessmentType,
      originalAssessmentId: work.id,
      archivedReason: reason,
      deletedById,
    },
  })
}

/**
 * JSON 데이터에서 모든 사진/파일 경로를 재귀 추출
 */
export function extractAllPhotoPaths(data: unknown): string[] {
  const paths: string[] = []

  function recurse(obj: unknown) {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      for (const item of obj) recurse(item)
      return
    }
    const record = obj as Record<string, unknown>
    if (typeof record.photoPath === 'string') paths.push(record.photoPath)
    if (typeof record.thumbnailPath === 'string') paths.push(record.thumbnailPath)
    if (typeof record.filePath === 'string') paths.push(record.filePath)
    for (const value of Object.values(record)) recurse(value)
  }

  recurse(data)
  return paths
}

/**
 * 조직 단위의 상위 경로를 구성
 */
async function buildUnitPathFromUnit(unitId: string, organizationId: string): Promise<string> {
  const allUnits = await prisma.organizationUnit.findMany({
    where: { organizationId },
    select: { id: true, name: true, parentId: true },
  })
  const unitMap = new Map(allUnits.map(u => [u.id, u]))
  const parts: string[] = []
  let currentId: string | null = unitId
  while (currentId) {
    const unit = unitMap.get(currentId)
    if (!unit) break
    parts.unshift(unit.name)
    currentId = unit.parentId
  }
  return parts.join(' > ')
}
