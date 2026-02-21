'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  FileText, Plus, BarChart3, Send, Archive,
  Pencil, Trash2, Copy, X, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SURVEY_STATUS_LABELS, SURVEY_STATUS_COLORS } from '@/lib/survey/constants'
import type { SurveyListItem } from '@/types/survey'

type StatusFilter = '' | 'DRAFT' | 'PUBLISHED' | 'CLOSED'

interface WorkplaceOption {
  id: string
  name: string
}

export default function SurveyListPage() {
  const router = useRouter()
  const currentYear = new Date().getFullYear()
  const [surveys, setSurveys] = useState<SurveyListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [year, setYear] = useState(currentYear)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')

  // 복제 모달
  const [duplicateTarget, setDuplicateTarget] = useState<SurveyListItem | null>(null)
  const [dupTitle, setDupTitle] = useState('')
  const [dupYear, setDupYear] = useState(currentYear)
  const [dupPurpose, setDupPurpose] = useState('')
  const [dupWorkplaceId, setDupWorkplaceId] = useState('')
  const [workplaces, setWorkplaces] = useState<WorkplaceOption[]>([])
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [dupError, setDupError] = useState('')

  // Stats
  const totalCount = surveys.length
  const publishedCount = surveys.filter((s) => s.status === 'PUBLISHED').length
  const totalResponses = surveys.reduce((sum, s) => sum + (s._count?.responses ?? 0), 0)

  const fetchSurveys = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('year', String(year))
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/surveys?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSurveys(Array.isArray(data) ? data : data.surveys ?? [])
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [year, statusFilter])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  // 사업장 목록은 복제 모달이 열릴 때 한 번만 로드
  useEffect(() => {
    if (duplicateTarget && workplaces.length === 0) {
      fetch('/api/workplaces')
        .then((res) => res.json())
        .then((data) => setWorkplaces(Array.isArray(data) ? data : data.workplaces ?? []))
        .catch(() => {})
    }
  }, [duplicateTarget, workplaces.length])

  const handleDelete = async (e: React.MouseEvent, survey: SurveyListItem) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`"${survey.title}" 설문을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return

    try {
      const res = await fetch(`/api/surveys/${survey.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchSurveys()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch {
      alert('삭제에 실패했습니다.')
    }
  }

  const openDuplicateModal = (e: React.MouseEvent, survey: SurveyListItem) => {
    e.preventDefault()
    e.stopPropagation()
    setDuplicateTarget(survey)
    setDupTitle(`${survey.title} (복사본)`)
    setDupYear(currentYear)
    setDupPurpose(survey.purpose || '')
    setDupWorkplaceId(survey.workplace?.id || '')
    setDupError('')
  }

  const closeDuplicateModal = () => {
    setDuplicateTarget(null)
    setDupError('')
  }

  const handleDuplicate = async () => {
    if (!duplicateTarget) return
    if (!dupTitle.trim()) {
      setDupError('제목을 입력해주세요.')
      return
    }
    setIsDuplicating(true)
    setDupError('')

    try {
      const res = await fetch(`/api/surveys/${duplicateTarget.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dupTitle.trim(),
          year: dupYear,
          purpose: dupPurpose.trim() || null,
          workplaceId: dupWorkplaceId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '복제에 실패했습니다.')
      }

      const data = await res.json()
      closeDuplicateModal()
      router.push(`/survey/${data.id}/edit`)
    } catch (err) {
      setDupError(err instanceof Error ? err.message : '복제에 실패했습니다.')
    } finally {
      setIsDuplicating(false)
    }
  }

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
            const isDraft = survey.status === 'DRAFT'
            return (
              <div
                key={survey.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/survey/${survey.id}/edit`} className="flex-1 min-w-0">
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
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* 응답 수 */}
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-500 mr-2">
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                      {survey._count?.responses ?? 0}
                    </div>

                    {/* 편집 */}
                    <Link
                      href={`/survey/${survey.id}/edit`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="편집"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>

                    {/* 복제 */}
                    <button
                      onClick={(e) => openDuplicateModal(e, survey)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      title="복제"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* 삭제 (DRAFT만) */}
                    {isDraft && (
                      <button
                        onClick={(e) => handleDelete(e, survey)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 복제 모달 */}
      {duplicateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeDuplicateModal}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">설문 복제</h2>
              <button onClick={closeDuplicateModal} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              원본: {duplicateTarget.title}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설문 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dupTitle}
                  onChange={(e) => setDupTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">조사 연도</label>
                  <input
                    type="number"
                    value={dupYear}
                    onChange={(e) => setDupYear(Number(e.target.value))}
                    min={currentYear - 5}
                    max={currentYear + 5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사업장</label>
                  <select
                    value={dupWorkplaceId}
                    onChange={(e) => setDupWorkplaceId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택 안 함</option>
                    {workplaces.map((wp) => (
                      <option key={wp.id} value={wp.id}>
                        {wp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설문 목적</label>
                <input
                  type="text"
                  value={dupPurpose}
                  onChange={(e) => setDupPurpose(e.target.value)}
                  placeholder="예: 사업장 안전보건 인식도 파악"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {dupError && (
              <p className="text-sm text-red-600 mt-3">{dupError}</p>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={closeDuplicateModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDuplicate}
                disabled={isDuplicating || !dupTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDuplicating && <Loader2 className="w-4 h-4 animate-spin" />}
                복제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
