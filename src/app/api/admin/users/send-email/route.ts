import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-utils'
import { sendAdminEmail } from '@/lib/email'

export async function POST(request: Request) {
  const authCheck = await requireSuperAdmin()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { to, subject, message } = await request.json()

    if (!to || !subject || !message) {
      return NextResponse.json({ error: '받는 사람, 제목, 내용을 모두 입력해주세요.' }, { status: 400 })
    }

    const result = await sendAdminEmail(to, subject, message)

    if (!result.success) {
      return NextResponse.json({ error: '이메일 발송에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '이메일을 발송했습니다.' })
  } catch (error) {
    console.error('이메일 발송 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
