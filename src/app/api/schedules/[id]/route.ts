import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireStaffOrAbove } from '@/lib/auth-utils'

// 일정 상세 조회 (WORKPLACE_USER는 공개일정만)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireAuth()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 })
    }

    // WORKPLACE_USER는 공개일정만 조회 가능
    if (authCheck.user!.role === 'WORKPLACE_USER' && schedule.scheduleType !== 'PUBLIC') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error('[Schedule] 조회 오류:', error)
    return NextResponse.json(
      { error: '일정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 일정 수정 (STAFF 이상만)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description, startDate, endDate, isAllDay, location, isOnline, scheduleType, relatedId } = body

    const schedule = await prisma.schedule.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isAllDay !== undefined && { isAllDay }),
        ...(location !== undefined && { location }),
        ...(isOnline !== undefined && { isOnline }),
        ...(scheduleType && { scheduleType }),
        ...(relatedId !== undefined && { relatedId }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: '일정이 수정되었습니다.',
      schedule,
    })
  } catch (error) {
    console.error('[Schedule] 수정 오류:', error)
    return NextResponse.json(
      { error: '일정 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 일정 삭제 (STAFF 이상만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    await prisma.schedule.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: '일정이 삭제되었습니다.',
    })
  } catch (error) {
    console.error('[Schedule] 삭제 오류:', error)
    return NextResponse.json(
      { error: '일정 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
