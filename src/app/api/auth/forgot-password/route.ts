import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // 사용자가 없어도 성공 응답 (이메일 열거 공격 방지)
    if (!user || !user.password) {
      return NextResponse.json({
        success: true,
        message: '해당 이메일로 비밀번호 재설정 링크를 발송했습니다.',
      })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1시간

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    })

    await sendPasswordResetEmail(user.email, user.name || '회원', resetToken)

    return NextResponse.json({
      success: true,
      message: '해당 이메일로 비밀번호 재설정 링크를 발송했습니다.',
    })
  } catch (error) {
    console.error('비밀번호 재설정 요청 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
