import { prisma } from '@/lib/prisma'
import { startOfDay, subDays } from 'date-fns'
import { WorkStatusWidget } from '@/components/dashboard/work-status-widget'
import { ScheduleWidget } from '@/components/dashboard/schedule-widget'
import { BriefingWidget } from '@/components/dashboard/briefing-widget'
import { DailyBriefingCard } from '@/components/dashboard/daily-briefing-card'

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

      {/* AI 브리핑 카드 (오늘 리포트가 있을 경우) */}
      {todayReport && <DailyBriefingCard report={todayReport} />}

      {/* 일정 + 브리핑 - 2열 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScheduleWidget />
        <BriefingWidget items={briefings} />
      </div>
    </div>
  )
}
