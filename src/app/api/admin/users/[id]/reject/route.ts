import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 사용자 거부
export async function POST(
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
    const { reason } = body

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // STAFF는 SUPER_ADMIN 계정을 관리할 수 없음
    if (authCheck.user!.role === 'STAFF' && user.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: '최고관리자 계정은 관리할 수 없습니다.' }, { status: 403 })
    }

    // 거부 처리
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedReason: reason || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        rejectedAt: true,
        rejectedReason: true,
      },
    })

    console.log(`[Admin] 사용자 거부: ${updatedUser.email} by ${authCheck.user!.email}`)

    return NextResponse.json({
      success: true,
      message: '사용자가 거부되었습니다.',
      user: updatedUser,
    })
  } catch (error) {
    console.error('[Admin Users Reject] 오류:', error)
    return NextResponse.json(
      { error: '사용자 거부 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
