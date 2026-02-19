'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  ClipboardList,
  Settings,
  PanelLeftClose,
  PanelLeft,
  X,
  Calendar,
  Building2,
  UserCog,
  ChevronDown,
  ChevronRight,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar-store'
import { NavItem } from '@/types/dashboard'
import { UserRole } from '@prisma/client'

// 역할별 메뉴 정의
const getNavItems = (role?: UserRole): NavItem[] => {
  const items: NavItem[] = [
    { title: '오늘의 새움터', href: '/', icon: LayoutDashboard },
    { title: '공지사항', href: '/notices', icon: Bell },
    { title: '일정 관리', href: '/calendar', icon: Calendar },
  ]

  // STAFF 이상: 상담 관리
  if (role === 'SUPER_ADMIN' || role === 'STAFF') {
    items.push({ title: '상담 관리', href: '/counseling', icon: Users })
  }

  // 위험성평가 서브메뉴
  items.push({
    title: '위험성평가',
    href: '/risk-assessment',
    icon: AlertTriangle,
    subItems: [
      { title: '대시보드',   href: '/risk-assessment' },
      { title: '평가 실시',  href: '/risk-assessment/conduct' },
      { title: '모아 보기',  href: '/risk-assessment/view' },
      { title: '보고서 생성', href: '/risk-assessment/report' },
      { title: '개선작업',   href: '/risk-assessment/improvement' },
      { title: '사전등록',   href: '/risk-assessment/registration' },
    ],
  })

  // 근골조사 서브메뉴
  items.push({
    title: '근골조사',
    href: '/musculoskeletal',
    icon: ClipboardList,
    subItems: [
      { title: '대시보드', href: '/musculoskeletal' },
      { title: '조사 실시', href: '/musculoskeletal/survey' },
      { title: '모아 보기', href: '/musculoskeletal/view' },
      { title: '보고서 생성', href: '/musculoskeletal/report' },
      { title: '개선작업', href: '/musculoskeletal/improvement' },
    ],
  })

  // 관리자 메뉴 (SUPER_ADMIN 또는 STAFF)
  if (role === 'SUPER_ADMIN' || role === 'STAFF') {
    items.push({ title: '사업장 관리', href: '/workplaces', icon: Building2 })
  }

  // SUPER_ADMIN 전용 메뉴
  if (role === 'SUPER_ADMIN') {
    items.push(
      { title: '사용자 관리', href: '/admin/users', icon: UserCog },
      { title: '설정', href: '/settings', icon: Settings }
    )
  }

  return items
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } = useSidebarStore()
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  const navItems = getNavItems(session?.user?.role)

  // 현재 경로가 서브메뉴에 포함되어 있으면 자동 확장
  const isInSubMenu = (item: NavItem): boolean => {
    if (!item.subItems) return false
    return item.subItems.some(
      (sub) => pathname === sub.href || pathname.startsWith(sub.href + '/')
    )
  }

  // 메뉴 확장/축소 토글
  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    )
  }

  // 메뉴가 확장되어 있는지 확인
  const isMenuExpanded = (item: NavItem): boolean => {
    return expandedMenus.includes(item.href) || isInSubMenu(item)
  }

  return (
    <>
      {/* 모바일 오버레이 배경 */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
          // 데스크톱
          isCollapsed ? 'lg:w-16' : 'lg:w-60',
          // 모바일
          isMobileOpen ? 'w-60 translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* 로고 영역 */}
        <div className="h-16 flex items-center border-b border-gray-200 px-4">
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">새</span>
              </div>
              <span className="font-bold text-lg text-gray-900">새움터</span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/" className="mx-auto">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">새</span>
              </div>
            </Link>
          )}
          {/* 모바일 닫기 버튼 */}
          <button
            className="ml-auto lg:hidden p-1 rounded hover:bg-gray-100"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const isExpanded = hasSubItems && isMenuExpanded(item)
            const Icon = item.icon

            if (hasSubItems && !isCollapsed) {
              // 서브메뉴가 있는 경우
              return (
                <div key={item.href}>
                  <button
                    onClick={() => toggleMenu(item.href)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="flex-1 text-left">{item.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-4">
                      {item.subItems!.map((subItem) => {
                        const isSubActive = pathname === subItem.href
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'block px-3 py-2 rounded-lg text-sm transition-colors',
                              isSubActive
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            )}
                          >
                            {subItem.title}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // 일반 메뉴 항목
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  isCollapsed && 'justify-center px-2'
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.title}</span>}
              </Link>
            )
          })}
        </nav>

        {/* 접기/펼치기 버튼 (데스크톱 전용) */}
        <div className="hidden lg:block border-t border-gray-200 p-2">
          <button
            onClick={toggle}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full',
              isCollapsed && 'justify-center px-2'
            )}
          >
            {isCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5" />
                <span>사이드바 접기</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
