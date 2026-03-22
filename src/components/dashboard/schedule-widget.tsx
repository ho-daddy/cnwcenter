'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, MapPin, Phone, Users, Flag, Clock, FileText, Video } from 'lucide-react'
import { format, isToday, addDays, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Schedule {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  isAllDay: boolean
  location: string | null
  isOnline: boolean
  scheduleType: string
  user: {
    name: string | null
  }
}

const typeConfig = {
  GENERAL: { color: 'border-gray-500', bg: 'bg-gray-500', icon: Calendar, label: '일반' },
  COUNSELING: { color: 'border-blue-500', bg: 'bg-blue-500', icon: Phone, label: '상담' },
  RISK_ASSESSMENT: { color: 'border-green-500', bg: 'bg-green-500', icon: FileText, label: '위험성평가' },
  MUSCULOSKELETAL: { color: 'border-amber-500', bg: 'bg-amber-500', icon: Users, label: '근골조사' },
  MEETING_ROOM: { color: 'border-rose-500', bg: 'bg-rose-500', icon: Flag, label: '회의실' },
}

// 시간 포맷 헬퍼
function formatScheduleTime(schedule: Schedule): string {
  if (schedule.isAllDay) {
    return '종일'
  }

  const start = format(new Date(schedule.startDate), 'HH:mm')
  if (schedule.endDate) {
    const end = format(new Date(schedule.endDate), 'HH:mm')
    return `${start} - ${end}`
  }
  return start
}

// 날짜 포맷 헬퍼 (1주일 일정용)
function formatScheduleDate(dateStr: string): string {
  const date = new Date(dateStr)
  return format(date, 'M/d (EEE)', { locale: ko })
}

export function ScheduleWidget() {
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([])
  const [weekSchedules, setWeekSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const today = format(new Date(), 'M월 d일 (EEEE)', { locale: ko })

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      const now = new Date()
      const todayStart = startOfDay(now)
      const todayEnd = endOfDay(now)
      const weekEnd = endOfDay(addDays(now, 7))

      // 오늘부터 1주일 이내의 일정 조회
      const response = await fetch(
        `/api/schedules?startDate=${todayStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      )

      if (response.ok) {
        const data = await response.json()
        const schedules = data.schedules || []

        // 오늘 일정과 1주일 이내 일정 분리
        const todayList: Schedule[] = []
        const weekList: Schedule[] = []

        schedules.forEach((schedule: Schedule) => {
          const scheduleDate = new Date(schedule.startDate)
          if (isToday(scheduleDate)) {
            todayList.push(schedule)
          } else if (isAfter(scheduleDate, todayEnd) && isBefore(scheduleDate, weekEnd)) {
            weekList.push(schedule)
          }
        })

        // 시간순 정렬
        todayList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        weekList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

        setTodaySchedules(todayList)
        setWeekSchedules(weekList)
      }
    } catch (error) {
      console.error('일정 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getConfig = (scheduleType: string) => {
    return typeConfig[scheduleType as keyof typeof typeConfig] || typeConfig.GENERAL
  }

  if (isLoading) {
    return (
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 h-5 text-blue-600" />
            오늘의 일정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-4">로딩 중...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 h-5 text-blue-600" />
            일정
          </CardTitle>
          <span className="text-sm text-gray-500">{today}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 오늘의 일정 (상세 표시) */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            오늘
          </h3>
          {todaySchedules.length === 0 ? (
            <p className="text-sm text-gray-400 py-2 pl-3">오늘 일정이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((schedule) => {
                const config = getConfig(schedule.scheduleType)
                const Icon = config.icon

                return (
                  <div
                    key={schedule.id}
                    className={cn(
                      'p-3 rounded-lg bg-gray-50 border-l-4',
                      config.color
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-1.5 rounded-md text-white shrink-0', config.bg)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{schedule.title}</p>
                          <span className="text-xs text-gray-400 shrink-0">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatScheduleTime(schedule)}
                          </span>
                          {schedule.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {schedule.location}
                            </span>
                          )}
                          {schedule.isOnline && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <Video className="w-3 h-3" />
                              온라인
                            </span>
                          )}
                        </div>
                        {/* 상세 설명 (오늘 일정에만 표시) */}
                        {schedule.description && (
                          <p className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-100">
                            {schedule.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 1주일 이내 일정 (간단 리스트) */}
        {weekSchedules.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              다가오는 일정
            </h3>
            <div className="space-y-2">
              {weekSchedules.slice(0, 5).map((schedule) => {
                const config = getConfig(schedule.scheduleType)

                return (
                  <div
                    key={schedule.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-gray-50"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.bg)} />
                    <span className="text-xs text-gray-500 shrink-0 w-16">
                      {formatScheduleDate(schedule.startDate)}
                    </span>
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {schedule.title}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {schedule.isAllDay ? '종일' : format(new Date(schedule.startDate), 'HH:mm')}
                    </span>
                  </div>
                )
              })}
              {weekSchedules.length > 5 && (
                <p className="text-xs text-gray-400 text-center pt-1">
                  +{weekSchedules.length - 5}개 더 보기
                </p>
              )}
            </div>
          </div>
        )}

        {todaySchedules.length === 0 && weekSchedules.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            1주일 내 예정된 일정이 없습니다
          </p>
        )}
      </CardContent>
    </Card>
  )
}
