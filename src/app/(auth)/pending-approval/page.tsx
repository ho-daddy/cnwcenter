import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Home, RefreshCw } from 'lucide-react'

export const metadata = {
  title: '승인 대기 | 새움터',
  description: '관리자 승인 대기 중',
}

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl font-bold">승인 대기 중</CardTitle>
          <CardDescription>
            회원가입이 완료되었습니다!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-center">
            <p className="text-gray-600">
              관리자가 가입 신청을 검토 중입니다.
            </p>
            <p className="text-gray-600">
              승인이 완료되면 로그인이 가능합니다.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              문의사항이 있으시면 관리자에게 연락해주세요.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-10 px-4 py-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 로그인 시도
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full h-10 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Home className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
