import { prisma } from '@/lib/prisma'
import { startOfDay, subDays } from 'date-fns'
import { WorkStatusWidget } from '@/components/dashboard/work-status-widget'
import { ScheduleWidget } from '@/components/dashboard/schedule-widget'
import { BriefingWidget } from '@/components/dashboard/briefing-widget'
import { DailyBriefingCard } from '@/components/dashboard/daily-briefing-card'
import { NoticeWidget } from '@/components/dashboard/notice-widget'

// 항상 최신 데이터를 조회하도록 동적 렌더링 강제
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const today = startOfDay(new Date())

  // 오늘의 AI 브리핑 리포트 조회
  const todayReport = await prisma.dailyReport.findUnique({
    where: { date: today },
  })

  // 최근 7일간 기사 조회 (우선순위별 정렬)
  const briefings = await prisma.newsBriefing.findMany({
    where: {
      collectedAt: { gte: subDays(new Date(), 7) },
    },
    orderBy: [
      { priority: 'asc' }, // critical -> high -> medium -> low -> none
      { publishedAt: 'desc' },
    ],
    take: 10,
  })

  return (
    <div className="space-y-6">
      {/* 통합 업무 현황 - 전체 너비 */}
      <WorkStatusWidget />

      {/* 공지사항 + 일정 - 2열 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NoticeWidget />
        <ScheduleWidget />
      </div>

      {/* AI 브리핑 + 최근 수집기사 - 2열 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyBriefingCard report={todayReport} />
        <BriefingWidget items={briefings} />
      </div>
    </div>
  )
}
