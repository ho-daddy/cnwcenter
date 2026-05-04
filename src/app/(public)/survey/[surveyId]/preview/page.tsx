'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { evaluateConditions } from '@/lib/survey/conditional-logic'
import type { SurveySectionDetail, SurveyQuestionDetail, ConditionalLogic, QuestionOption, RangeOptions, TableOptions, RankedChoiceOptions, TextOptions, NumberOptions } from '@/types/survey'
import { ChevronLeft, ChevronRight, Send, Loader2, Eye, ArrowLeft } from 'lucide-react'

interface SurveyData {
  id: string
  title: string
  description: string | null
  sections: SurveySectionDetail[]
  workplace: { id: string; name: string } | null
}

export default function SurveyPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string

  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/surveys/${surveyId}`)
        if (res.status === 401) {
          setError('로그인이 필요합니다.')
          return
        }
        if (!res.ok) {
          setError('설문을 불러오는 중 오류가 발생했습니다.')
          return
        }
        const data = await res.json()
        setSurvey(data)
      } catch {
        setError('네트워크 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    })()
  }, [surveyId])

  const setAnswer = useCallback((questionCode: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [questionCode]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[questionCode]; return n })
  }, [])

  const getVisibleQuestions = useCallback((section: SurveySectionDetail): SurveyQuestionDetail[] => {
    return section.questions.filter(q =>
      evaluateConditions(q.conditionalLogic as ConditionalLogic | null, answers)
    )
  }, [answers])

  const validateCurrentStep = useCallback((): boolean => {
    if (!survey) return false
    const section = survey.sections[currentStep]
    const visible = getVisibleQuestions(section)
    const newErrors: Record<string, string> = {}

    for (const q of visible) {
      if (!q.required) continue
      const code = q.questionCode || q.id
      const val = answers[code]
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        newErrors[code] = '필수 항목입니다.'
      }
      if (q.questionType === 'CONSENT' && val !== true) {
        newErrors[code] = '동의가 필요합니다.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [survey, currentStep, answers, getVisibleQuestions])

  const handleNext = () => {
    if (!validateCurrentStep()) return
    if (survey && currentStep < survey.sections.length - 1) {
      setCurrentStep(s => s + 1)
      window.scrollTo(0, 0)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleSubmitPreview = () => {
    if (!validateCurrentStep()) return
    alert('미리보기 모드입니다.\n실제 제출은 설문을 발행한 후 공유 링크를 통해서만 가능합니다.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-3">
          <p className="text-lg text-gray-600">{error || '설문을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 mx-auto px-4 py-2 text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const totalSteps = survey.sections.length
  const section = survey.sections[currentStep]
  const visibleQuestions = getVisibleQuestions(section)
  const isLastStep = currentStep === totalSteps - 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview banner */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 bg-amber-400 text-amber-900 text-sm font-medium shadow">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          미리보기 모드 — 실제 응답자에게 표시되는 화면입니다. 제출은 동작하지 않습니다.
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          편집으로 돌아가기
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-900">{survey.title}</h1>
          {survey.workplace && (
            <p className="text-sm text-gray-500 mt-1">{survey.workplace.name}</p>
          )}
          {survey.description && (
            <p className="text-sm text-gray-600 mt-2">{survey.description}</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{section.title}</span>
            <span>{currentStep + 1} / {totalSteps}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Section description */}
        {section.description && (
          <p className="text-sm text-gray-600 mb-4 bg-blue-50 rounded-lg p-3">{section.description}</p>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {visibleQuestions.map(q => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.questionCode || q.id]}
              error={errors[q.questionCode || q.id]}
              onChange={(val) => setAnswer(q.questionCode || q.id, val)}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between">
          <button onClick={handlePrev} disabled={currentStep === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" /> 이전
          </button>
          {isLastStep ? (
            <button onClick={handleSubmitPreview}
              className="flex items-center gap-1 px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 opacity-75">
              <Send className="w-4 h-4" />
              제출 (미리보기)
            </button>
          ) : (
            <button onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Question Field Renderer ───

function QuestionField({
  question: q, value, error, onChange,
}: {
  question: SurveyQuestionDetail
  value: unknown
  error?: string
  onChange: (val: unknown) => void
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-800">
        {q.questionText}
        {q.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {q.questionType === 'CONSENT' && <ConsentField value={value as boolean} onChange={onChange} />}
      {q.questionType === 'TEXT' && <TextField options={q.options as TextOptions} value={value as string} onChange={onChange} />}
      {q.questionType === 'NUMBER' && <NumberField options={q.options as NumberOptions} value={value as number} onChange={onChange} />}
      {q.questionType === 'RADIO' && <RadioField questionCode={q.questionCode || q.id} options={q.options as QuestionOption[]} value={value as string} onChange={onChange} />}
      {q.questionType === 'CHECKBOX' && <CheckboxField options={q.options as QuestionOption[]} value={value as string[]} onChange={onChange} />}
      {q.questionType === 'DROPDOWN' && <DropdownField options={q.options as QuestionOption[]} value={value as string} onChange={onChange} />}
      {q.questionType === 'RANGE' && <RangeField options={q.options as RangeOptions} value={value as number} onChange={onChange} />}
      {q.questionType === 'TABLE' && <TableField options={q.options as TableOptions} value={value as Record<string, string>[]} onChange={onChange} />}
      {q.questionType === 'RANKED_CHOICE' && <RankedChoiceField options={q.options as RankedChoiceOptions} value={value as string[]} onChange={onChange} />}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function ConsentField({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600" />
      <span className="text-sm text-gray-700">동의함</span>
    </label>
  )
}

function TextField({ options, value, onChange }: { options: TextOptions | null; value: string; onChange: (v: string) => void }) {
  const opts = options || {}
  if (opts.multiline) {
    return <textarea value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={opts.placeholder} rows={3}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
  }
  return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
    placeholder={opts.placeholder}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
}

function NumberField({ options, value, onChange }: { options: NumberOptions | null; value: number; onChange: (v: number | string) => void }) {
  const opts = options || {}
  return (
    <div className="flex items-center gap-2">
      <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        min={opts.min} max={opts.max} placeholder={opts.placeholder}
        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      {opts.unit && <span className="text-sm text-gray-500">{opts.unit}</span>}
    </div>
  )
}

function RadioField({ questionCode, options, value, onChange }: { questionCode: string; options: QuestionOption[]; value: string; onChange: (v: string) => void }) {
  if (!Array.isArray(options)) return null
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
          <input type="radio" name={`radio-${questionCode}`} checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="w-4 h-4 text-blue-600 border-gray-300" />
          <span className="text-sm text-gray-700">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

function CheckboxField({ options, value, onChange }: { options: QuestionOption[]; value: string[]; onChange: (v: string[]) => void }) {
  if (!Array.isArray(options)) return null
  const current = Array.isArray(value) ? value : []
  const toggle = (val: string) => {
    if (current.includes(val)) onChange(current.filter(v => v !== val))
    else onChange([...current, val])
  }
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
          <input type="checkbox" checked={current.includes(opt.value)} onChange={() => toggle(opt.value)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          <span className="text-sm text-gray-700">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

function DropdownField({ options, value, onChange }: { options: QuestionOption[]; value: string; onChange: (v: string) => void }) {
  if (!Array.isArray(options)) return null
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="">선택하세요</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

function RangeField({ options, value, onChange }: { options: RangeOptions; value: number; onChange: (v: number) => void }) {
  const opts = options || { min: 0, max: 100, step: 1 }
  const current = value ?? opts.min
  return (
    <div className="space-y-2">
      <input type="range" min={opts.min} max={opts.max} step={opts.step}
        value={current} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-600" />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{opts.min}{opts.unit || ''}</span>
        <span className="text-sm font-medium text-blue-600">{current}{opts.unit || ''}</span>
        <span>{opts.max}{opts.unit || ''}</span>
      </div>
    </div>
  )
}

function TableField({ options, value, onChange }: { options: TableOptions; value: Record<string, string>[]; onChange: (v: Record<string, string>[]) => void }) {
  const opts = options || { columns: [], rowCount: 1 }
  const rows: Record<string, string>[] = Array.isArray(value) && value.length > 0 ? value : Array.from({ length: opts.rowCount }, () => ({} as Record<string, string>))

  const updateCell = (rowIdx: number, colKey: string, val: string) => {
    const newRows = rows.map((r, i) => i === rowIdx ? { ...r, [colKey]: val } : r)
    onChange(newRows)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1.5 border-b border-r border-gray-200 text-left text-xs text-gray-600 w-8">#</th>
            {opts.columns.map(col => (
              <th key={col.key} className="px-2 py-1.5 border-b border-r border-gray-200 text-left text-xs text-gray-600">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="px-2 py-1 border-b border-r border-gray-200 text-gray-400 text-xs">{ri + 1}</td>
              {opts.columns.map(col => (
                <td key={col.key} className="px-1 py-1 border-b border-r border-gray-200">
                  <input type="text" value={row[col.key] || ''} onChange={e => updateCell(ri, col.key, e.target.value)}
                    className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RankedChoiceField({ options, value, onChange }: { options: RankedChoiceOptions; value: string[]; onChange: (v: string[]) => void }) {
  const opts = options || { choices: [], rankCount: 3 }
  const current = Array.isArray(value) ? value : Array(opts.rankCount).fill('')

  const setRank = (index: number, val: string) => {
    const newRanks = [...current]
    const existingIdx = newRanks.indexOf(val)
    if (existingIdx !== -1 && existingIdx !== index) newRanks[existingIdx] = ''
    newRanks[index] = val
    onChange(newRanks)
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: opts.rankCount }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-sm text-gray-500 w-6 text-right">{i + 1}순위</span>
          <select value={current[i] || ''} onChange={e => setRank(i, e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">선택하세요</option>
            {opts.choices.map(ch => (
              <option key={ch.value} value={ch.value} disabled={current.includes(ch.value) && current[i] !== ch.value}>
                {ch.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
