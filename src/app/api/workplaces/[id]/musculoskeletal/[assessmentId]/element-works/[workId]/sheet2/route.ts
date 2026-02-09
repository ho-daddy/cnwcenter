import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'
import { BodyPart } from '@prisma/client'
import {
  calculateHandWristPostureScore,
  calculateElbowPostureScore,
  calculateShoulderPostureScore,
  calculateNeckPostureScore,
  calculateBackPostureScore,
  calculateKneeAnklePostureScore,
  calculateHandWristAdditionalScore,
  calculateElbowAdditionalScore,
  calculateShoulderAdditionalScore,
  calculateNeckAdditionalScore,
  calculateBackAdditionalScore,
  calculateKneeAnkleAdditionalScore,
} from '@/lib/musculoskeletal/score-calculator'

// 2번시트 - 부위별 점수 조회
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
      include: {
        bodyPartScores: true,
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

    return NextResponse.json({ bodyPartScores: elementWork.bodyPartScores })
  } catch (error) {
    console.error('[Sheet2] 조회 오류:', error)
    return NextResponse.json(
      { error: '부위별 점수 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 2번시트 - 부위별 점수 저장/수정
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
    const { bodyPart, angles, additionalFactors } = body

    // 유효성 검사
    if (!bodyPart || !Object.values(BodyPart).includes(bodyPart)) {
      return NextResponse.json(
        { error: '유효하지 않은 부담부위입니다.' },
        { status: 400 }
      )
    }

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

    // 점수 계산
    let postureScore = 0
    let additionalScore = 0

    switch (bodyPart) {
      case BodyPart.HAND_WRIST:
        postureScore = calculateHandWristPostureScore(angles)
        additionalScore = calculateHandWristAdditionalScore(additionalFactors)
        break
      case BodyPart.ELBOW_FOREARM:
        postureScore = calculateElbowPostureScore(angles)
        additionalScore = calculateElbowAdditionalScore(additionalFactors)
        break
      case BodyPart.SHOULDER_ARM:
        postureScore = calculateShoulderPostureScore(angles)
        additionalScore = calculateShoulderAdditionalScore(additionalFactors)
        break
      case BodyPart.NECK:
        postureScore = calculateNeckPostureScore(angles)
        additionalScore = calculateNeckAdditionalScore(additionalFactors)
        break
      case BodyPart.BACK_HIP:
        postureScore = calculateBackPostureScore(angles)
        additionalScore = calculateBackAdditionalScore(additionalFactors)
        break
      case BodyPart.KNEE_ANKLE:
        postureScore = calculateKneeAnklePostureScore(angles)
        additionalScore = calculateKneeAnkleAdditionalScore(additionalFactors)
        break
    }

    const totalScore = Math.min(postureScore + additionalScore, 7)

    // upsert - 있으면 업데이트, 없으면 생성
    const bodyPartScore = await prisma.bodyPartScore.upsert({
      where: {
        elementWorkId_bodyPart: {
          elementWorkId: params.workId,
          bodyPart,
        },
      },
      update: {
        angles,
        additionalFactors,
        postureScore,
        additionalScore,
        totalScore,
      },
      create: {
        elementWorkId: params.workId,
        bodyPart,
        angles,
        additionalFactors,
        postureScore,
        additionalScore,
        totalScore,
      },
    })

    return NextResponse.json({
      success: true,
      message: '부위별 점수가 저장되었습니다.',
      bodyPartScore,
    })
  } catch (error) {
    console.error('[Sheet2] 저장 오류:', error)
    return NextResponse.json(
      { error: '부위별 점수 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
