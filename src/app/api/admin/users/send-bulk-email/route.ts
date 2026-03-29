import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { sendAdminEmail } from '@/lib/email'

export async function POST(request: Request) {
  const authCheck = await requireSuperAdmin()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { subject, message } = await request.json()

    if (!subject || !message) {
      return NextResponse.json({ error: '제목과 내용을 모두 입력해주세요.' }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: { status: 'APPROVED' },
      select: { email: true },
    })

    if (users.length === 0) {
      return NextResponse.json({ error: '발송 대상 사용자가 없습니다.' }, { status: 400 })
    }

    const results = await Promise.allSettled(
      users.map((user) => sendAdminEmail(user.email, subject, message))
    )

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length
    const failCount = results.length - successCount

    return NextResponse.json({
      success: true,
      message: `총 ${users.length}명 중 ${successCount}명에게 발송 완료${failCount > 0 ? `, ${failCount}명 실패` : ''}`,
      total: users.length,
      successCount,
      failCount,
    })
  } catch (error) {
    console.error('전체 이메일 발송 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
