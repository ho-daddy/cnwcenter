import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'CNW Center <noreply@saeum.space>'

export async function sendNewUserNotification(user: {
  name: string
  email: string
  phone?: string | null
  organization?: string | null
  provider: 'email' | 'google'
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
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

export async function sendPasswordResetEmail(email: string, name: string, resetToken: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: '[새움터] 비밀번호 재설정',
      html: `
        <div style="max-width: 480px; margin: 0 auto; font-family: sans-serif; color: #333;">
          <h2 style="color: #2563eb;">비밀번호 재설정</h2>
          <p>안녕하세요, <strong>${name}</strong>님.</p>
          <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">비밀번호 재설정</a>
          </div>
          <p style="font-size: 14px; color: #666;">이 링크는 <strong>1시간</strong> 후에 만료됩니다.</p>
          <p style="font-size: 14px; color: #666;">본인이 요청하지 않으셨다면 이 이메일을 무시해주세요.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">새움터 - 산업안전보건 통합 업무관리시스템</p>
        </div>
      `,
    })
    return { success: true }
  } catch (error) {
    console.error('비밀번호 재설정 이메일 발송 실패:', error)
    return { success: false, error }
  }
}

export async function sendAdminEmail(to: string, subject: string, message: string) {
  const htmlMessage = message.replace(/\n/g, '<br />')

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `[새움터] ${subject}`,
      html: `
        <div style="max-width: 480px; margin: 0 auto; font-family: sans-serif; color: #333;">
          <h2 style="color: #2563eb;">${subject}</h2>
          <div style="line-height: 1.6;">${htmlMessage}</div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">새움터 - 산업안전보건 통합 업무관리시스템</p>
        </div>
      `,
    })
    return { success: true }
  } catch (error) {
    console.error('이메일 발송 실패:', error)
    return { success: false, error }
  }
}
