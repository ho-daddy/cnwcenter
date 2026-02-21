'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ArrowLeft, Sparkles, FileQuestion, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SurveyTemplateItem } from '@/types/survey'

interface WorkplaceOption {
  id: string
  name: string
}

export default function SurveyCreatePage() {
  const router = useRouter()
  const currentYear = new Date().getFullYear()

  // Form state
  const [title, setTitle] = useState('')
  const [year, setYear] = useState(currentYear)
  const [purpose, setPurpose] = useState('')
  const [workplaceId, setWorkplaceId] = useState('')
  const [templateId, setTemplateId] = useState<string | null>(null)

  // Data state
  const [templates, setTemplates] = useState<SurveyTemplateItem[]>([])
  const [workplaces, setWorkplaces] = useState<WorkplaceOption[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isLoadingWorkplaces, setIsLoadingWorkplaces] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch templates
    fetch('/api/surveys/templates')
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch(() => {})
      .finally(() => setIsLoadingTemplates(false))

    // Fetch workplaces
    fetch('/api/workplaces')
      .then((res) => res.json())
      .then((data) => setWorkplaces(data.workplaces ?? data ?? []))
      .catch(() => {})
      .finally(() => setIsLoadingWorkplaces(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('설문 제목을 입력해주세요.')
      return
    }
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          year,
          purpose: purpose.trim() || null,
          workplaceId: workplaceId || null,
          templateId: templateId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '설문 생성에 실패했습니다.')
      }

      const data = await res.json()
      router.push(`/survey/${data.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '설문 생성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/survey')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-blue-600" />
          새 설문 만들기
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">템플릿 선택</h2>
          {isLoadingTemplates ? (
            <div className="text-sm text-gray-400 py-4 text-center">템플릿 로딩 중...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Empty survey option */}
              <button
                type="button"
                onClick={() => setTemplateId(null)}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                  templateId === null
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                  <FileQuestion className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">빈 설문</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    처음부터 직접 설문을 구성합니다.
                  </p>
                </div>
              </button>

              {/* Template options */}
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplateId(tpl.id)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                    templateId === tpl.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tpl.name}</p>
                    {tpl.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                    )}
                    {tpl.isDefault && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded font-medium">
                        기본
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">설문 정보</h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설문 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026년 안전보건 의식조사"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">조사 연도</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={currentYear - 5}
              max={currentYear + 5}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설문 목적</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="예: 사업장 안전보건 인식도 파악"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Workplace */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업장 <span className="text-xs text-gray-400">(선택)</span>
            </label>
            {isLoadingWorkplaces ? (
              <div className="text-sm text-gray-400">로딩 중...</div>
            ) : (
              <select
                value={workplaceId}
                onChange={(e) => setWorkplaceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">사업장 선택 (전체 대상)</option>
                {workplaces.map((wp) => (
                  <option key={wp.id} value={wp.id}>
                    {wp.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/survey')}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            설문 생성
          </button>
        </div>
      </form>
    </div>
  )
}
