import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireStaffOrAbove } from '@/lib/auth-utils'
import { ScheduleType } from '@prisma/client'
import { validateEnum } from '@/lib/api-utils'

// 일정 목록 조회 (WORKPLACE_USER는 공개일정만)
export async function GET(request: NextRequest) {
  const authCheck = await requireAuth()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')

    const where: any = {}

    // WORKPLACE_USER는 공개일정만 조회 가능
    if (authCheck.user!.role === 'WORKPLACE_USER') {
      where.scheduleType = 'PUBLIC'
    }

    // 날짜 범위 필터
    if (startDate || endDate) {
      where.startDate = {}
      if (startDate) {
        where.startDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.startDate.lte = new Date(endDate)
      }
    }

    // 일정 유형 필터 (STAFF 이상만 비공개 필터 가능)
    if (type && ['PUBLIC', 'PRIVATE'].includes(type)) {
      if (authCheck.user!.role !== 'WORKPLACE_USER') {
        where.scheduleType = type
      }
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('[Schedules] 조회 오류:', error)
    return NextResponse.json(
      { error: '일정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 일정 생성 (STAFF 이상만)
export async function POST(request: NextRequest) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description, startDate, endDate, isAllDay, location, isOnline, scheduleType, relatedId } = body

    if (!title || !startDate) {
      return NextResponse.json(
        { error: '제목과 시작 일시는 필수입니다.' },
        { status: 400 }
      )
    }

    const schedule = await prisma.schedule.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isAllDay: isAllDay || false,
        location: location || null,
        isOnline: isOnline || false,
        scheduleType: validateEnum(ScheduleType, scheduleType, '일정유형') ?? 'PUBLIC',
        relatedId: relatedId || null,
        userId: authCheck.user!.id,
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
      message: '일정이 생성되었습니다.',
      schedule,
    })
  } catch (error) {
    console.error('[Schedules] 생성 오류:', error)
    return NextResponse.json(
      { error: '일정 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
