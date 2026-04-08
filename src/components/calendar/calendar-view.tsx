'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  MapPin,
  Video,
  Clock,
} from 'lucide-react'
import { ScheduleForm } from './schedule-form'
import { ScheduleDetail } from './schedule-detail'
import { canWriteSchedule } from '@/types/auth'

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
    id: string
    name: string | null
    email: string
  }
}

const SCHEDULE_TYPE_COLORS: Record<string, string> = {
  PUBLIC: 'bg-blue-500',
  PRIVATE: 'bg-gray-500',
}

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  PUBLIC: '공개',
  PRIVATE: '비공개',
}

export function CalendarView() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)

  const canWrite = session?.user?.role && canWriteSchedule(session.user.role)

  const fetchSchedules = async () => {
    setIsLoading(true)
    try {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)

      const response = await fetch(
        `/api/schedules?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )

      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules)
      }
    } catch (error) {
      console.error('일정 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [currentDate])

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale: ko })
    const endDate = endOfWeek(monthEnd, { locale: ko })

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day
        const daySchedules = schedules.filter((s) =>
          isSameDay(parseISO(s.startDate), currentDay)
        )

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] border-b border-r p-1 ${
              !isSameMonth(day, monthStart)
                ? 'bg-gray-50 text-gray-400'
                : 'bg-white'
            } ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''}`}
            onClick={() => {
              setSelectedDate(currentDay)
              if (canWrite && daySchedules.length === 0) {
                setEditingSchedule(null)
                setShowForm(true)
              }
            }}
          >
            <div
              className={`text-sm font-medium p-1 ${
                isSameDay(day, new Date())
                  ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
                  : ''
              }`}
            >
              {format(day, 'd')}
            </div>
            <div className="space-y-1 mt-1">
              {daySchedules.slice(0, 3).map((schedule) => (
                <div
                  key={schedule.id}
                  className={`text-xs p-1 rounded truncate cursor-pointer text-white ${
                    SCHEDULE_TYPE_COLORS[schedule.scheduleType]
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSchedule(schedule)
                  }}
                >
                  {schedule.title}
                </div>
              ))}
              {daySchedules.length > 3 && (
                <div className="text-xs text-gray-500 pl-1">
                  +{daySchedules.length - 3}개 더
                </div>
              )}
            </div>
          </div>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      )
      days = []
    }

    return rows
  }

  const handleFormSubmit = () => {
    setShowForm(false)
    setEditingSchedule(null)
    fetchSchedules()
  }

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(null)
    setEditingSchedule(schedule)
    setShowForm(true)
  }

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSelectedSchedule(null)
        fetchSchedules()
      }
    } catch (error) {
      console.error('일정 삭제 오류:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              오늘
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setSelectedDate(new Date())
              setEditingSchedule(null)
              setShowForm(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            일정 추가
          </Button>
        )}
      </div>

      {/* 범례 */}
      <div className="flex gap-4 text-sm">
        {Object.entries(SCHEDULE_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${SCHEDULE_TYPE_COLORS[type]}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* 캘린더 */}
      <Card>
        <CardContent className="p-0">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div
                key={day}
                className={`p-2 text-center text-sm font-medium ${
                  index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : ''
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          {/* 날짜 그리드 */}
          {renderCalendar()}
        </CardContent>
      </Card>

      {/* 일정 폼 모달 */}
      {showForm && (
        <ScheduleForm
          date={selectedDate}
          schedule={editingSchedule}
          onClose={() => {
            setShowForm(false)
            setEditingSchedule(null)
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* 일정 상세 모달 */}
      {selectedSchedule && (
        <ScheduleDetail
          schedule={selectedSchedule}
          canEdit={canWrite ?? false}
          onClose={() => setSelectedSchedule(null)}
          onEdit={() => handleEdit(selectedSchedule)}
          onDelete={() => handleDelete(selectedSchedule.id)}
        />
      )}
    </div>
  )
}
