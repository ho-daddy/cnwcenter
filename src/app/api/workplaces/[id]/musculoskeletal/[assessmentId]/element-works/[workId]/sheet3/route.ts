import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'
import {
  calculateRULA,
  calculateREBA,
  evaluatePushPullArm,
  evaluatePushPullHand,
  type RULAInputs,
  type REBAInputs,
} from '@/lib/musculoskeletal/score-calculator'

// 3번시트 - RULA/REBA 데이터 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string; workId: string } }
) {
  const authCheck = await requireStaffOrAbove()
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
        hasArmSupport: true,
        hasUnstableLeg: true,
        hasRapidPosture: true,
        hasRapidForce: true,
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
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      rulaInputs,
      rebaInputs,
      pushPullForce,
      pushPullFreq,
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

    // RULA 계산
    let rulaScore: number | null = null
    let rulaLevel: string | null = null
    if (rulaInputs) {
      const rulaResult = calculateRULA(rulaInputs as RULAInputs)
      rulaScore = rulaResult.score
      rulaLevel = rulaResult.level
    }

    // REBA 계산
    let rebaScore: number | null = null
    let rebaLevel: string | null = null
    if (rebaInputs) {
      const rebaResult = calculateREBA(rebaInputs as REBAInputs)
      rebaScore = rebaResult.score
      rebaLevel = rebaResult.level
    }

    // Push-Pull 평가
    let pushPullArm: string | null = null
    let pushPullHand: string | null = null
    if (pushPullForce !== undefined) {
      pushPullArm = evaluatePushPullArm(pushPullForce)
      pushPullHand = evaluatePushPullHand(pushPullForce)
    }

    const elementWork = await prisma.elementWork.update({
      where: { id: params.workId },
      data: {
        rulaScore,
        rulaLevel,
        rebaScore,
        rebaLevel,
        pushPullArm,
        pushPullHand,
        hasArmSupport: hasArmSupport ?? undefined,
        hasUnstableLeg: hasUnstableLeg ?? undefined,
        hasRapidPosture: hasRapidPosture ?? undefined,
        hasRapidForce: hasRapidForce ?? undefined,
      },
      select: {
        id: true,
        rulaScore: true,
        rulaLevel: true,
        rebaScore: true,
        rebaLevel: true,
        pushPullArm: true,
        pushPullHand: true,
        hasArmSupport: true,
        hasUnstableLeg: true,
        hasRapidPosture: true,
        hasRapidForce: true,
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
