'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail, Send, X } from 'lucide-react'

interface EmailModalProps {
  open: boolean
  onClose: () => void
  to?: string | null  // null이면 전체 발송 모드
  userCount?: number  // 전체 발송 시 대상 수
}

export function EmailModal({ open, onClose, to, userCount }: EmailModalProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const isBulk = !to

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)

    if (isBulk && !confirm(`승인된 전체 회원(${userCount}명)에게 이메일을 발송하시겠습니까?`)) {
      return
    }

    setIsLoading(true)

    try {
      const url = isBulk ? '/api/admin/users/send-bulk-email' : '/api/admin/users/send-email'
      const body = isBulk
        ? { subject, message }
        : { to, subject, message }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
        setSubject('')
        setMessage('')
      } else {
        setResult({ success: false, message: data.error || '발송 실패' })
      }
    } catch {
      setResult({ success: false, message: '서버와 통신 중 오류가 발생했습니다.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {isBulk ? '전체 메일 발송' : '이메일 발송'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">받는 사람</label>
              <input
                type="text"
                value={isBulk ? `전체 승인 회원 (${userCount}명)` : to || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email-subject" className="text-sm font-medium text-gray-700">
                제목
              </label>
              <input
                id="email-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={isLoading}
                placeholder="이메일 제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email-message" className="text-sm font-medium text-gray-700">
                내용
              </label>
              <textarea
                id="email-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={isLoading}
                rows={6}
                placeholder="이메일 내용을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
              />
            </div>

            {result && (
              <div className={`p-3 text-sm rounded-md ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.message}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {isBulk ? '전체 발송' : '발송'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
