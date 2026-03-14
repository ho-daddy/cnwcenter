'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useSidebarStore } from '@/stores/sidebar-store'
import { UserRole } from '@prisma/client'

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: '최고관리자',
  STAFF: '스탭',
  WORKPLACE_USER: '사업장',
}

export function Header() {
  const { data: session } = useSession()
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const today = format(new Date(), 'yyyy년 M월 d일 (EEEE)', { locale: ko })

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* 모바일 메뉴 토글 */}
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-gray-900">오늘의 새움터</h1>
          <p className="text-sm text-gray-500 hidden sm:block">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* 알림 */}
        <button className="p-2 rounded-lg hover:bg-gray-100 relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* 사용자 메뉴 */}
        {session?.user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-gray-900">
                  {session.user.name || session.user.email}
                </div>
                <div className="text-xs text-gray-500">
                  {ROLE_LABELS[session.user.role]}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </button>

            {/* 드롭다운 메뉴 */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-50 py-1">
                  <div className="px-4 py-2 border-b sm:hidden">
                    <div className="font-medium text-gray-900">
                      {session.user.name || session.user.email}
                    </div>
                    <div className="text-sm text-gray-500">
                      {ROLE_LABELS[session.user.role]}
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="w-4 h-4" />
                    내 정보
                  </Link>
                  {session.user.role === 'SUPER_ADMIN' && (
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="w-4 h-4" />
                      설정
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  )
}
