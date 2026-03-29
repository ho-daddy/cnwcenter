'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Mail } from 'lucide-react'
import { SocialButtons } from './social-buttons'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  // URL 파라미터에서 에러 메시지 확인
  const urlError = searchParams.get('error')
  const errorMessages: Record<string, string> = {
    rejected: '가입이 거부되었습니다.',
    suspended: '계정이 정지되었습니다.',
    Callback: '인증 중 오류가 발생했습니다.',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        // 승인 대기 상태 체크
        if (result.error.startsWith('PENDING:')) {
          router.push('/pending-approval')
          return
        }
        if (result.error.startsWith('REJECTED:')) {
          setError('가입이 거부되었습니다.')
          return
        }
        if (result.error.startsWith('SUSPENDED:')) {
          setError('계정이 정지되었습니다.')
          return
        }
        setError(result.error)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">새움터 로그인</CardTitle>
        <CardDescription>산업안전보건 통합 업무관리시스템</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 에러 메시지 */}
        {(error || urlError) && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error || (urlError && errorMessages[urlError]) || '오류가 발생했습니다.'}</span>
          </div>
        )}

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              이메일
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                비밀번호
              </label>
              <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              placeholder="********"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                이메일로 로그인
              </>
            )}
          </Button>
        </form>

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">또는</span>
          </div>
        </div>

        {/* 소셜 로그인 버튼 */}
        <SocialButtons />

        {/* 회원가입 링크 */}
        <div className="text-center text-sm">
          <span className="text-gray-500">계정이 없으신가요?</span>{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            회원가입
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
