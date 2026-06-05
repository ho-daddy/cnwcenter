import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'

// 사용자 역할 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await request.json()
    const { role } = body

    // 유효한 역할인지 확인
    if (!['SUPER_ADMIN', 'STAFF', 'WORKPLACE_USER'].includes(role)) {
      return NextResponse.json({ error: '유효하지 않은 역할입니다.' }, { status: 400 })
    }

    // STAFF 제약: SUPER_ADMIN 역할 부여 불가, SUPER_ADMIN 계정 역할 변경 불가
    if (authCheck.user!.role === 'STAFF') {
      if (role === 'SUPER_ADMIN') {
        return NextResponse.json({ error: '최고관리자 역할은 부여할 수 없습니다.' }, { status: 403 })
      }
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
      if (target?.role === 'SUPER_ADMIN') {
        return NextResponse.json({ error: '최고관리자 계정의 역할은 변경할 수 없습니다.' }, { status: 403 })
      }
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 자기 자신의 역할은 변경 불가
    if (id === authCheck.user!.id) {
      return NextResponse.json(
        { error: '자신의 역할은 변경할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 역할 변경
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: role as UserRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    })

    console.log(`[Admin] 사용자 역할 변경: ${updatedUser.email} -> ${role} by ${authCheck.user!.email}`)

    return NextResponse.json({
      success: true,
      message: '역할이 변경되었습니다.',
      user: updatedUser,
    })
  } catch (error) {
    console.error('[Admin Users Role] 오류:', error)
    return NextResponse.json(
      { error: '역할 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
