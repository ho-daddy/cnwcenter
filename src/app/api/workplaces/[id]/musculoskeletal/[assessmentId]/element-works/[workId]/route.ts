import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 요소작업 상세 조회
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
      include: {
        bodyPartScores: true,
        assessment: {
          select: {
            workplaceId: true,
            organizationUnit: {
              select: { name: true },
            },
          },
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

    return NextResponse.json({ elementWork })
  } catch (error) {
    console.error('[Element Work] 상세 조회 오류:', error)
    return NextResponse.json(
      { error: '요소작업 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 요소작업 수정 (기본정보 + 작업특성)
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

    const elementWork = await prisma.elementWork.update({
      where: { id: params.workId },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,

        // 작업특성 (2번시트 상단)
        toolWeight: body.toolWeight ?? undefined,
        loadWeight: body.loadWeight ?? undefined,
        loadFrequency: body.loadFrequency ?? undefined,
        pushPullForce: body.pushPullForce ?? undefined,
        pushPullFreq: body.pushPullFreq ?? undefined,
        vibrationSource: body.vibrationSource ?? undefined,
        vibrationHours: body.vibrationHours ?? undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: '요소작업이 수정되었습니다.',
      elementWork,
    })
  } catch (error) {
    console.error('[Element Work] 수정 오류:', error)
    return NextResponse.json(
      { error: '요소작업 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 요소작업 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string; workId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
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

    await prisma.elementWork.delete({
      where: { id: params.workId },
    })

    return NextResponse.json({
      success: true,
      message: `요소작업 "${existing.name}"이(가) 삭제되었습니다.`,
    })
  } catch (error) {
    console.error('[Element Work] 삭제 오류:', error)
    return NextResponse.json(
      { error: '요소작업 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
