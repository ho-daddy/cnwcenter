'use client'

import { DailyReport } from '@prisma/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FileText, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ReportHistoryProps {
  reports: Pick<DailyReport, 'id' | 'date' | 'articleCount' | 'filteredCount' | 'createdAt'>[]
}

export function ReportHistory({ reports }: ReportHistoryProps) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>아직 생성된 리포트가 없습니다</p>
        <p className="text-sm">수집 후 AI 분석을 실행해주세요</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border divide-y">
      {reports.map((report) => (
        <Link
          key={report.id}
          href={`/briefing/${format(report.date, 'yyyy-MM-dd')}`}
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-500" />
            <div>
              <div className="font-medium text-gray-900">
                {format(report.date, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
              </div>
              <div className="text-sm text-gray-500">
                {report.articleCount}건 수집 / {report.filteredCount}건 분석
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
      ))}
    </div>
  )
}
