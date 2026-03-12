import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// 역할별 접근 권한 정의
const ROLE_ACCESS: Record<string, string[]> = {
  // 최고관리자만 접근 가능
  '/settings': ['SUPER_ADMIN'],
  '/admin/users': ['SUPER_ADMIN'],

  // STAFF 이상 접근 가능
  '/admin': ['SUPER_ADMIN', 'STAFF'],
  '/calendar/new': ['SUPER_ADMIN', 'STAFF'],
  '/calendar/edit': ['SUPER_ADMIN', 'STAFF'],
  '/workplaces': ['SUPER_ADMIN', 'STAFF'],
  '/notices/new': ['SUPER_ADMIN', 'STAFF'],
  '/notices/edit': ['SUPER_ADMIN', 'STAFF'],
  '/counseling': ['SUPER_ADMIN', 'STAFF'],
  '/survey': ['SUPER_ADMIN', 'STAFF'],
}

// 공개 경로 (로그인 없이 접근 가능)
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/pending-approval',
  '/api/auth',
  '/api/briefing',  // 브리핑 자동 수집/분석
  '/s/',           // 공개 설문 URL
]

// 승인된 사용자만 접근 가능한 경로
const PROTECTED_PATHS = [
  '/',
  '/notices',
  '/calendar',
  '/counseling',
  '/risk-assessment',
  '/musculoskeletal',
  '/admin',
  '/settings',
  '/workplaces',
]

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // 공개 경로는 통과
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
      return NextResponse.next()
    }

    // 토큰이 없으면 로그인 페이지로 리다이렉트
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // 승인 대기 중인 사용자
    if (token.status === 'PENDING') {
      if (pathname !== '/pending-approval') {
        return NextResponse.redirect(new URL('/pending-approval', req.url))
      }
      return NextResponse.next()
    }

    // 거부되거나 정지된 사용자
    if (token.status === 'REJECTED' || token.status === 'SUSPENDED') {
      return NextResponse.redirect(new URL('/login?error=' + token.status.toLowerCase(), req.url))
    }

    // 역할 기반 접근 제어
    for (const [path, allowedRoles] of Object.entries(ROLE_ACCESS)) {
      if (pathname.startsWith(path)) {
        if (!allowedRoles.includes(token.role as string)) {
          // 권한이 없으면 대시보드로 리다이렉트
          return NextResponse.redirect(new URL('/', req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // 공개 경로는 항상 허용
        if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
          return true
        }

        // API 경로 중 일부는 별도 처리
        if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
          // API 인증은 각 라우트에서 처리
          return true
        }

        // 그 외는 토큰 필요
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 매칭:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - public 폴더
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
