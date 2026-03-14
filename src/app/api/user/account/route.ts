import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 관리자는 계정 삭제 불가
    if (session.user.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: '관리자 계정은 삭제할 수 없습니다.' }, { status: 400 })
    }

    // 사용자 삭제
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/user/account]', error)
    return NextResponse.json({ error: '계정 삭제 실패' }, { status: 500 })
  }
}
