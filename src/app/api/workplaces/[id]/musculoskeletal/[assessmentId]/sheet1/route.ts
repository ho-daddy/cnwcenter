import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 1번시트 (관리카드) 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()

    const existing = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: params.assessmentId },
      select: { workplaceId: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '근골조사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (existing.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 1번시트 필드 업데이트
    const assessment = await prisma.musculoskeletalAssessment.update({
      where: { id: params.assessmentId },
      data: {
        // 작업자/조사자
        workerName: body.workerName ?? undefined,
        investigatorName: body.investigatorName ?? undefined,

        // 수시조사 사유
        occasionalReason: body.occasionalReason ?? undefined,
        occasionalReasonCustom: body.occasionalReasonCustom ?? undefined,

        // 작업조건
        dailyWorkHours: body.dailyWorkHours ?? undefined,
        dailyProduction: body.dailyProduction ?? undefined,
        workFrequency: body.workFrequency ?? undefined,
        employmentType: body.employmentType ?? undefined,
        workDays: body.workDays ?? undefined,
        workDaysCustom: body.workDaysCustom ?? undefined,
        shiftType: body.shiftType ?? undefined,
        shiftTypeCustom: body.shiftTypeCustom ?? undefined,
        jobAutonomy: body.jobAutonomy ?? undefined,

        // 기타 위험요인
        hasNoise: body.hasNoise ?? undefined,
        hasThermal: body.hasThermal ?? undefined,
        hasBurn: body.hasBurn ?? undefined,
        hasDust: body.hasDust ?? undefined,
        hasAccident: body.hasAccident ?? undefined,
        hasStress: body.hasStress ?? undefined,
        hasOtherRisk: body.hasOtherRisk ?? undefined,
        otherRiskDetail: body.otherRiskDetail ?? undefined,

        // 부담부위
        affectedHandWrist: body.affectedHandWrist ?? undefined,
        affectedElbow: body.affectedElbow ?? undefined,
        affectedShoulder: body.affectedShoulder ?? undefined,
        affectedNeck: body.affectedNeck ?? undefined,
        affectedBack: body.affectedBack ?? undefined,
        affectedKnee: body.affectedKnee ?? undefined,

        // 작업조건 변화
        changeWorkHours: body.changeWorkHours ?? undefined,
        changeWorkSpeed: body.changeWorkSpeed ?? undefined,
        changeManpower: body.changeManpower ?? undefined,
        changeWorkload: body.changeWorkload ?? undefined,
        changeEquipment: body.changeEquipment ?? undefined,

        // 참조
        reference: body.reference ?? undefined,

        // 상태 업데이트 (입력 시작시 IN_PROGRESS로)
        status: body.status ?? 'IN_PROGRESS',
      },
    })

    return NextResponse.json({
      success: true,
      message: '관리카드가 저장되었습니다.',
      assessment,
    })
  } catch (error) {
    console.error('[Musculoskeletal Sheet1] 수정 오류:', error)
    return NextResponse.json(
      { error: '관리카드 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
