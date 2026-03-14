import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'

type Params = { params: { id: string } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any
const jsonNull = Prisma.JsonNull

// POST /api/trash/[id]/restore — 아카이브 복원
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const archived = await prisma.archivedAssessment.findUnique({
    where: { id: params.id },
  })

  if (!archived) {
    return NextResponse.json({ error: '아카이브를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 사업장 접근 권한 확인
  const access = await requireWorkplaceAccess(archived.workplaceId)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: 403 })
  }

  let body: { targetUnitId?: string; targetCardId?: string; targetHazardId?: string; targetAssessmentId?: string } = {}
  try {
    body = await req.json()
  } catch {
    // body가 없을 수 있음
  }

  const data = archived.assessmentData as Record<string, unknown>

  try {
    switch (archived.dataType) {
      case 'RISK_ASSESSMENT':
        return await restoreRiskAssessmentCard(archived, data, body.targetUnitId)

      case 'RISK_HAZARD':
        return await restoreRiskHazard(archived, data, body.targetCardId)

      case 'RISK_IMPROVEMENT':
        return await restoreRiskImprovement(archived, data, body.targetHazardId)

      case 'MUSCULOSKELETAL':
        return await restoreMusculoskeletalAssessment(archived, data, body.targetUnitId)

      case 'ELEMENT_WORK':
        return await restoreElementWork(archived, data, body.targetAssessmentId)

      default:
        return NextResponse.json({ error: '알 수 없는 데이터 유형입니다.' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Trash] 복원 오류:', error)
    const message = error instanceof Error ? error.message : '복원 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// 위험성평가 카드 복원
async function restoreRiskAssessmentCard(
  archived: { id: string; workplaceId: string },
  data: Record<string, unknown>,
  targetUnitId?: string
) {
  const cardData = data as Record<string, unknown>
  const unitId = targetUnitId || (cardData.organizationUnitId as string)

  // 조직 단위 존재 확인
  const unit = await prisma.organizationUnit.findUnique({ where: { id: unitId } })
  if (!unit) {
    return NextResponse.json({
      error: '조직 단위가 존재하지 않습니다. 대상 조직을 선택해주세요.',
      needsUnitSelection: true,
      workplaceId: archived.workplaceId,
    }, { status: 400 })
  }

  // 중복 확인
  const existing = await prisma.riskAssessmentCard.findFirst({
    where: {
      organizationUnitId: unitId,
      year: cardData.year as number,
      evaluationType: cardData.evaluationType as AnyData,
    },
  })
  if (existing) {
    return NextResponse.json({ error: '해당 조직 단위에 동일한 연도/유형의 평가가 이미 존재합니다.' }, { status: 409 })
  }

  const hazards = (cardData.hazards as Record<string, unknown>[]) || []
  const photos = (cardData.photos as Record<string, unknown>[]) || []

  await prisma.$transaction(async (tx) => {
    // 카드 생성
    const newCard = await tx.riskAssessmentCard.create({
      data: {
        workplaceId: archived.workplaceId,
        organizationUnitId: unitId,
        year: cardData.year as number,
        evaluationType: cardData.evaluationType as AnyData,
        evaluationReason: (cardData.evaluationReason as string) || null,
        workerName: cardData.workerName as string,
        evaluatorName: cardData.evaluatorName as string,
        dailyWorkingHours: (cardData.dailyWorkingHours as string) || null,
        dailyProduction: (cardData.dailyProduction as string) || null,
        annualWorkingDays: (cardData.annualWorkingDays as string) || null,
        workCycle: (cardData.workCycle as string) || null,
        workDescription: cardData.workDescription as string,
      },
    })

    // 카드 사진 복원
    for (const photo of photos) {
      await tx.riskCardPhoto.create({
        data: {
          cardId: newCard.id,
          photoPath: photo.photoPath as string,
          thumbnailPath: (photo.thumbnailPath as string) || null,
          width: (photo.width as number) || null,
          height: (photo.height as number) || null,
          photoType: (photo.photoType as string) || 'work_photo',
          description: (photo.description as string) || null,
        },
      })
    }

    // 유해위험요인 복원
    for (const hazard of hazards) {
      const newHazard = await tx.riskHazard.create({
        data: {
          cardId: newCard.id,
          workplaceId: archived.workplaceId,
          hazardCategory: hazard.hazardCategory as AnyData,
          hazardFactor: hazard.hazardFactor as string,
          severityScore: hazard.severityScore as number,
          likelihoodScore: hazard.likelihoodScore as number,
          additionalPoints: (hazard.additionalPoints as number) || 0,
          additionalDetails: hazard.additionalDetails ?? jsonNull,
          riskScore: hazard.riskScore as number,
          improvementPlan: (hazard.improvementPlan as string) || null,
          year: hazard.year as number,
          chemicalProductId: (hazard.chemicalProductId as string) || null,
        },
      })

      // 유해요인 사진 복원
      const hazardPhotos = (hazard.photos as Record<string, unknown>[]) || []
      for (const photo of hazardPhotos) {
        await tx.riskHazardPhoto.create({
          data: {
            hazardId: newHazard.id,
            photoPath: photo.photoPath as string,
            thumbnailPath: (photo.thumbnailPath as string) || null,
            width: (photo.width as number) || null,
            height: (photo.height as number) || null,
          },
        })
      }

      // 개선이력 복원
      const improvements = (hazard.improvements as Record<string, unknown>[]) || []
      for (const imp of improvements) {
        const newImp = await tx.riskImprovementRecord.create({
          data: {
            hazardId: newHazard.id,
            status: imp.status as AnyData,
            updateDate: new Date(imp.updateDate as string),
            improvementContent: imp.improvementContent as string,
            responsiblePerson: imp.responsiblePerson as string,
            severityScore: imp.severityScore as number,
            likelihoodScore: imp.likelihoodScore as number,
            additionalPoints: (imp.additionalPoints as number) || 0,
            riskScore: imp.riskScore as number,
            remarks: (imp.remarks as string) || null,
          },
        })

        // 개선이력 사진 복원
        const impPhotos = (imp.photos as Record<string, unknown>[]) || []
        for (const photo of impPhotos) {
          await tx.riskImprovementPhoto.create({
            data: {
              recordId: newImp.id,
              photoPath: photo.photoPath as string,
              thumbnailPath: (photo.thumbnailPath as string) || null,
              width: (photo.width as number) || null,
              height: (photo.height as number) || null,
            },
          })
        }

        // 개선이력 파일 복원
        const impFiles = (imp.files as Record<string, unknown>[]) || []
        for (const file of impFiles) {
          await tx.riskImprovementFile.create({
            data: {
              recordId: newImp.id,
              fileName: file.fileName as string,
              filePath: file.filePath as string,
              fileSize: (file.fileSize as number) || null,
            },
          })
        }
      }
    }

    // 아카이브 삭제
    await tx.archivedAssessment.delete({ where: { id: archived.id } })
  })

  return NextResponse.json({ success: true, message: '위험성평가가 복원되었습니다.' })
}

// 위험요인 1개 복원
async function restoreRiskHazard(
  archived: { id: string; workplaceId: string },
  data: Record<string, unknown>,
  targetCardId?: string
) {
  const hazardData = (data.hazard || data) as Record<string, unknown>
  const cardId = targetCardId || (data.parentCardId as string) || (hazardData.cardId as string)

  if (!cardId) {
    return NextResponse.json({ error: '상위 평가카드 ID가 필요합니다.' }, { status: 400 })
  }

  // 카드 존재 확인
  const card = await prisma.riskAssessmentCard.findUnique({ where: { id: cardId } })
  if (!card) {
    return NextResponse.json({
      error: '상위 평가카드가 존재하지 않습니다.',
      needsCardSelection: true,
      workplaceId: archived.workplaceId,
    }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    const newHazard = await tx.riskHazard.create({
      data: {
        cardId,
        workplaceId: archived.workplaceId,
        hazardCategory: hazardData.hazardCategory as AnyData,
        hazardFactor: hazardData.hazardFactor as string,
        severityScore: hazardData.severityScore as number,
        likelihoodScore: hazardData.likelihoodScore as number,
        additionalPoints: (hazardData.additionalPoints as number) || 0,
        additionalDetails: hazardData.additionalDetails ?? jsonNull,
        riskScore: hazardData.riskScore as number,
        improvementPlan: (hazardData.improvementPlan as string) || null,
        year: hazardData.year as number,
        chemicalProductId: (hazardData.chemicalProductId as string) || null,
      },
    })

    const photos = (hazardData.photos as Record<string, unknown>[]) || []
    for (const photo of photos) {
      await tx.riskHazardPhoto.create({
        data: {
          hazardId: newHazard.id,
          photoPath: photo.photoPath as string,
          thumbnailPath: (photo.thumbnailPath as string) || null,
          width: (photo.width as number) || null,
          height: (photo.height as number) || null,
        },
      })
    }

    const improvements = (hazardData.improvements as Record<string, unknown>[]) || []
    for (const imp of improvements) {
      const newImp = await tx.riskImprovementRecord.create({
        data: {
          hazardId: newHazard.id,
          status: imp.status as AnyData,
          updateDate: new Date(imp.updateDate as string),
          improvementContent: imp.improvementContent as string,
          responsiblePerson: imp.responsiblePerson as string,
          severityScore: imp.severityScore as number,
          likelihoodScore: imp.likelihoodScore as number,
          additionalPoints: (imp.additionalPoints as number) || 0,
          riskScore: imp.riskScore as number,
          remarks: (imp.remarks as string) || null,
        },
      })

      const impPhotos = (imp.photos as Record<string, unknown>[]) || []
      for (const photo of impPhotos) {
        await tx.riskImprovementPhoto.create({
          data: {
            recordId: newImp.id,
            photoPath: photo.photoPath as string,
            thumbnailPath: (photo.thumbnailPath as string) || null,
            width: (photo.width as number) || null,
            height: (photo.height as number) || null,
          },
        })
      }

      const impFiles = (imp.files as Record<string, unknown>[]) || []
      for (const file of impFiles) {
        await tx.riskImprovementFile.create({
          data: {
            recordId: newImp.id,
            fileName: file.fileName as string,
            filePath: file.filePath as string,
            fileSize: (file.fileSize as number) || null,
          },
        })
      }
    }

    await tx.archivedAssessment.delete({ where: { id: archived.id } })
  })

  return NextResponse.json({ success: true, message: '유해위험요인이 복원되었습니다.' })
}

// 개선이력 1개 복원
async function restoreRiskImprovement(
  archived: { id: string },
  data: Record<string, unknown>,
  targetHazardId?: string
) {
  const impData = (data.improvement || data) as Record<string, unknown>
  const hazardId = targetHazardId || (data.parentHazardId as string) || (impData.hazardId as string)

  if (!hazardId) {
    return NextResponse.json({ error: '상위 유해위험요인 ID가 필요합니다.' }, { status: 400 })
  }

  const hazard = await prisma.riskHazard.findUnique({ where: { id: hazardId } })
  if (!hazard) {
    return NextResponse.json({ error: '상위 유해위험요인이 존재하지 않습니다.' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    const newImp = await tx.riskImprovementRecord.create({
      data: {
        hazardId,
        status: impData.status as AnyData,
        updateDate: new Date(impData.updateDate as string),
        improvementContent: impData.improvementContent as string,
        responsiblePerson: impData.responsiblePerson as string,
        severityScore: impData.severityScore as number,
        likelihoodScore: impData.likelihoodScore as number,
        additionalPoints: (impData.additionalPoints as number) || 0,
        riskScore: impData.riskScore as number,
        remarks: (impData.remarks as string) || null,
      },
    })

    const photos = (impData.photos as Record<string, unknown>[]) || []
    for (const photo of photos) {
      await tx.riskImprovementPhoto.create({
        data: {
          recordId: newImp.id,
          photoPath: photo.photoPath as string,
          thumbnailPath: (photo.thumbnailPath as string) || null,
          width: (photo.width as number) || null,
          height: (photo.height as number) || null,
        },
      })
    }

    const files = (impData.files as Record<string, unknown>[]) || []
    for (const file of files) {
      await tx.riskImprovementFile.create({
        data: {
          recordId: newImp.id,
          fileName: file.fileName as string,
          filePath: file.filePath as string,
          fileSize: (file.fileSize as number) || null,
        },
      })
    }

    await tx.archivedAssessment.delete({ where: { id: archived.id } })
  })

  return NextResponse.json({ success: true, message: '개선이력이 복원되었습니다.' })
}

// 근골조사 복원
async function restoreMusculoskeletalAssessment(
  archived: { id: string; workplaceId: string },
  data: Record<string, unknown>,
  targetUnitId?: string
) {
  const unitId = targetUnitId || (data.organizationUnitId as string)

  const unit = await prisma.organizationUnit.findUnique({ where: { id: unitId } })
  if (!unit) {
    return NextResponse.json({
      error: '조직 단위가 존재하지 않습니다. 대상 조직을 선택해주세요.',
      needsUnitSelection: true,
      workplaceId: archived.workplaceId,
    }, { status: 400 })
  }

  // 중복 확인
  const existing = await prisma.musculoskeletalAssessment.findFirst({
    where: {
      organizationUnitId: unitId,
      year: data.year as number,
      assessmentType: data.assessmentType as string,
    },
  })
  if (existing) {
    return NextResponse.json({ error: '해당 조직 단위에 동일한 연도/유형의 조사가 이미 존재합니다.' }, { status: 409 })
  }

  const elementWorks = (data.elementWorks as Record<string, unknown>[]) || []
  const improvements = (data.improvements as Record<string, unknown>[]) || []
  const attachments = (data.attachments as Record<string, unknown>[]) || []

  await prisma.$transaction(async (tx) => {
    const newAssessment = await tx.musculoskeletalAssessment.create({
      data: {
        workplaceId: archived.workplaceId,
        organizationUnitId: unitId,
        year: data.year as number,
        assessmentType: data.assessmentType as string,
        status: (data.status as AnyData) || 'DRAFT',
        workerName: (data.workerName as string) || null,
        investigatorName: (data.investigatorName as string) || null,
        occasionalReason: (data.occasionalReason as string) || null,
        occasionalReasonCustom: (data.occasionalReasonCustom as string) || null,
        dailyWorkHours: (data.dailyWorkHours as number) || null,
        dailyProduction: (data.dailyProduction as string) || null,
        workFrequency: (data.workFrequency as string) || null,
        employmentType: (data.employmentType as string) || null,
        workDays: (data.workDays as string) || null,
        workDaysCustom: (data.workDaysCustom as string) || null,
        shiftType: (data.shiftType as string) || null,
        shiftTypeCustom: (data.shiftTypeCustom as string) || null,
        jobAutonomy: (data.jobAutonomy as number) || null,
        hasNoise: (data.hasNoise as boolean) || false,
        hasThermal: (data.hasThermal as boolean) || false,
        hasBurn: (data.hasBurn as boolean) || false,
        hasDust: (data.hasDust as boolean) || false,
        hasAccident: (data.hasAccident as boolean) || false,
        hasStress: (data.hasStress as boolean) || false,
        hasOtherRisk: (data.hasOtherRisk as boolean) || false,
        otherRiskDetail: (data.otherRiskDetail as string) || null,
        affectedHandWrist: (data.affectedHandWrist as boolean) || false,
        affectedElbow: (data.affectedElbow as boolean) || false,
        affectedShoulder: (data.affectedShoulder as boolean) || false,
        affectedNeck: (data.affectedNeck as boolean) || false,
        affectedBack: (data.affectedBack as boolean) || false,
        affectedKnee: (data.affectedKnee as boolean) || false,
        changeWorkHours: (data.changeWorkHours as string) || null,
        changeWorkSpeed: (data.changeWorkSpeed as string) || null,
        changeManpower: (data.changeManpower as string) || null,
        changeWorkload: (data.changeWorkload as string) || null,
        changeEquipment: (data.changeEquipment as string) || null,
        reference: (data.reference as string) || null,
        managementLevel: (data.managementLevel as string) || null,
        overallComment: (data.overallComment as string) || null,
        skipSheet2: (data.skipSheet2 as boolean) || false,
        skipSheet3: (data.skipSheet3 as boolean) || false,
        createdById: (data.createdById as string) || null,
      },
    })

    // 요소작업 복원
    for (const ew of elementWorks) {
      const newEw = await tx.elementWork.create({
        data: {
          assessmentId: newAssessment.id,
          name: ew.name as string,
          description: (ew.description as string) || null,
          sortOrder: (ew.sortOrder as number) || 0,
          toolWeight: (ew.toolWeight as number) ?? null,
          loadWeight: (ew.loadWeight as number) ?? null,
          loadFrequency: (ew.loadFrequency as number) ?? null,
          pushPullForce: (ew.pushPullForce as number) ?? null,
          pushPullFreq: (ew.pushPullFreq as number) ?? null,
          vibrationSource: (ew.vibrationSource as string) || null,
          vibrationHours: (ew.vibrationHours as number) ?? null,
          rulaScore: (ew.rulaScore as number) ?? null,
          rulaLevel: (ew.rulaLevel as string) || null,
          rebaScore: (ew.rebaScore as number) ?? null,
          rebaLevel: (ew.rebaLevel as string) || null,
          pushPullArm: (ew.pushPullArm as string) || null,
          pushPullHand: (ew.pushPullHand as string) || null,
          pushPullFinger: (ew.pushPullFinger as string) || null,
          rulaInputs: ew.rulaInputs ?? undefined,
          rebaInputs: ew.rebaInputs ?? undefined,
          pushPullEvaluations: ew.pushPullEvaluations ?? undefined,
        },
      })

      // 부위별 점수 복원
      const bodyPartScores = (ew.bodyPartScores as Record<string, unknown>[]) || []
      for (const bps of bodyPartScores) {
        await tx.bodyPartScore.create({
          data: {
            elementWorkId: newEw.id,
            bodyPart: bps.bodyPart as AnyData,
            angles: bps.angles ?? jsonNull,
            additionalFactors: bps.additionalFactors ?? jsonNull,
            postureScore: (bps.postureScore as number) || 0,
            additionalScore: (bps.additionalScore as number) || 0,
            totalScore: (bps.totalScore as number) || 0,
          },
        })
      }

      // 측정도구 복원
      const measurements = (ew.measurements as Record<string, unknown>[]) || []
      for (const m of measurements) {
        await tx.workMeasurement.create({
          data: {
            elementWorkId: newEw.id,
            type: m.type as AnyData,
            sortOrder: (m.sortOrder as number) || 0,
            name: m.name as string,
            weight: (m.weight as number) || null,
            force: (m.force as number) || null,
            frequency: (m.frequency as number) || null,
            exposureHours: (m.exposureHours as number) || null,
            photoPath: (m.photoPath as string) || null,
          },
        })
      }
    }

    // 개선항목 복원
    for (const imp of improvements) {
      await tx.mSurveyImprovement.create({
        data: {
          assessmentId: newAssessment.id,
          elementWorkId: (imp.elementWorkId as string) || null,
          documentNo: (imp.documentNo as string) || null,
          problem: imp.problem as string,
          improvement: imp.improvement as string,
          source: (imp.source as string) || null,
          status: (imp.status as AnyData) || null,
          updateDate: imp.updateDate ? new Date(imp.updateDate as string) : null,
          responsiblePerson: (imp.responsiblePerson as string) || null,
          remarks: (imp.remarks as string) || null,
        },
      })
    }

    // 첨부파일 복원
    for (const att of attachments) {
      await tx.mSurveyAttachment.create({
        data: {
          assessmentId: newAssessment.id,
          elementWorkId: (att.elementWorkId as string) || null,
          fileName: att.fileName as string,
          originalName: att.originalName as string,
          fileType: att.fileType as string,
          fileSize: (att.fileSize as number) || 0,
          filePath: att.filePath as string,
        },
      })
    }

    await tx.archivedAssessment.delete({ where: { id: archived.id } })
  })

  return NextResponse.json({ success: true, message: '근골조사가 복원되었습니다.' })
}

// 요소작업 1개 복원
async function restoreElementWork(
  archived: { id: string },
  data: Record<string, unknown>,
  targetAssessmentId?: string
) {
  const ewData = (data.elementWork || data) as Record<string, unknown>
  const assessmentId = targetAssessmentId || (data.parentAssessmentId as string) || (ewData.assessmentId as string)

  if (!assessmentId) {
    return NextResponse.json({ error: '상위 조사 ID가 필요합니다.' }, { status: 400 })
  }

  const assessment = await prisma.musculoskeletalAssessment.findUnique({ where: { id: assessmentId } })
  if (!assessment) {
    return NextResponse.json({ error: '상위 근골조사가 존재하지 않습니다.' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    const newEw = await tx.elementWork.create({
      data: {
        assessmentId,
        name: ewData.name as string,
        description: (ewData.description as string) || null,
        sortOrder: (ewData.sortOrder as number) || 0,
        toolWeight: (ewData.toolWeight as number) ?? null,
        loadWeight: (ewData.loadWeight as number) ?? null,
        loadFrequency: (ewData.loadFrequency as number) ?? null,
        pushPullForce: (ewData.pushPullForce as number) ?? null,
        pushPullFreq: (ewData.pushPullFreq as number) ?? null,
        vibrationSource: (ewData.vibrationSource as string) || null,
        vibrationHours: (ewData.vibrationHours as number) ?? null,
        rulaScore: (ewData.rulaScore as number) ?? null,
        rulaLevel: (ewData.rulaLevel as string) || null,
        rebaScore: (ewData.rebaScore as number) ?? null,
        rebaLevel: (ewData.rebaLevel as string) || null,
        pushPullArm: (ewData.pushPullArm as string) || null,
        pushPullHand: (ewData.pushPullHand as string) || null,
        pushPullFinger: (ewData.pushPullFinger as string) || null,
        rulaInputs: ewData.rulaInputs ?? undefined,
        rebaInputs: ewData.rebaInputs ?? undefined,
        pushPullEvaluations: ewData.pushPullEvaluations ?? undefined,
      },
    })

    const bodyPartScores = (ewData.bodyPartScores as Record<string, unknown>[]) || []
    for (const bps of bodyPartScores) {
      await tx.bodyPartScore.create({
        data: {
          elementWorkId: newEw.id,
          bodyPart: bps.bodyPart as AnyData,
          angles: bps.angles ?? jsonNull,
          additionalFactors: bps.additionalFactors ?? jsonNull,
          postureScore: (bps.postureScore as number) || 0,
          additionalScore: (bps.additionalScore as number) || 0,
          totalScore: (bps.totalScore as number) || 0,
        },
      })
    }

    const measurements = (ewData.measurements as Record<string, unknown>[]) || []
    for (const m of measurements) {
      await tx.workMeasurement.create({
        data: {
          elementWorkId: newEw.id,
          type: m.type as AnyData,
          sortOrder: (m.sortOrder as number) || 0,
          name: m.name as string,
          weight: (m.weight as number) || null,
          force: (m.force as number) || null,
          frequency: (m.frequency as number) || null,
          exposureHours: (m.exposureHours as number) || null,
          photoPath: (m.photoPath as string) || null,
        },
      })
    }

    await tx.archivedAssessment.delete({ where: { id: archived.id } })
  })

  return NextResponse.json({ success: true, message: '요소작업이 복원되었습니다.' })
}
