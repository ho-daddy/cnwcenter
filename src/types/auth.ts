import { UserRole, UserStatus } from '@prisma/client'
import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      status: UserStatus
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: UserRole
    status: UserStatus
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: UserRole
    status: UserStatus
  }
}

// 권한 체크 헬퍼
export function canAccessAdmin(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'STAFF'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'SUPER_ADMIN'
}

export function canManageSettings(role: UserRole): boolean {
  return role === 'SUPER_ADMIN'
}

export function canWriteSchedule(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'STAFF'
}

export function canManageWorkplace(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'STAFF'
}
