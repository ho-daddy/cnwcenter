import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { UserRole } from '@prisma/client'
import { prisma } from './prisma'

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

// 모든 인증된 사용자 (WORKPLACE_USER 포함)
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    return { authorized: false, error: '로그인이 필요합니다.' }
  }

  return { authorized: true, user }
}

// 사업장 접근 권한 체크 (WORKPLACE_USER는 할당된 사업장만)
export async function requireWorkplaceAccess(workplaceId: string) {
  const user = await getCurrentUser()

  if (!user) {
    return { authorized: false, error: '로그인이 필요합니다.' }
  }

  // SUPER_ADMIN, STAFF는 모든 사업장 접근 가능
  if (user.role === 'SUPER_ADMIN' || user.role === 'STAFF') {
    return { authorized: true, user }
  }

  // WORKPLACE_USER는 할당된 사업장만 접근 가능
  const workplaceUser = await prisma.workplaceUser.findUnique({
    where: {
      userId_workplaceId: {
        userId: user.id,
        workplaceId: workplaceId,
      },
    },
  })

  if (!workplaceUser) {
    return { authorized: false, error: '해당 사업장에 대한 권한이 없습니다.' }
  }

  return { authorized: true, user }
}

// 사용자가 접근 가능한 사업장 ID 목록 조회
export async function getAccessibleWorkplaceIds(userId: string, role: UserRole): Promise<string[] | null> {
  // SUPER_ADMIN, STAFF는 모든 사업장 접근 가능 (null 반환 = 제한 없음)
  if (role === 'SUPER_ADMIN' || role === 'STAFF') {
    return null
  }

  // WORKPLACE_USER는 할당된 사업장만
  const workplaceUsers = await prisma.workplaceUser.findMany({
    where: { userId },
    select: { workplaceId: true },
  })

  return workplaceUsers.map((wu) => wu.workplaceId)
}
