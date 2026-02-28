import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 근골조사 상세 조회
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
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        elementWorks: {
          include: {
            bodyPartScores: true,
            measurements: {
              orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        improvements: {
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('[Musculoskeletal] 상세 조회 오류:', error)
    return NextResponse.json(
      { error: '근골조사 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 근골조사 기본정보 수정
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
    const { status, assessmentType, skipSheet2, skipSheet3 } = body

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

    const updateData: any = {}
    if (status) updateData.status = status
    if (assessmentType) updateData.assessmentType = assessmentType
    if (typeof skipSheet2 === 'boolean') updateData.skipSheet2 = skipSheet2
    if (typeof skipSheet3 === 'boolean') updateData.skipSheet3 = skipSheet3

    const assessment = await prisma.musculoskeletalAssessment.update({
      where: { id: params.assessmentId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: '수정되었습니다.',
      assessment,
    })
  } catch (error) {
    console.error('[Musculoskeletal] 수정 오류:', error)
    return NextResponse.json(
      { error: '근골조사 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 근골조사 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const existing = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: params.assessmentId },
      select: {
        workplaceId: true,
        organizationUnit: { select: { name: true } },
      },
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

    await prisma.musculoskeletalAssessment.delete({
      where: { id: params.assessmentId },
    })

    return NextResponse.json({
      success: true,
      message: `${existing.organizationUnit.name} 근골조사가 삭제되었습니다.`,
    })
  } catch (error) {
    console.error('[Musculoskeletal] 삭제 오류:', error)
    return NextResponse.json(
      { error: '근골조사 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
