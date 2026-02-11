import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 요소작업 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const elementWorks = await prisma.elementWork.findMany({
      where: { assessmentId: params.assessmentId },
      include: {
        bodyPartScores: true,
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ elementWorks })
  } catch (error) {
    console.error('[Element Works] 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '요소작업 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 새 요소작업 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: '요소작업명은 필수입니다.' },
        { status: 400 }
      )
    }

    // 해당 조사가 이 사업장에 속하는지 확인
    const assessment = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: params.assessmentId },
      select: { workplaceId: true },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: '근골조사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (assessment.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 다음 순번 계산
    const maxSortOrder = await prisma.elementWork.aggregate({
      where: { assessmentId: params.assessmentId },
      _max: { sortOrder: true },
    })

    const newSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1

    // 요소작업 생성
    const elementWork = await prisma.elementWork.create({
      data: {
        assessmentId: params.assessmentId,
        sortOrder: newSortOrder,
        name: name.trim(),
        description: description?.trim() || null,
      },
    })

    // 6개 부담부위 점수 레코드 초기화
    const bodyParts = [
      'HAND_WRIST',
      'ELBOW_FOREARM',
      'SHOULDER_ARM',
      'NECK',
      'BACK_HIP',
      'KNEE_ANKLE',
    ] as const

    await prisma.bodyPartScore.createMany({
      data: bodyParts.map((part) => ({
        elementWorkId: elementWork.id,
        bodyPart: part,
        angles: {},
        additionalFactors: {},
        postureScore: 0,
        additionalScore: 0,
        totalScore: 0,
      })),
    })

    // 생성된 요소작업과 점수 함께 반환
    const result = await prisma.elementWork.findUnique({
      where: { id: elementWork.id },
      include: { bodyPartScores: true },
    })

    return NextResponse.json({
      success: true,
      message: `요소작업 "${name}"이(가) 추가되었습니다.`,
      elementWork: result,
    })
  } catch (error) {
    console.error('[Element Works] 생성 오류:', error)
    return NextResponse.json(
      { error: '요소작업 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
