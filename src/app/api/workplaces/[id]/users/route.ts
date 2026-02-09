import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 사업장에 사용자 배정
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // WORKPLACE_USER는 하나의 사업장에만 연결 가능
    if (user.role === 'WORKPLACE_USER') {
      const existingWorkplaces = await prisma.workplaceUser.findMany({
        where: { userId },
      })

      if (existingWorkplaces.length > 0) {
        // 기존 사업장 연결 해제 후 새로 연결
        await prisma.workplaceUser.deleteMany({
          where: { userId },
        })
      }
    } else {
      // STAFF, SUPER_ADMIN은 여러 사업장 가능 - 중복 체크
      const existing = await prisma.workplaceUser.findUnique({
        where: {
          userId_workplaceId: {
            userId,
            workplaceId: params.id,
          },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: '이미 이 사업장에 배정된 사용자입니다.' },
          { status: 400 }
        )
      }
    }

    await prisma.workplaceUser.create({
      data: {
        userId,
        workplaceId: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: '사용자가 사업장에 배정되었습니다.',
    })
  } catch (error) {
    console.error('[Workplace Users] 배정 오류:', error)
    return NextResponse.json(
      { error: '사용자 배정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 사업장에서 사용자 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }

    await prisma.workplaceUser.delete({
      where: {
        userId_workplaceId: {
          userId,
          workplaceId: params.id,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: '사용자가 사업장에서 제거되었습니다.',
    })
  } catch (error) {
    console.error('[Workplace Users] 제거 오류:', error)
    return NextResponse.json(
      { error: '사용자 제거 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
