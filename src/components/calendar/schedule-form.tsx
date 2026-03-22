'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Loader2 } from 'lucide-react'

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
}

interface ScheduleFormProps {
  date: Date | null
  schedule: Schedule | null
  onClose: () => void
  onSubmit: () => void
}

const SCHEDULE_TYPES = [
  { value: 'GENERAL', label: '일반 일정' },
  { value: 'COUNSELING', label: '상담' },
  { value: 'RISK_ASSESSMENT', label: '위험성평가' },
  { value: 'MUSCULOSKELETAL', label: '근골조사' },
  { value: 'MEETING_ROOM', label: '회의실 사용' },
]

export function ScheduleForm({ date, schedule, onClose, onSubmit }: ScheduleFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  // 시작시간 기준 2시간 후 계산
  const getDefaultEndDate = (startDateStr: string) => {
    const startDate = new Date(startDateStr)
    startDate.setHours(startDate.getHours() + 2)
    return format(startDate, "yyyy-MM-dd'T'HH:mm")
  }

  const initialStartDate = schedule?.startDate
    ? format(new Date(schedule.startDate), "yyyy-MM-dd'T'HH:mm")
    : date
    ? format(date, "yyyy-MM-dd'T'09:00")
    : format(new Date(), "yyyy-MM-dd'T'09:00")

  const [formData, setFormData] = useState({
    title: schedule?.title || '',
    description: schedule?.description || '',
    startDate: initialStartDate,
    endDate: schedule?.endDate
      ? format(new Date(schedule.endDate), "yyyy-MM-dd'T'HH:mm")
      : schedule
      ? ''
      : getDefaultEndDate(initialStartDate),
    isAllDay: schedule?.isAllDay || false,
    location: schedule?.location || '',
    isOnline: schedule?.isOnline || false,
    scheduleType: schedule?.scheduleType || 'GENERAL',
  })

  // 시작시간 변경 핸들러 - 종료시간 자동 설정
  const handleStartDateChange = (newStartDate: string) => {
    const newEndDate = getDefaultEndDate(newStartDate)
    setFormData({
      ...formData,
      startDate: newStartDate,
      endDate: newEndDate,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = schedule ? `/api/schedules/${schedule.id}` : '/api/schedules'
      const method = schedule ? 'PATCH' : 'POST'

      // 종일 일정인 경우 시간 정보 제거하고 날짜만 전송
      let startDate = formData.startDate
      let endDate = formData.endDate || null

      if (formData.isAllDay) {
        // 종일 일정: 시작일의 00:00:00
        const startOnly = formData.startDate.split('T')[0]
        startDate = `${startOnly}T00:00`
        endDate = null
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate,
          endDate,
        }),
      })

      if (response.ok) {
        onSubmit()
      } else {
        const data = await response.json()
        alert(data.error || '일정 저장에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{schedule ? '일정 수정' : '새 일정'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">제목 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-md"
                placeholder="일정 제목"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">유형</label>
              <select
                value={formData.scheduleType}
                onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                {SCHEDULE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAllDay"
                checked={formData.isAllDay}
                onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isAllDay" className="text-sm font-medium">
                종일 일정
              </label>
            </div>

            {formData.isAllDay ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">날짜 *</label>
                <input
                  type="date"
                  value={formData.startDate.split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, startDate: `${e.target.value}T00:00` })}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">시작 일시 *</label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">종료 일시</label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">장소</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="장소 (선택)"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOnline"
                checked={formData.isOnline}
                onChange={(e) => setFormData({ ...formData, isOnline: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isOnline" className="text-sm">
                온라인 일정
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md resize-none"
                rows={3}
                placeholder="상세 설명 (선택)"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
