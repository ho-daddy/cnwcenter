'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FileText, Plus, BarChart3, Send, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SURVEY_STATUS_LABELS, SURVEY_STATUS_COLORS } from '@/lib/survey/constants'
import type { SurveyListItem } from '@/types/survey'

type StatusFilter = '' | 'DRAFT' | 'PUBLISHED' | 'CLOSED'

export default function SurveyListPage() {
  const currentYear = new Date().getFullYear()
  const [surveys, setSurveys] = useState<SurveyListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [year, setYear] = useState(currentYear)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')

  // Stats
  const totalCount = surveys.length
  const publishedCount = surveys.filter((s) => s.status === 'PUBLISHED').length
  const totalResponses = surveys.reduce((sum, s) => sum + (s._count?.responses ?? 0), 0)

  const fetchSurveys = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('year', String(year))
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/surveys?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSurveys(data.surveys ?? [])
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSurveys()
  }, [year, statusFilter])

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const statusFilters: { key: StatusFilter; label: string; icon: React.ReactNode }[] = [
    { key: '', label: '전체', icon: null },
    { key: 'DRAFT', label: '작성중', icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'PUBLISHED', label: '배포중', icon: <Send className="w-3.5 h-3.5" /> },
    { key: 'CLOSED', label: '마감', icon: <Archive className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-blue-600" />
          설문조사
        </h1>
        <Link
          href="/survey/create"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 설문
        </Link>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Year dropdown */}
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>

        {/* Status filter buttons */}
        <div className="flex items-center gap-2">
          {statusFilters.map((sf) => (
            <button
              key={sf.key}
              onClick={() => setStatusFilter(sf.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                statusFilter === sf.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {sf.icon}
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">전체 설문</p>
              <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">배포중</p>
              <p className="text-3xl font-bold text-green-600">{publishedCount}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Send className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 응답수</p>
              <p className="text-3xl font-bold text-purple-600">{totalResponses}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Survey List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 py-16 text-center text-sm text-gray-400">
            로딩 중...
          </div>
        ) : surveys.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 py-16 text-center text-sm text-gray-400">
            {statusFilter ? '해당 조건의 설문이 없습니다.' : '등록된 설문이 없습니다.'}
          </div>
        ) : (
          surveys.map((survey) => {
            const colors = SURVEY_STATUS_COLORS[survey.status]
            const statusLabel = SURVEY_STATUS_LABELS[survey.status]
            return (
              <Link
                key={survey.id}
                href={`/survey/${survey.id}/edit`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {survey.title}
                      </h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-full font-medium shrink-0',
                          colors.bg,
                          colors.text
                        )}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{survey.year}년</span>
                      {survey.workplace && <span>· {survey.workplace.name}</span>}
                      {survey.purpose && <span>· {survey.purpose}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                      {survey._count?.responses ?? 0}건 응답
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(survey.createdAt), 'yyyy.MM.dd', { locale: ko })}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
