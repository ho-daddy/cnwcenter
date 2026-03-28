'use client'

import { useState, useEffect } from 'react'
import { Bell, Calendar, Users, FileText, Newspaper, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface TodayNotifications {
  schedulesToday: number
  counselingActive: number
  unreadNotices: number
  hasNewBriefing: boolean
  surveysActive: number
  riskAssessmentDueSoon: number
  totalCount: number
}

export function NotificationPopover() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<TodayNotifications | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && !data) {
      fetchNotifications()
    }
  }, [open])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications/today')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('알림 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const items = data
    ? [
        {
          icon: Calendar,
          label: '오늘 일정',
          count: data.schedulesToday,
          href: '/calendar',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        },
        {
          icon: Users,
          label: '진행중 상담',
          count: data.counselingActive,
          href: '/counseling',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        },
        {
          icon: FileText,
          label: '읽지 않은 공지',
          count: data.unreadNotices,
          href: '/notices',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
        },
        data.hasNewBriefing && {
          icon: Newspaper,
          label: '새 AI 브리핑',
          count: 1,
          href: '/',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        },
        {
          icon: FileText,
          label: '진행중 설문',
          count: data.surveysActive,
          href: '/survey',
          color: 'text-teal-600',
          bgColor: 'bg-teal-50',
        },
      ].filter(Boolean)
    : []

  return (
    <div className="relative">
      {/* 알림 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-gray-100 relative"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {data && data.totalCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {/* 팝오버 */}
      {open && (
        <>
          {/* 배경 클릭 영역 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* 팝오버 내용 */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-xl z-50 overflow-hidden">
            {/* 헤더 */}
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">오늘의 할 일</h3>
            </div>

            {/* 본문 */}
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                로딩 중...
              </div>
            ) : data && items.length > 0 ? (
              <div className="py-2">
                {items.map((item: any, idx: number) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={idx}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${item.bgColor}`}>
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {item.label}
                        </p>
                        {item.count > 0 && (
                          <p className="text-xs text-gray-500">
                            {item.count}건
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">
                  오늘 할 일이 없습니다 ✨
                </p>
              </div>
            )}

            {/* 푸터 */}
            <div className="px-4 py-3 border-t bg-gray-50">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                대시보드로 이동 →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
