import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 개선사항 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string; improvementId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { elementWorkId, documentNo, problem, improvement, source, status, updateDate, responsiblePerson, remarks } = body

    const existing = await prisma.mSurveyImprovement.findUnique({
      where: { id: params.improvementId },
      include: {
        assessment: { select: { workplaceId: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '개선사항을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (existing.assessment.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const updated = await prisma.mSurveyImprovement.update({
      where: { id: params.improvementId },
      data: {
        elementWorkId: elementWorkId !== undefined ? (elementWorkId || null) : undefined,
        documentNo: documentNo ?? undefined,
        problem: problem ?? undefined,
        improvement: improvement ?? undefined,
        source: source ?? undefined,
        status: status !== undefined ? (status || null) : undefined,
        updateDate: updateDate !== undefined ? (updateDate ? new Date(updateDate) : null) : undefined,
        responsiblePerson: responsiblePerson !== undefined ? (responsiblePerson || null) : undefined,
        remarks: remarks !== undefined ? (remarks || null) : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: '개선사항이 수정되었습니다.',
      improvement: updated,
    })
  } catch (error) {
    console.error('[Improvements] 수정 오류:', error)
    return NextResponse.json(
      { error: '개선사항 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 개선사항 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string; improvementId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const existing = await prisma.mSurveyImprovement.findUnique({
      where: { id: params.improvementId },
      include: {
        assessment: { select: { workplaceId: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '개선사항을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (existing.assessment.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    await prisma.mSurveyImprovement.delete({
      where: { id: params.improvementId },
    })

    return NextResponse.json({
      success: true,
      message: '개선사항이 삭제되었습니다.',
    })
  } catch (error) {
    console.error('[Improvements] 삭제 오류:', error)
    return NextResponse.json(
      { error: '개선사항 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
