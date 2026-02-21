'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, BarChart3, FileText, Users, CheckCircle,
  Loader2, Download, ChevronDown, ChevronRight, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUESTION_TYPE_LABELS } from '@/lib/survey/constants'
import type {
  SurveyAnalytics, QuestionStats, CombinedTenureStat,
  BodyPartAssessmentSummary, AssessmentLevel,
} from '@/types/survey'

interface SurveyMeta {
  id: string
  title: string
}

const LEVEL_COLORS: Record<AssessmentLevel, { bg: string; text: string; bar: string }> = {
  '정상': { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
  '관리대상자': { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' },
  '통증호소자': { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
}

export default function SurveyAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string

  const [survey, setSurvey] = useState<SurveyMeta | null>(null)
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingAssessment, setIsExportingAssessment] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [surveyRes, analyticsRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}`),
        fetch(`/api/surveys/${surveyId}/analytics`),
      ])
      if (surveyRes.ok) {
        const data = await surveyRes.json()
        setSurvey({ id: data.id, title: data.title })
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalytics(data)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [surveyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleCollapse = (key: string) => {
    setCollapsedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const downloadExcel = async (url: string, fallbackName: string, setLoading: (v: boolean) => void) => {
    setLoading(true)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('내보내기 실패')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : fallbackName
      a.href = blobUrl
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      alert('Excel 내보내기에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const completionRate =
    analytics && analytics.totalResponses > 0
      ? Math.round((analytics.completedResponses / analytics.totalResponses) * 100)
      : 0

  const hiddenSet = new Set(analytics?.hiddenQuestionIds ?? [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        분석 데이터 로딩 중...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/survey/${surveyId}/edit`)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              {survey?.title ?? '설문'} &mdash; 분석
            </h1>
          </div>
        </div>
        <button
          disabled={isExporting || !analytics || analytics.totalResponses === 0}
          onClick={() => downloadExcel(
            `/api/surveys/${surveyId}/analytics/export`,
            '설문_응답데이터.xlsx',
            setIsExporting,
          )}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            isExporting || !analytics || analytics.totalResponses === 0
              ? 'text-gray-400 border border-gray-200 cursor-not-allowed'
              : 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
          )}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Excel 내보내기
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 응답수</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics?.totalResponses ?? 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">완료 응답</p>
              <p className="text-3xl font-bold text-green-600">
                {analytics?.completedResponses ?? 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">완료율</p>
              <p className="text-3xl font-bold text-purple-600">{completionRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Combined Tenure Stats */}
      {analytics?.combinedStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.combinedStats.tenure && (
            <TenureStatsCard stat={analytics.combinedStats.tenure} />
          )}
          {analytics.combinedStats.deptTenure && (
            <TenureStatsCard stat={analytics.combinedStats.deptTenure} />
          )}
        </div>
      )}

      {/* Body Part Assessment */}
      {analytics?.bodyPartAssessment && analytics.bodyPartAssessment.respondentCount > 0 && (
        <BodyPartAssessmentSection
          assessment={analytics.bodyPartAssessment}
          surveyId={surveyId}
          isExporting={isExportingAssessment}
          onExport={() => downloadExcel(
            `/api/surveys/${surveyId}/analytics/export-assessment`,
            '근골격계_판정결과.xlsx',
            setIsExportingAssessment,
          )}
        />
      )}

      {/* Per-question stats (숨김 질문 제외) */}
      {analytics && Object.keys(analytics.questionStats).length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">질문별 분석</h2>
          {Object.entries(analytics.questionStats)
            .filter(([key]) => !hiddenSet.has(key))
            .map(([key, stat]) => (
              <QuestionStatsCard
                key={key}
                statKey={key}
                stat={stat}
                isCollapsed={collapsedQuestions.has(key)}
                onToggle={() => toggleCollapse(key)}
              />
            ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 py-16 text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">분석할 응답 데이터가 없습니다.</p>
        </div>
      )}
    </div>
  )
}

// ─── Combined Tenure Stats Card ───
function TenureStatsCard({ stat }: { stat: CombinedTenureStat }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">
        {stat.label} <span className="text-xs font-normal text-gray-400">({stat.count}명)</span>
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">최소</p>
          <p className="text-sm font-bold text-gray-900">{stat.min}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">최대</p>
          <p className="text-sm font-bold text-gray-900">{stat.max}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-blue-600 mb-0.5">평균</p>
          <p className="text-sm font-bold text-blue-700">{stat.avg}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-purple-600 mb-0.5">중앙값</p>
          <p className="text-sm font-bold text-purple-700">{stat.median}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Body Part Assessment Section ───
function BodyPartAssessmentSection({
  assessment,
  surveyId,
  isExporting,
  onExport,
}: {
  assessment: BodyPartAssessmentSummary
  surveyId: string
  isExporting: boolean
  onExport: () => void
}) {
  const levels: AssessmentLevel[] = ['정상', '관리대상자', '통증호소자']
  const total = assessment.respondentCount

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-bold text-gray-900">근골격계 부위별 판정 현황</h2>
          <span className="text-xs text-gray-400">({total}명 대상)</span>
        </div>
        <button
          disabled={isExporting}
          onClick={onExport}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
            isExporting
              ? 'text-gray-400 border border-gray-200 cursor-not-allowed'
              : 'text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100'
          )}
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          판정결과 Excel
        </button>
      </div>

      <div className="p-4">
        {/* 종합 판정 요약 */}
        <div className="flex gap-3 mb-5">
          {levels.map((level) => {
            const count = assessment.totalSummary[level] ?? 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            const colors = LEVEL_COLORS[level]
            return (
              <div key={level} className={cn('flex-1 rounded-lg p-3 text-center', colors.bg)}>
                <p className={cn('text-xs font-medium mb-0.5', colors.text)}>{level}</p>
                <p className={cn('text-2xl font-bold', colors.text)}>{count}</p>
                <p className="text-xs text-gray-400">{pct}%</p>
              </div>
            )
          })}
        </div>

        {/* 부위별 테이블 */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 w-36">부위</th>
                {levels.map((level) => (
                  <th key={level} className="text-center py-2 px-3 text-xs font-semibold text-gray-500">
                    {level}
                  </th>
                ))}
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 w-48">분포</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(assessment.summary).map(([bodyPart, counts]) => (
                <tr key={bodyPart} className="border-b border-gray-100">
                  <td className="py-2.5 px-3 font-medium text-gray-900">{bodyPart}</td>
                  {levels.map((level) => {
                    const count = counts[level] ?? 0
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    const colors = LEVEL_COLORS[level]
                    return (
                      <td key={level} className="text-center py-2.5 px-3">
                        <span className={cn(
                          'inline-block px-2 py-0.5 rounded text-xs font-medium',
                          count > 0 ? colors.bg + ' ' + colors.text : 'text-gray-300'
                        )}>
                          {count} ({pct}%)
                        </span>
                      </td>
                    )
                  })}
                  <td className="py-2.5 px-3">
                    <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                      {levels.map((level) => {
                        const count = counts[level] ?? 0
                        const pct = total > 0 ? (count / total) * 100 : 0
                        if (pct === 0) return null
                        return (
                          <div
                            key={level}
                            className={cn('h-full', LEVEL_COLORS[level].bar)}
                            style={{ width: `${pct}%` }}
                            title={`${level}: ${count}명 (${Math.round(pct)}%)`}
                          />
                        )
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 판정 기준 안내 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-[11px] font-semibold text-gray-500 mb-1">판정 기준</p>
          <div className="text-[11px] text-gray-400 space-y-0.5">
            <p><span className="font-medium text-yellow-600">관리대상자</span>: 아픈 정도 &apos;중간&apos; + (지속기간 1주일 이상 또는 빈도 월 1회 이상)</p>
            <p><span className="font-medium text-red-600">통증호소자</span>: 아픈 정도 &apos;매우 심함&apos; + 지속기간 1주일 이상 + 빈도 월 1회 이상</p>
            <p><span className="font-medium text-green-600">정상</span>: 위 조건에 해당하지 않는 경우</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Question Stats Card ───
function QuestionStatsCard({
  statKey,
  stat,
  isCollapsed,
  onToggle,
}: {
  statKey: string
  stat: QuestionStats
  isCollapsed: boolean
  onToggle: () => void
}) {
  const typeLabel =
    QUESTION_TYPE_LABELS[stat.questionType as keyof typeof QUESTION_TYPE_LABELS] ??
    stat.questionType

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {stat.questionCode && (
              <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded font-mono shrink-0">
                {stat.questionCode}
              </span>
            )}
            <span className="text-xs text-gray-400 shrink-0">[{typeLabel}]</span>
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{stat.questionText}</p>
        </div>
        <span className="text-xs text-gray-400 shrink-0">{stat.responseCount}건 응답</span>
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <QuestionStatsContent stat={stat} />
        </div>
      )}
    </div>
  )
}

// ─── Stats content renderer per question type ───
function QuestionStatsContent({ stat }: { stat: QuestionStats }) {
  const data = stat.data

  if (data === null || data === undefined) {
    if (stat.questionType === 'TABLE') {
      return (
        <div className="text-sm text-gray-500">
          <p>표 형태 응답 {stat.responseCount}건이 수집되었습니다.</p>
          <p className="text-xs text-gray-400 mt-1">상세 분석은 응답 목록에서 개별 확인하세요.</p>
        </div>
      )
    }
    return <div className="text-sm text-gray-400">응답 데이터가 없습니다.</div>
  }

  // RADIO / DROPDOWN / CHECKBOX
  if (['RADIO', 'DROPDOWN', 'CHECKBOX'].includes(stat.questionType)) {
    const entries = Object.entries(data as Record<string, number>).sort(([, a], [, b]) => b - a)
    const maxCount = Math.max(...entries.map(([, v]) => v), 1)
    const totalAnswers = entries.reduce((s, [, v]) => s + v, 0)

    return (
      <div className="space-y-2">
        {entries.map(([label, count]) => {
          const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0
          const barWidth = Math.max((count / maxCount) * 100, 2)
          return (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-gray-700 w-40 truncate shrink-0" title={label}>{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                <div className="bg-blue-500 h-5 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-gray-700">
                  {count}건 ({pct}%)
                </span>
              </div>
            </div>
          )
        })}
        {entries.length === 0 && <p className="text-sm text-gray-400">응답 데이터가 없습니다.</p>}
      </div>
    )
  }

  // NUMBER / RANGE
  if (['NUMBER', 'RANGE'].includes(stat.questionType)) {
    const numData = data as { min?: number | null; max?: number | null; avg?: number | null; median?: number | null }
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">최솟값</p>
          <p className="text-lg font-bold text-gray-900">{numData.min ?? '-'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">최댓값</p>
          <p className="text-lg font-bold text-gray-900">{numData.max ?? '-'}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-blue-600 uppercase tracking-wide mb-0.5">평균</p>
          <p className="text-lg font-bold text-blue-700">{numData.avg != null ? numData.avg.toFixed(1) : '-'}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-purple-600 uppercase tracking-wide mb-0.5">중앙값</p>
          <p className="text-lg font-bold text-purple-700">{numData.median != null ? numData.median.toFixed(1) : '-'}</p>
        </div>
      </div>
    )
  }

  // TEXT
  if (stat.questionType === 'TEXT') {
    const textData = data as Record<string, number>
    const entries = Object.entries(textData).sort(([, a], [, b]) => b - a)
    return (
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">텍스트 응답이 없습니다.</p>
        ) : (
          entries.map(([text, count], idx) => (
            <div key={idx} className="flex items-start gap-2 px-3 py-2 bg-gray-50 rounded text-sm">
              <span className="flex-1 text-gray-700">{text}</span>
              {count > 1 && <span className="text-xs text-gray-400 shrink-0">x{count}</span>}
            </div>
          ))
        )}
      </div>
    )
  }

  // RANKED_CHOICE
  if (stat.questionType === 'RANKED_CHOICE') {
    const rankData = data as Record<string, number>
    const entries = Object.entries(rankData).sort(([, a], [, b]) => b - a)
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">순위</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">항목</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">가중 점수</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([label, score], idx) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-2 px-3 text-gray-500 font-medium">{idx + 1}</td>
                <td className="py-2 px-3 text-gray-900">{label}</td>
                <td className="py-2 px-3 text-right font-medium text-blue-600">{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">순위 데이터가 없습니다.</p>}
      </div>
    )
  }

  // CONSENT
  if (stat.questionType === 'CONSENT') {
    const consentData = data as Record<string, number>
    const entries = Object.entries(consentData)
    const total = entries.reduce((s, [, v]) => s + v, 0)
    return (
      <div className="flex items-center gap-4">
        {entries.map(([label, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const isAgree = label === 'true' || label === '동의'
          return (
            <div key={label} className={cn('flex-1 rounded-lg p-3 text-center', isAgree ? 'bg-green-50' : 'bg-red-50')}>
              <p className={cn('text-xs font-medium mb-0.5', isAgree ? 'text-green-600' : 'text-red-600')}>
                {isAgree ? '동의' : '미동의'}
              </p>
              <p className={cn('text-xl font-bold', isAgree ? 'text-green-700' : 'text-red-700')}>{count}</p>
              <p className="text-xs text-gray-400">{pct}%</p>
            </div>
          )
        })}
        {entries.length === 0 && <p className="text-sm text-gray-400 w-full text-center">응답 데이터가 없습니다.</p>}
      </div>
    )
  }

  // TABLE
  if (stat.questionType === 'TABLE') {
    return (
      <div className="text-sm text-gray-500">
        <p>표 형태 응답 {stat.responseCount}건이 수집되었습니다.</p>
        <p className="text-xs text-gray-400 mt-1">상세 분석은 응답 목록에서 개별 확인하세요.</p>
      </div>
    )
  }

  return <div className="text-sm text-gray-400">이 질문 유형의 분석을 표시할 수 없습니다.</div>
}
