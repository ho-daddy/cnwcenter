import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 4번시트 - 종합평가 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const assessment = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: params.assessmentId },
      include: {
        organizationUnit: {
          select: { name: true },
        },
        elementWorks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            bodyPartScores: true,
          },
        },
        improvements: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: '조사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (assessment.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 요소작업별 점수 요약 생성
    const scoreSummary = assessment.elementWorks.map((work) => ({
      id: work.id,
      name: work.name,
      sortOrder: work.sortOrder,
      rulaScore: work.rulaScore,
      rulaLevel: work.rulaLevel,
      rebaScore: work.rebaScore,
      rebaLevel: work.rebaLevel,
      pushPullArm: work.pushPullArm,
      pushPullHand: work.pushPullHand,
      bodyPartScores: work.bodyPartScores.map((score) => ({
        bodyPart: score.bodyPart,
        totalScore: score.totalScore,
      })),
    }))

    return NextResponse.json({
      sheet4Data: {
        unitName: assessment.organizationUnit.name,
        managementLevel: assessment.managementLevel,
        overallComment: assessment.overallComment,
        scoreSummary,
        improvements: assessment.improvements,
      },
    })
  } catch (error) {
    console.error('[Sheet4] 조회 오류:', error)
    return NextResponse.json(
      { error: '종합평가 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 4번시트 - 종합평가 저장
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
    const { managementLevel, overallComment } = body

    const existing = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: params.assessmentId },
      select: { workplaceId: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '조사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (existing.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 관리등급 유효성 검사
    const validLevels = ['상', '중상', '중', '하']
    if (managementLevel && !validLevels.includes(managementLevel)) {
      return NextResponse.json(
        { error: '유효하지 않은 관리등급입니다.' },
        { status: 400 }
      )
    }

    const assessment = await prisma.musculoskeletalAssessment.update({
      where: { id: params.assessmentId },
      data: {
        managementLevel: managementLevel ?? undefined,
        overallComment: overallComment ?? undefined,
      },
      select: {
        id: true,
        managementLevel: true,
        overallComment: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: '종합평가가 저장되었습니다.',
      assessment,
    })
  } catch (error) {
    console.error('[Sheet4] 저장 오류:', error)
    return NextResponse.json(
      { error: '종합평가 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
