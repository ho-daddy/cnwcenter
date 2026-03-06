import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'
import {
  calculateRULA,
  calculateREBA,
  evaluatePushPull,
  type RULAInputs,
  type REBAInputs,
} from '@/lib/musculoskeletal/score-calculator'

// 3번시트 - RULA/REBA 데이터 조회 (Sheet2 데이터 포함)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string; workId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const elementWork = await prisma.elementWork.findUnique({
      where: { id: params.workId },
      select: {
        id: true,
        rulaScore: true,
        rulaLevel: true,
        rebaScore: true,
        rebaLevel: true,
        pushPullArm: true,
        pushPullHand: true,
        pushPullFinger: true,
        hasArmSupport: true,
        hasUnstableLeg: true,
        hasRapidPosture: true,
        hasRapidForce: true,
        rulaInputs: true,
        rebaInputs: true,
        pushPullEvaluations: true,
        // Sheet 2 데이터: 각도 정보
        bodyPartScores: {
          select: {
            bodyPart: true,
            angles: true,
            additionalFactors: true,
          },
        },
        // Sheet 2 데이터: PUSH_PULL 측정값
        measurements: {
          where: { type: 'PUSH_PULL' },
          select: {
            id: true,
            name: true,
            force: true,
            frequency: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        assessment: {
          select: { workplaceId: true },
        },
      },
    })

    if (!elementWork) {
      return NextResponse.json(
        { error: '요소작업을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (elementWork.assessment.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { assessment, ...sheet3Data } = elementWork
    return NextResponse.json({ sheet3Data })
  } catch (error) {
    console.error('[Sheet3] 조회 오류:', error)
    return NextResponse.json(
      { error: 'RULA/REBA 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 3번시트 - RULA/REBA 계산 및 저장
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string; workId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      type, // 'rula' | 'reba' | 'pushpull'
      rulaInputs,
      rebaInputs,
      pushPullEvaluations,
      hasArmSupport,
      hasUnstableLeg,
      hasRapidPosture,
      hasRapidForce,
    } = body

    const existing = await prisma.elementWork.findUnique({
      where: { id: params.workId },
      include: {
        assessment: { select: { workplaceId: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '요소작업을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (existing.assessment.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}

    // 추가 요인은 항상 저장
    if (hasArmSupport !== undefined) updateData.hasArmSupport = hasArmSupport
    if (hasUnstableLeg !== undefined) updateData.hasUnstableLeg = hasUnstableLeg
    if (hasRapidPosture !== undefined) updateData.hasRapidPosture = hasRapidPosture
    if (hasRapidForce !== undefined) updateData.hasRapidForce = hasRapidForce

    // RULA 계산 및 저장
    if (type === 'rula' && rulaInputs) {
      const rulaResult = calculateRULA(rulaInputs as RULAInputs)
      updateData.rulaScore = rulaResult.score
      updateData.rulaLevel = rulaResult.level
      updateData.rulaInputs = rulaInputs // 상세 입력값 JSON 저장
    }

    // REBA 계산 및 저장
    if (type === 'reba' && rebaInputs) {
      const rebaResult = calculateREBA(rebaInputs as REBAInputs)
      updateData.rebaScore = rebaResult.score
      updateData.rebaLevel = rebaResult.level
      updateData.rebaInputs = rebaInputs // 상세 입력값 JSON 저장
    }

    // 밀고당기기 평가 저장
    if (type === 'pushpull' && pushPullEvaluations) {
      const evaluations = pushPullEvaluations as Array<{
        measurementId: string
        bodyPart: 'arm' | 'hand' | 'finger'
        force: number
        result: string
      }>

      // 전체 평가결과 중 최악의 결과를 대표값으로 저장
      let worstArm: string | null = null
      let worstHand: string | null = null
      let worstFinger: string | null = null

      const riskOrder: Record<string, number> = { '없음': 0, '안전': 1, '보통': 2, '위험': 3, '고위험': 4 }

      for (const ev of evaluations) {
        const result = evaluatePushPull(ev.force, ev.bodyPart)
        if (ev.bodyPart === 'arm') {
          if (!worstArm || (riskOrder[result] ?? 0) > (riskOrder[worstArm] ?? 0)) worstArm = result
        } else if (ev.bodyPart === 'hand') {
          if (!worstHand || (riskOrder[result] ?? 0) > (riskOrder[worstHand] ?? 0)) worstHand = result
        } else if (ev.bodyPart === 'finger') {
          if (!worstFinger || (riskOrder[result] ?? 0) > (riskOrder[worstFinger] ?? 0)) worstFinger = result
        }
      }

      updateData.pushPullArm = worstArm
      updateData.pushPullHand = worstHand
      updateData.pushPullFinger = worstFinger
      updateData.pushPullEvaluations = pushPullEvaluations
    }

    const elementWork = await prisma.elementWork.update({
      where: { id: params.workId },
      data: updateData,
      select: {
        id: true,
        rulaScore: true,
        rulaLevel: true,
        rebaScore: true,
        rebaLevel: true,
        pushPullArm: true,
        pushPullHand: true,
        pushPullFinger: true,
        hasArmSupport: true,
        hasUnstableLeg: true,
        hasRapidPosture: true,
        hasRapidForce: true,
        rulaInputs: true,
        rebaInputs: true,
        pushPullEvaluations: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'RULA/REBA 데이터가 저장되었습니다.',
      elementWork,
    })
  } catch (error) {
    console.error('[Sheet3] 저장 오류:', error)
    return NextResponse.json(
      { error: 'RULA/REBA 데이터 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
