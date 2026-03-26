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
  ClipboardCheck,
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
  Trash2,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar-store'
import { NavItem } from '@/types/dashboard'
import { UserRole } from '@prisma/client'
import { useTutorial } from '@/hooks/use-tutorial'
import type { TutorialId } from '@/components/tutorial/tutorial-steps'
import { TUTORIAL_LABELS } from '@/components/tutorial/tutorial-steps'

// 메뉴별 data-tutorial 매핑
const TUTORIAL_ATTR_MAP: Record<string, string> = {
  '/risk-assessment': 'ra-sidebar-menu',
  '/musculoskeletal': 'ms-sidebar-menu',
  '/workplaces': 'wp-sidebar-menu',
}

// 역할별 메뉴 정의
const getNavItems = (role?: UserRole): NavItem[] => {
  const items: NavItem[] = [
    { title: '오늘의 새움터', href: '/', icon: LayoutDashboard },
    { title: '공지사항', href: '/notices', icon: Bell },
  ]

  // 일정 관리: 모든 역할 (WORKPLACE_USER는 회의실 일정만 조회)
  items.push({ title: '일정 관리', href: '/calendar', icon: Calendar })

  // 상담 관리: STAFF 이상
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
      { title: '화학물질',   href: '/risk-assessment/chemicals' },
      { title: '소음 등록',  href: '/risk-assessment/registration' },
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

  // 설문조사 (모든 역할 - WORKPLACE_USER는 자기 사업장 설문만)
  items.push({
    title: '설문조사',
    href: '/survey',
    icon: ClipboardCheck,
    subItems: [
      { title: '설문 목록', href: '/survey' },
      { title: '새 설문', href: '/survey/create' },
    ],
  })

  // 사업장 관리 (모든 역할 - WORKPLACE_USER는 자기 사업장만 관리 가능)
  items.push({ title: '사업장 관리', href: '/workplaces', icon: Building2 })

  // 휴지통 (모든 역할)
  items.push({ title: '휴지통', href: '/trash', icon: Trash2 })

  // SUPER_ADMIN 전용
  if (role === 'SUPER_ADMIN') {
    items.push({ title: '사용자 관리', href: '/admin/users', icon: UserCog })
  }

  // STAFF 이상: 설정 메뉴 (하위 메뉴 포함)
  if (role === 'SUPER_ADMIN' || role === 'STAFF') {
    items.push({
      title: '설정',
      href: '/settings',
      icon: Settings,
      subItems: [
        { title: '브리핑 관리', href: '/settings' },
        { title: '팝업 관리', href: '/settings/popups' },
      ],
    })
  }

  return items
}

const GUIDE_ITEMS: { id: TutorialId; label: string }[] = [
  { id: 'riskAssessment', label: TUTORIAL_LABELS.riskAssessment },
  { id: 'musculoskeletal', label: TUTORIAL_LABELS.musculoskeletal },
  { id: 'workplaces', label: TUTORIAL_LABELS.workplaces },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } = useSidebarStore()
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [guideOpen, setGuideOpen] = useState(false)
  const { startTutorial } = useTutorial()

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

  const handleStartGuide = (id: TutorialId) => {
    setGuideOpen(false)
    setMobileOpen(false)
    startTutorial(id)
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
            const tutorialAttr = TUTORIAL_ATTR_MAP[item.href]

            if (hasSubItems && !isCollapsed) {
              // 서브메뉴가 있는 경우
              return (
                <div key={item.href} data-tutorial={tutorialAttr}>
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
                data-tutorial={tutorialAttr}
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

        {/* 사용 가이드 + 접기/펼치기 */}
        <div className="border-t border-gray-200 p-2 space-y-1">
          {/* 사용 가이드 */}
          <div className="relative">
            <button
              onClick={() => setGuideOpen(prev => !prev)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors w-full',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? '사용 가이드' : undefined}
            >
              <BookOpen className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>사용 가이드</span>}
              {!isCollapsed && (
                guideOpen
                  ? <ChevronDown className="w-4 h-4 ml-auto" />
                  : <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>
            {guideOpen && !isCollapsed && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-emerald-200 pl-4 pb-1">
                {GUIDE_ITEMS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleStartGuide(g.id)}
                    className="block w-full px-3 py-2 rounded-lg text-sm text-left text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            {guideOpen && isCollapsed && (
              <div className="absolute left-full top-0 ml-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 z-50">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">사용 가이드</div>
                {GUIDE_ITEMS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleStartGuide(g.id)}
                    className="block w-full px-3 py-2 text-sm text-left text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 접기/펼치기 버튼 (데스크톱 전용) */}
          <button
            onClick={toggle}
            className={cn(
              'hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full',
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
