'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PrivacyPolicyContent } from '@/components/privacy-policy-content'
import { AlertCircle, CheckCircle, Loader2, UserPlus, X } from 'lucide-react'
import { SocialButtons } from './social-buttons'

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    organization: '',
  })

  const closeModal = useCallback(() => setPrivacyModalOpen(false), [])

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!privacyModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [privacyModalOpen, closeModal])

  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (privacyModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [privacyModalOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 개인정보 동의 확인
    if (!privacyAgreed) {
      setError('개인정보 수집 및 이용에 동의해주세요.')
      return
    }

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone || undefined,
          organization: formData.organization || undefined,
          privacyAgreed: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '회원가입에 실패했습니다.')
        return
      }

      setSuccess(true)
      // 3초 후 승인 대기 페이지로 이동
      setTimeout(() => {
        router.push('/pending-approval')
      }, 3000)
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">회원가입 완료!</h2>
            <p className="text-gray-600">
              관리자 승인 후 로그인이 가능합니다.
              <br />
              승인 대기 페이지로 이동합니다...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
          <CardDescription>새움터에 가입하고 서비스를 이용하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* 회원가입 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                이름
              </label>
              <input
                id="name"
                type="text"
                placeholder="홍길동"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
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
              <label htmlFor="phone" className="text-sm font-medium">
                전화번호 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="010-0000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="organization" className="text-sm font-medium">
                소속사업장 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <input
                id="organization"
                type="text"
                placeholder="예: ㅇㅇ건설"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                placeholder="6자 이상"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호 다시 입력"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            {/* 개인정보 수집·이용 동의 */}
            <div className="space-y-2 rounded-md border border-gray-200 p-3 bg-gray-50">
              <div className="flex items-start gap-2">
                <input
                  id="privacyAgreed"
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  disabled={isLoading}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="privacyAgreed" className="text-sm">
                  <span className="font-medium text-red-500">[필수]</span>{' '}
                  개인정보 수집 및 이용에 동의합니다.{' '}
                  <button
                    type="button"
                    onClick={() => setPrivacyModalOpen(true)}
                    className="text-blue-600 hover:underline"
                  >
                    자세히 보기
                  </button>
                </label>
              </div>
              <div className="ml-6 text-xs text-gray-500 space-y-0.5">
                <p>수집 항목: 이름, 이메일, 소속, 연락처</p>
                <p>수집 목적: 회원 관리, 서비스 제공, 상담 업무 수행</p>
                <p>보유 기간: 회원 탈퇴 시까지</p>
              </div>
            </div>

            <Button type="submit" disabled={isLoading || !privacyAgreed} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  가입 중...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  회원가입
                </>
              )}
            </Button>
          </form>

          {/* 안내 문구 */}
          <div className="text-center text-sm text-gray-500">
            가입 후 관리자 승인이 필요합니다.
          </div>

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

          {/* 로그인 링크 */}
          <div className="text-center text-sm">
            <span className="text-gray-500">이미 계정이 있으신가요?</span>{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 개인정보처리방침 모달 */}
      {privacyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="개인정보처리방침"
        >
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />
          {/* 모달 컨텐츠 */}
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-lg shadow-xl flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">개인정보처리방침</h2>
                <p className="text-sm text-gray-500 mt-0.5">최종 수정일: 2026년 3월 13일</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* 본문 (스크롤) */}
            <div className="overflow-y-auto px-6 py-6">
              <PrivacyPolicyContent />
            </div>
            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 shrink-0">
              <Button
                type="button"
                onClick={closeModal}
                className="w-full"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
