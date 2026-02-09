import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { DailyReport } from '@prisma/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { TopIssue } from '@/types/analysis'

interface DailyBriefingCardProps {
  report: DailyReport
}

const PRIORITY_ICONS = {
  critical: <AlertTriangle className="w-4 h-4 text-red-500" />,
  high: <AlertCircle className="w-4 h-4 text-orange-500" />,
  medium: <Info className="w-4 h-4 text-yellow-500" />,
}

const PRIORITY_COLORS = {
  critical: 'border-red-200 bg-red-50',
  high: 'border-orange-200 bg-orange-50',
  medium: 'border-yellow-200 bg-yellow-50',
}

export function DailyBriefingCard({ report }: DailyBriefingCardProps) {
  const topIssues: TopIssue[] = JSON.parse(report.topIssuesJson)
  const dateStr = format(report.date, 'M월 d일 (EEEE)', { locale: ko })

  return (
    <Card className="border border-purple-200 bg-gradient-to-r from-purple-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-purple-600" />
          오늘의 AI 브리핑
          <span className="text-sm font-normal text-gray-500 ml-2">
            {dateStr}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3대 핵심 이슈 */}
        {topIssues.length > 0 ? (
          <div className="space-y-3">
            {topIssues.map((issue) => (
              <div
                key={issue.rank}
                className={`p-3 rounded-lg border ${
                  PRIORITY_COLORS[issue.priority as keyof typeof PRIORITY_COLORS] ||
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">
                    {issue.rank}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {PRIORITY_ICONS[issue.priority as keyof typeof PRIORITY_ICONS]}
                      <h4 className="font-semibold text-gray-900">
                        {issue.title}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{issue.summary}</p>
                    {issue.sourceArticles.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        관련: {issue.sourceArticles.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            오늘 분석된 핵심 이슈가 없습니다
          </p>
        )}

        {/* 실무 시사점 */}
        {report.insightsText && (
          <div className="p-3 rounded-lg bg-purple-100/50 border border-purple-200">
            <p className="text-sm font-medium text-purple-800 mb-1">
              실무 시사점
            </p>
            <p className="text-sm text-purple-700">{report.insightsText}</p>
          </div>
        )}

        {/* 통계 */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t">
          <span>총 {report.articleCount}건 수집 / {report.filteredCount}건 분석</span>
          <span>AI 자동 생성</span>
        </div>
      </CardContent>
    </Card>
  )
}
