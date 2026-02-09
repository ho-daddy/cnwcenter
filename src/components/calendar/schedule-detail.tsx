'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, MapPin, Video, Clock, User, Edit, Trash2 } from 'lucide-react'

interface Schedule {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  location: string | null
  isOnline: boolean
  scheduleType: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ScheduleDetailProps {
  schedule: Schedule
  canEdit: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

const SCHEDULE_TYPE_COLORS: Record<string, string> = {
  GENERAL: 'bg-blue-500',
  COUNSELING: 'bg-green-500',
  RISK_ASSESSMENT: 'bg-orange-500',
  MUSCULOSKELETAL: 'bg-purple-500',
}

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  GENERAL: '일반',
  COUNSELING: '상담',
  RISK_ASSESSMENT: '위험성평가',
  MUSCULOSKELETAL: '근골조사',
}

export function ScheduleDetail({
  schedule,
  canEdit,
  onClose,
  onEdit,
  onDelete,
}: ScheduleDetailProps) {
  const startDate = new Date(schedule.startDate)
  const endDate = schedule.endDate ? new Date(schedule.endDate) : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 text-xs text-white rounded ${
                  SCHEDULE_TYPE_COLORS[schedule.scheduleType]
                }`}
              >
                {SCHEDULE_TYPE_LABELS[schedule.scheduleType]}
              </span>
              {schedule.isOnline && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                  <Video className="h-3 w-3" />
                  온라인
                </span>
              )}
            </div>
            <CardTitle className="text-xl">{schedule.title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 시간 */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <div className="font-medium">
                {format(startDate, 'yyyy년 M월 d일 (eee)', { locale: ko })}
              </div>
              <div className="text-sm text-gray-600">
                {format(startDate, 'HH:mm', { locale: ko })}
                {endDate && ` - ${format(endDate, 'HH:mm', { locale: ko })}`}
              </div>
            </div>
          </div>

          {/* 장소 */}
          {schedule.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <div className="font-medium">장소</div>
                <div className="text-sm text-gray-600">{schedule.location}</div>
              </div>
            </div>
          )}

          {/* 설명 */}
          {schedule.description && (
            <div className="pt-2 border-t">
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                {schedule.description}
              </div>
            </div>
          )}

          {/* 작성자 */}
          <div className="flex items-center gap-3 pt-2 border-t text-sm text-gray-500">
            <User className="h-4 w-4" />
            <span>
              {schedule.user.name || schedule.user.email}
            </span>
          </div>

          {/* 버튼 */}
          {canEdit && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                삭제
              </Button>
              <Button size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" />
                수정
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
