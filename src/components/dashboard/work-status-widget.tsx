import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users,
  Clock,
  AlertTriangle,
  ClipboardList,
  CheckCircle,
  FileText,
  CalendarDays,
  TrendingUp,
} from 'lucide-react'

export interface WorkStatusData {
  counselingActive: number    // 진행중 상담 (RECEIVED + IN_PROGRESS)
  counselingPending: number   // 접수 대기 (RECEIVED)
  counselingClosedMonth: number // 이번 달 종결
  riskAssessmentYear: number  // 올해 위험성평가 건수
  msAssessmentYear: number    // 올해 근골조사 건수
  msInProgress: number        // 진행중 근골조사
  surveyActive: number        // 진행중 설문
  schedulesWeek: number       // 이번 주 일정
}

interface StatCard {
  label: string
  value: number
  color: string
  bgColor: string
  icon: React.ElementType
  href?: string
}

export function WorkStatusWidget({ data }: { data: WorkStatusData }) {
  const stats: StatCard[] = [
    {
      label: '진행중 상담',
      value: data.counselingActive,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: Users,
      href: '/counseling',
    },
    {
      label: '접수 대기 상담',
      value: data.counselingPending,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      icon: Clock,
      href: '/counseling',
    },
    {
      label: '올해 위험성평가',
      value: data.riskAssessmentYear,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      icon: AlertTriangle,
      href: '/risk-assessment',
    },
    {
      label: '올해 근골조사',
      value: data.msAssessmentYear,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: ClipboardList,
      href: '/musculoskeletal',
    },
    {
      label: '진행중 설문',
      value: data.surveyActive,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      icon: FileText,
      href: '/surveys',
    },
    {
      label: '이번 주 일정',
      value: data.schedulesWeek,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      icon: CalendarDays,
      href: '/calendar',
    },
    {
      label: '이번 달 종결 상담',
      value: data.counselingClosedMonth,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: CheckCircle,
      href: '/counseling',
    },
    {
      label: '진행중 근골조사',
      value: data.msInProgress,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      icon: TrendingUp,
      href: '/musculoskeletal',
    },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">통합 업무 현황</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {stats.map((item) => {
          const Icon = item.icon
          const content = (
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                </div>
              </div>
            </CardContent>
          )

          return (
            <Card key={item.label} className="border border-gray-200 hover:shadow-md transition-shadow">
              {item.href ? (
                <Link href={item.href}>{content}</Link>
              ) : (
                content
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
