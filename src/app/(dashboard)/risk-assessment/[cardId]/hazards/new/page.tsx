'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  HAZARD_CATEGORY_LABELS, SEVERITY_OPTIONS, LIKELIHOOD_OPTIONS, calcRiskScore, getRiskLevel,
  ADDITIONAL_SCORE_CONFIG,
} from '@/lib/risk-assessment'
import { cn } from '@/lib/utils'

const CATEGORIES = ['ACCIDENT', 'MUSCULOSKELETAL', 'CHEMICAL', 'NOISE', 'ABSOLUTE', 'OTHER'] as const

export default function NewHazardPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const router = useRouter()

  const [form, setForm] = useState({
    hazardCategory: 'ACCIDENT',
    hazardFactor: '',
    severityScore: 2,
    likelihoodScore: 2,
    additionalPoints: 0,
    improvementPlan: '',
    chemicalProductId: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))
  const isAbsolute = form.hazardCategory === 'ABSOLUTE'
  const previewScore = calcRiskScore(form.hazardCategory, form.severityScore, form.likelihoodScore, form.additionalPoints)
  const risk = getRiskLevel(previewScore)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/risk-assessment/${cardId}/hazards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        router.push(`/risk-assessment/${cardId}`)
      } else {
        const d = await res.json()
        setError(d.error ?? '저장 중 오류가 발생했습니다.')
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/risk-assessment/${cardId}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">위험요인 추가</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {/* 카테고리 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">위험 유형 <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => set('hazardCategory', cat)}
                className={cn(
                  'py-2 px-3 rounded-lg border text-sm font-medium transition-colors',
                  form.hazardCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {HAZARD_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">{ADDITIONAL_SCORE_CONFIG[form.hazardCategory]?.label}</p>
        </div>

        {/* 유해위험요인 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">유해위험요인 <span className="text-red-500">*</span></label>
          <textarea
            value={form.hazardFactor}
            onChange={(e) => set('hazardFactor', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="위험요인을 구체적으로 입력하세요"
            required
          />
        </div>

        {/* 위험성 점수 */}
        {!isAbsolute && (
          <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">위험성 평가</h3>

            {/* 중대성 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">중대성 (1~5)</label>
              <div className="grid grid-cols-2 gap-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('severityScore', opt.value)}
                    className={cn(
                      'text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                      form.severityScore === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 hover:bg-white'
                    )}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className={cn('text-xs mt-0.5', form.severityScore === opt.value ? 'text-blue-100' : 'text-gray-400')}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 가능성 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">가능성 (1~5)</label>
              <div className="grid grid-cols-2 gap-2">
                {LIKELIHOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('likelihoodScore', opt.value)}
                    className={cn(
                      'text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                      form.likelihoodScore === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 hover:bg-white'
                    )}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className={cn('text-xs mt-0.5', form.likelihoodScore === opt.value ? 'text-blue-100' : 'text-gray-400')}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 가점 */}
            {ADDITIONAL_SCORE_CONFIG[form.hazardCategory]?.max > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  추가 가점 (0~{ADDITIONAL_SCORE_CONFIG[form.hazardCategory].max})
                </label>
                <div className="space-y-2">
                  {ADDITIONAL_SCORE_CONFIG[form.hazardCategory].fields.map((field) => (
                    <label key={field.key} className="flex items-center gap-2 p-2 rounded border hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.additionalPoints > 0}
                        onChange={(e) => {
                          const current = form.additionalPoints
                          const val = e.target.checked ? Math.min(current + 1, ADDITIONAL_SCORE_CONFIG[form.hazardCategory].max) : Math.max(current - 1, 0)
                          set('additionalPoints', val)
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-gray-700">{field.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  {Array.from({ length: ADDITIONAL_SCORE_CONFIG[form.hazardCategory].max + 1 }, (_, i) => i).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set('additionalPoints', p)}
                      className={cn(
                        'w-10 h-10 rounded-lg border text-sm font-bold transition-colors',
                        form.additionalPoints === p
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      +{p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 위험성 미리보기 */}
        <div className={cn('flex items-center gap-3 p-4 rounded-lg', risk.bg)}>
          <div>
            <p className="text-xs font-medium text-gray-600">위험성 점수</p>
            <p className={cn('text-3xl font-bold', risk.color)}>{previewScore}</p>
          </div>
          <div className={cn('px-3 py-1 rounded-full text-sm font-bold', risk.bg, risk.color, 'border border-current border-opacity-30')}>
            {risk.label}
          </div>
          {!isAbsolute && (
            <p className="text-xs text-gray-500 ml-auto">
              {form.severityScore} × {form.likelihoodScore} + {form.additionalPoints}
            </p>
          )}
        </div>

        {/* 개선계획 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">개선 계획 <span className="text-gray-400 text-xs">(선택)</span></label>
          <textarea
            value={form.improvementPlan}
            onChange={(e) => set('improvementPlan', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="개선 방법 및 계획을 입력하세요"
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Link href={`/risk-assessment/${cardId}`} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            취소
          </Link>
          <button type="submit" disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isSubmitting ? '저장 중...' : '위험요인 저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
