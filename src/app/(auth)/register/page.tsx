import { RegisterForm } from '@/components/auth/register-form'

export const metadata = {
  title: '회원가입 | 새움터',
  description: '새움터 회원가입 페이지',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <RegisterForm />
    </div>
  )
}
