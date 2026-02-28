import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 개선사항 목록 조회
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
      select: { workplaceId: true },
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

    const improvements = await prisma.mSurveyImprovement.findMany({
      where: { assessmentId: params.assessmentId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ improvements })
  } catch (error) {
    console.error('[Improvements] 조회 오류:', error)
    return NextResponse.json(
      { error: '개선사항 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 개선사항 추가
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
    const { elementWorkId, documentNo, problem, improvement, source, status, updateDate, responsiblePerson, remarks } = body

    if (!problem || !improvement) {
      return NextResponse.json(
        { error: '주요 문제점과 개선 방향은 필수입니다.' },
        { status: 400 }
      )
    }

    const assessment = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: params.assessmentId },
      select: { workplaceId: true },
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

    const newImprovement = await prisma.mSurveyImprovement.create({
      data: {
        assessmentId: params.assessmentId,
        elementWorkId: elementWorkId || null,
        documentNo,
        problem,
        improvement,
        source,
        status: status || null,
        updateDate: updateDate ? new Date(updateDate) : null,
        responsiblePerson: responsiblePerson || null,
        remarks: remarks || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: '개선사항이 추가되었습니다.',
      improvement: newImprovement,
    })
  } catch (error) {
    console.error('[Improvements] 추가 오류:', error)
    return NextResponse.json(
      { error: '개선사항 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
