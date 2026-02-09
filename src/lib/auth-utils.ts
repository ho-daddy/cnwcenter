import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { UserRole } from '@prisma/client'

// 서버 사이드에서 현재 세션 가져오기
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user ?? null
}

// 특정 역할 체크
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser()

  if (!user) {
    return { authorized: false, error: '로그인이 필요합니다.' }
  }

  if (!allowedRoles.includes(user.role)) {
    return { authorized: false, error: '권한이 없습니다.' }
  }

  return { authorized: true, user }
}

// SUPER_ADMIN 권한 체크
export async function requireSuperAdmin() {
  return requireRole(['SUPER_ADMIN'])
}

// STAFF 이상 권한 체크
export async function requireStaffOrAbove() {
  return requireRole(['SUPER_ADMIN', 'STAFF'])
}
