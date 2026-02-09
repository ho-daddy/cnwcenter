import { CalendarView } from '@/components/calendar/calendar-view'
import { Calendar as CalendarIcon } from 'lucide-react'

export const metadata = {
  title: '일정 관리 | 새움터',
  description: '새움터 일정 관리',
}

export default function CalendarPage() {
  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <CalendarIcon className="h-8 w-8 text-gray-700" />
        <div>
          <h1 className="text-2xl font-bold">일정 관리</h1>
          <p className="text-sm text-gray-500">
            상담, 위험성평가, 근골조사 등의 일정을 관리합니다
          </p>
        </div>
      </div>

      {/* 캘린더 */}
      <CalendarView />
    </div>
  )
}
