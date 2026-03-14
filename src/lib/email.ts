import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendNewUserNotification(user: {
  name: string
  email: string
  phone?: string | null
  organization?: string | null
  provider: 'email' | 'google'
}) {
  try {
    await resend.emails.send({
      from: 'CNW Center <onboarding@resend.dev>',
      to: 'whatfor44@gmail.com',
      subject: `[새움터] 새 회원가입 신청: ${user.name}`,
      html: `
        <h2>새 회원가입 신청이 있습니다</h2>
        <ul>
          <li><strong>이름:</strong> ${user.name}</li>
          <li><strong>이메일:</strong> ${user.email}</li>
          ${user.phone ? `<li><strong>전화번호:</strong> ${user.phone}</li>` : ''}
          ${user.organization ? `<li><strong>소속사업장:</strong> ${user.organization}</li>` : ''}
          <li><strong>가입 방식:</strong> ${user.provider === 'email' ? '이메일' : '구글 계정'}</li>
        </ul>
        <p>승인 대기 상태입니다. 관리자 페이지에서 승인해주세요.</p>
      `,
    })
  } catch (error) {
    console.error('이메일 발송 실패:', error)
  }
}
