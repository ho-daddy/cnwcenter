import { prisma } from '@/lib/prisma'
import { CollectButton } from '@/components/settings/collect-button'
import { AnalyzeButton } from '@/components/settings/analyze-button'
import { SourceStatusList } from '@/components/settings/source-status-list'
import { ReportHistory } from '@/components/settings/report-history'
import { BRIEFING_SOURCES } from '@/lib/briefing/sources'

export default async function SettingsPage() {
  // 수집 로그 조회 (최근 것부터)
  const collectionLogs = await prisma.collectionLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50, // 소스당 최신 1개씩 확보
  })

  // 리포트 기록 조회
  const reports = await prisma.dailyReport.findMany({
    orderBy: { date: 'desc' },
    take: 10,
    select: {
      id: true,
      date: true,
      articleCount: true,
      filteredCount: true,
      createdAt: true,
    },
  })

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-1">브리핑 수집 및 AI 분석 관리</p>
      </div>

      {/* 브리핑 수집 */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">브리핑 수집</h2>
        <p className="text-sm text-gray-600 mb-4">
          등록된 소스에서 뉴스와 공지사항을 수집한 후 AI 분석을 실행합니다.
        </p>
        <div className="flex items-center gap-3">
          <CollectButton />
          <AnalyzeButton />
        </div>
      </section>

      {/* 수집 소스 현황 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">수집 소스 현황</h2>
        <p className="text-sm text-gray-600 mb-4">
          현재 등록된 소스 목록입니다. 소스 추가/삭제는 코드에서 관리됩니다.
        </p>
        <SourceStatusList sources={BRIEFING_SOURCES} logs={collectionLogs} />
      </section>

      {/* 리포트 기록 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">리포트 기록</h2>
        <ReportHistory reports={reports} />
      </section>
    </div>
  )
}
