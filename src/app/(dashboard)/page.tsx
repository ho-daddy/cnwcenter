import { prisma } from '@/lib/prisma'
import { startOfDay, startOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns'
import { WorkStatusWidget, WorkStatusData } from '@/components/dashboard/work-status-widget'
import { ScheduleWidget } from '@/components/dashboard/schedule-widget'
import { BriefingWidget } from '@/components/dashboard/briefing-widget'
import { DailyBriefingCard } from '@/components/dashboard/daily-briefing-card'
import { NoticeWidget } from '@/components/dashboard/notice-widget'

// 항상 최신 데이터를 조회하도록 동적 렌더링 강제
export const dynamic = 'force-dynamic'

async function getWorkStatusData(): Promise<WorkStatusData> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const monthStart = startOfMonth(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // 월요일 기준
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const [
    counselingActive,
    counselingPending,
    counselingClosedMonth,
    riskAssessmentYear,
    msAssessmentYear,
    msInProgress,
    surveyActive,
    schedulesWeek,
  ] = await Promise.all([
    // 진행중 상담 (RECEIVED + IN_PROGRESS)
    prisma.counselingCase.count({
      where: { status: { in: ['RECEIVED', 'IN_PROGRESS'] } },
    }),
    // 접수 대기 상담 (RECEIVED만)
    prisma.counselingCase.count({
      where: { status: 'RECEIVED' },
    }),
    // 이번 달 종결 상담
    prisma.counselingCase.count({
      where: {
        status: 'CLOSED',
        updatedAt: { gte: monthStart },
      },
    }),
    // 올해 위험성평가 건수
    prisma.riskAssessmentCard.count({
      where: { year: currentYear },
    }),
    // 올해 근골조사 건수
    prisma.musculoskeletalAssessment.count({
      where: { year: currentYear },
    }),
    // 진행중 근골조사 (DRAFT + IN_PROGRESS)
    prisma.musculoskeletalAssessment.count({
      where: { status: { in: ['DRAFT', 'IN_PROGRESS'] } },
    }),
    // 진행중 설문 (PUBLISHED)
    prisma.survey.count({
      where: { status: 'PUBLISHED' },
    }),
    // 이번 주 일정
    prisma.schedule.count({
      where: {
        startDate: { lte: weekEnd },
        OR: [
          { endDate: { gte: weekStart } },
          { endDate: null, startDate: { gte: weekStart } },
        ],
      },
    }),
  ])

  return {
    counselingActive,
    counselingPending,
    counselingClosedMonth,
    riskAssessmentYear,
    msAssessmentYear,
    msInProgress,
    surveyActive,
    schedulesWeek,
  }
}

export default async function DashboardPage() {
  const today = startOfDay(new Date())

  const [workStatus, todayReport, briefings] = await Promise.all([
    getWorkStatusData(),
    // 오늘의 AI 브리핑 리포트 조회
    prisma.dailyReport.findUnique({
      where: { date: today },
    }),
    // 최근 7일간 기사 조회 (최신순 정렬)
    prisma.newsBriefing.findMany({
      where: {
        collectedAt: { gte: subDays(new Date(), 7) },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* 통합 업무 현황 - 전체 너비 */}
      <WorkStatusWidget data={workStatus} />

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
