import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 입력하세요.' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '새 비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: '비밀번호를 변경할 수 없습니다.' }, { status: 400 })
    }

    // 현재 비밀번호 확인
    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 400 })
    }

    // 새 비밀번호 해시
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // 업데이트
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/user/password]', error)
    return NextResponse.json({ error: '비밀번호 변경 실패' }, { status: 500 })
  }
}
