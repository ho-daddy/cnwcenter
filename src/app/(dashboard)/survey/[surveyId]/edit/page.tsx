'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Send, Lock, Share2, Plus, Trash2,
  ChevronDown, ChevronRight, ChevronUp, GripVertical,
  Type, Hash, CircleDot, CheckSquare, SlidersHorizontal,
  List, Table, ArrowUpDown, ShieldCheck, Loader2, Copy,
  X, Link2, BarChart3, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SURVEY_STATUS_LABELS,
  SURVEY_STATUS_COLORS,
  QUESTION_TYPE_LABELS,
  CONDITION_OPERATOR_LABELS,
} from '@/lib/survey/constants'
import type {
  SurveyDetail,
  SurveySectionDetail,
  SurveyQuestionDetail,
  QuestionOption,
  ConditionalLogic,
  Condition,
} from '@/types/survey'
import { QRCodeSVG } from 'qrcode.react'

// ─── Question type icon map ───
const QUESTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  TEXT: <Type className="w-4 h-4" />,
  NUMBER: <Hash className="w-4 h-4" />,
  RADIO: <CircleDot className="w-4 h-4" />,
  CHECKBOX: <CheckSquare className="w-4 h-4" />,
  RANGE: <SlidersHorizontal className="w-4 h-4" />,
  DROPDOWN: <List className="w-4 h-4" />,
  TABLE: <Table className="w-4 h-4" />,
  RANKED_CHOICE: <ArrowUpDown className="w-4 h-4" />,
  CONSENT: <ShieldCheck className="w-4 h-4" />,
}

const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABELS) as Array<keyof typeof QUESTION_TYPE_LABELS>

// ─── Share Modal ───
function ShareModal({
  surveyId,
  accessToken,
  onClose,
}: {
  surveyId: string
  accessToken: string | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = accessToken
    ? `${baseUrl}/s/${accessToken}`
    : `${baseUrl}/survey/${surveyId}/respond`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-blue-600" />
          설문 공유
        </h2>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <QRCodeSVG value={shareUrl} size={160} />
          </div>
        </div>

        {/* URL */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">공유 링크</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 truncate">
              <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">{shareUrl}</span>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0',
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              {copied ? (
                <>복사됨</>
              ) : (
                <span className="flex items-center gap-1">
                  <Copy className="w-4 h-4" />
                  복사
                </span>
              )}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  )
}

// ─── Options Editor (for RADIO, CHECKBOX, DROPDOWN) ───
function OptionsEditor({
  options,
  onChange,
}: {
  options: QuestionOption[]
  onChange: (opts: QuestionOption[]) => void
}) {
  const handleChange = (idx: number, field: 'value' | 'label', val: string) => {
    const updated = [...options]
    updated[idx] = { ...updated[idx], [field]: val }
    onChange(updated)
  }

  const handleAdd = () => {
    const nextIdx = options.length + 1
    onChange([...options, { value: `option_${nextIdx}`, label: '' }])
  }

  const handleRemove = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600">선택지</label>
      {options.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={opt.value}
            onChange={(e) => handleChange(idx, 'value', e.target.value)}
            placeholder="값"
            className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            value={opt.label}
            onChange={(e) => handleChange(idx, 'label', e.target.value)}
            placeholder="표시 텍스트"
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => handleRemove(idx)}
            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus className="w-3 h-3" />
        선택지 추가
      </button>
    </div>
  )
}

// ─── Conditional Logic Editor ───
function ConditionalLogicEditor({
  conditionalLogic,
  onChange,
  allQuestionCodes,
}: {
  conditionalLogic: ConditionalLogic | null
  onChange: (logic: ConditionalLogic | null) => void
  allQuestionCodes: { id: string; code: string | null; text: string }[]
}) {
  const enabled = conditionalLogic !== null && conditionalLogic.conditions.length > 0
  const logicType = conditionalLogic?.logicType ?? 'AND'
  const conditions = conditionalLogic?.conditions ?? []

  const handleToggle = () => {
    if (enabled) {
      onChange(null)
    } else {
      onChange({ conditions: [{ questionId: '', operator: 'equals', value: '' }], logicType: 'AND' })
    }
  }

  const updateCondition = (idx: number, updates: Partial<Condition>) => {
    const updated = [...conditions]
    updated[idx] = { ...updated[idx], ...updates }
    onChange({ conditions: updated, logicType })
  }

  const addCondition = () => {
    onChange({
      conditions: [...conditions, { questionId: '', operator: 'equals', value: '' }],
      logicType,
    })
  }

  const removeCondition = (idx: number) => {
    const updated = conditions.filter((_, i) => i !== idx)
    if (updated.length === 0) {
      onChange(null)
    } else {
      onChange({ conditions: updated, logicType })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">조건부 표시</label>
        <button
          onClick={handleToggle}
          className={cn(
            'relative w-9 h-5 rounded-full transition-colors',
            enabled ? 'bg-blue-600' : 'bg-gray-300'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
              enabled ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-2 pl-2 border-l-2 border-blue-200">
          {/* Logic type */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">조건 결합:</span>
            <select
              value={logicType}
              onChange={(e) =>
                onChange({ conditions, logicType: e.target.value as 'AND' | 'OR' })
              }
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="AND">모두 충족 (AND)</option>
              <option value="OR">하나라도 충족 (OR)</option>
            </select>
          </div>

          {conditions.map((cond, idx) => (
            <div key={idx} className="flex items-center gap-1.5 flex-wrap">
              <select
                value={cond.questionId}
                onChange={(e) => updateCondition(idx, { questionId: e.target.value })}
                className="flex-1 min-w-[120px] px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">질문 선택</option>
                {allQuestionCodes.map((q) => (
                  <option key={q.id} value={q.code ?? q.id}>
                    {q.code ? `[${q.code}] ` : ''}
                    {q.text.substring(0, 30)}
                  </option>
                ))}
              </select>
              <select
                value={cond.operator}
                onChange={(e) =>
                  updateCondition(idx, { operator: e.target.value as Condition['operator'] })
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {Object.entries(CONDITION_OPERATOR_LABELS).map(([op, label]) => (
                  <option key={op} value={op}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={String(cond.value ?? '')}
                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                placeholder="값"
                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => removeCondition(idx)}
                className="p-1 rounded hover:bg-red-50 text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            onClick={addCondition}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-3 h-3" />
            조건 추가
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───
export default function SurveyEditPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string

  const [survey, setSurvey] = useState<SurveyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  // Section expand state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Selected question for right panel
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false)

  // ─── Data fetching ───
  const fetchSurvey = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/surveys/${surveyId}`)
      if (res.ok) {
        const data = await res.json()
        setSurvey(data)
        setTitleDraft(data.title)
        // Expand all sections by default
        const ids = new Set<string>((data.sections ?? []).map((s: SurveySectionDetail) => s.id))
        setExpandedSections(ids)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [surveyId])

  useEffect(() => {
    fetchSurvey()
  }, [fetchSurvey])

  // ─── Helpers ───
  const allQuestionCodes = (survey?.sections ?? []).flatMap((s) =>
    s.questions.map((q) => ({
      id: q.id,
      code: q.questionCode,
      text: q.questionText,
    }))
  )

  const selectedQuestion = (survey?.sections ?? [])
    .flatMap((s) => s.questions)
    .find((q) => q.id === selectedQuestionId)

  const selectedSection = (survey?.sections ?? []).find((s) =>
    s.questions.some((q) => q.id === selectedQuestionId)
  )

  // ─── Title update ───
  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === survey?.title) {
      setEditingTitle(false)
      return
    }
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleDraft.trim() }),
      })
      if (res.ok) {
        setSurvey((prev) => (prev ? { ...prev, title: titleDraft.trim() } : prev))
      }
    } catch {
      // ignore
    }
    setEditingTitle(false)
  }

  // ─── Section CRUD ───
  const addSection = async () => {
    const sortOrder = (survey?.sections ?? []).length
    try {
      const res = await fetch(`/api/surveys/${surveyId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `섹션 ${sortOrder + 1}`, sortOrder }),
      })
      if (res.ok) {
        await fetchSurvey()
      }
    } catch {
      // ignore
    }
  }

  const deleteSection = async (sectionId: string) => {
    if (!confirm('이 섹션과 포함된 모든 질문을 삭제하시겠습니까?')) return
    try {
      await fetch(`/api/surveys/${surveyId}/sections/${sectionId}`, { method: 'DELETE' })
      await fetchSurvey()
    } catch {
      // ignore
    }
  }

  const updateSectionTitle = async (sectionId: string, title: string) => {
    try {
      await fetch(`/api/surveys/${surveyId}/sections/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      await fetchSurvey()
    } catch {
      // ignore
    }
  }

  // ─── Section reorder ───
  const reorderSection = async (sectionId: string, direction: 'up' | 'down') => {
    const sections = survey?.sections ?? []
    const idx = sections.findIndex((s) => s.id === sectionId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sections.length) return

    const reordered = sections.map((s) => s.id)
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]

    try {
      await fetch(`/api/surveys/${surveyId}/sections/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIds: reordered }),
      })
      await fetchSurvey()
    } catch {
      // ignore
    }
  }

  // ─── Question CRUD ───
  const addQuestion = async (sectionId: string) => {
    const section = (survey?.sections ?? []).find((s) => s.id === sectionId)
    const sortOrder = section?.questions.length ?? 0
    try {
      const res = await fetch(`/api/surveys/${surveyId}/sections/${sectionId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: '새 질문',
          questionType: 'TEXT',
          sortOrder,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        await fetchSurvey()
        setSelectedQuestionId(data.id)
      }
    } catch {
      // ignore
    }
  }

  const deleteQuestion = async (sectionId: string, questionId: string) => {
    if (!confirm('이 질문을 삭제하시겠습니까?')) return
    try {
      await fetch(`/api/surveys/${surveyId}/sections/${sectionId}/questions/${questionId}`, {
        method: 'DELETE',
      })
      if (selectedQuestionId === questionId) setSelectedQuestionId(null)
      await fetchSurvey()
    } catch {
      // ignore
    }
  }

  const updateQuestion = async (
    sectionId: string,
    questionId: string,
    data: Partial<SurveyQuestionDetail>
  ) => {
    setIsSaving(true)
    try {
      await fetch(`/api/surveys/${surveyId}/sections/${sectionId}/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      await fetchSurvey()
    } catch {
      // ignore
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Question reorder ───
  const reorderQuestion = async (sectionId: string, questionId: string, direction: 'up' | 'down') => {
    const section = (survey?.sections ?? []).find((s) => s.id === sectionId)
    if (!section) return
    const questions = section.questions
    const idx = questions.findIndex((q) => q.id === questionId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= questions.length) return

    const reordered = questions.map((q) => q.id)
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]

    try {
      await fetch(`/api/surveys/${surveyId}/sections/${sectionId}/questions/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: reordered }),
      })
      await fetchSurvey()
    } catch {
      // ignore
    }
  }

  // ─── Publish / Close ───
  const handlePublish = async () => {
    if (!confirm('설문을 발행하시겠습니까? 발행 후에는 응답을 받을 수 있습니다.')) return
    try {
      const res = await fetch(`/api/surveys/${surveyId}/publish`, { method: 'POST' })
      if (res.ok) {
        await fetchSurvey()
        setShowShareModal(true)
      }
    } catch {
      // ignore
    }
  }

  const handleClose = async () => {
    if (!confirm('설문을 마감하시겠습니까? 마감 후에는 더 이상 응답을 받을 수 없습니다.')) return
    try {
      const res = await fetch(`/api/surveys/${surveyId}/close`, { method: 'POST' })
      if (res.ok) {
        await fetchSurvey()
      }
    } catch {
      // ignore
    }
  }

  // ─── Toggle section expand ───
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  // ─── Parse options from question ───
  const getQuestionOptions = (q: SurveyQuestionDetail): QuestionOption[] => {
    const opts = q.options as Record<string, unknown> | null
    if (!opts) return []
    if (Array.isArray(opts)) return opts as QuestionOption[]
    if (opts.choices && Array.isArray(opts.choices)) return opts.choices as QuestionOption[]
    if (opts.options && Array.isArray(opts.options)) return opts.options as QuestionOption[]
    return []
  }

  // ─── Render ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        설문 로딩 중...
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="text-center py-32">
        <p className="text-sm text-gray-500 mb-4">설문을 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push('/survey')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  const statusColors = SURVEY_STATUS_COLORS[survey.status]
  const isDraft = survey.status === 'DRAFT'
  const isPublished = survey.status === 'PUBLISHED'

  return (
    <div className="space-y-0">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/survey')}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') {
                    setTitleDraft(survey.title)
                    setEditingTitle(false)
                  }
                }}
                className="text-lg font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent px-1"
              />
            ) : (
              <h1
                onClick={() => {
                  if (isDraft) setEditingTitle(true)
                }}
                className={cn(
                  'text-lg font-bold text-gray-900',
                  isDraft && 'cursor-pointer hover:text-blue-600'
                )}
              >
                {survey.title}
              </h1>
            )}

            <span
              className={cn(
                'px-2 py-0.5 text-xs rounded-full font-medium',
                statusColors.bg,
                statusColors.text
              )}
            >
              {SURVEY_STATUS_LABELS[survey.status]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation links */}
            <button
              onClick={() => router.push(`/survey/${surveyId}/responses`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              응답
              {survey._count?.responses > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {survey._count.responses}
                </span>
              )}
            </button>
            <button
              onClick={() => router.push(`/survey/${surveyId}/analytics`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              분석
            </button>

            {isDraft && (
              <button
                onClick={handlePublish}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                발행
              </button>
            )}
            {isPublished && (
              <>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  공유
                </button>
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  마감
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content: left panel + right panel */}
      <div className="flex gap-6">
        {/* Left panel: Section list */}
        <div className="flex-1 min-w-0 space-y-3">
          {(survey.sections ?? []).length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
              <p className="text-sm text-gray-400 mb-3">아직 섹션이 없습니다.</p>
              <button
                onClick={addSection}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                첫 섹션 추가
              </button>
            </div>
          ) : (
            (survey.sections ?? []).map((section, sIdx) => {
              const isExpanded = expandedSections.has(section.id)
              return (
                <div
                  key={section.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="p-0.5 rounded hover:bg-gray-200"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <input
                      value={section.title}
                      onChange={(e) => {
                        // Optimistic local update
                        setSurvey((prev) => {
                          if (!prev) return prev
                          return {
                            ...prev,
                            sections: prev.sections.map((s) =>
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            ),
                          }
                        })
                      }}
                      onBlur={(e) => updateSectionTitle(section.id, e.target.value)}
                      className="flex-1 text-sm font-semibold text-gray-900 bg-transparent outline-none"
                    />
                    <span className="text-xs text-gray-400 shrink-0">
                      {section.questions.length}개 질문
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => reorderSection(section.id, 'up')}
                        disabled={sIdx === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => reorderSection(section.id, 'down')}
                        disabled={sIdx === (survey.sections ?? []).length - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Questions */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      {section.questions.map((q, qIdx) => (
                        <button
                          key={q.id}
                          onClick={() => setSelectedQuestionId(q.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors',
                            selectedQuestionId === q.id && 'bg-blue-50 border-l-2 border-blue-500'
                          )}
                        >
                          <span className="text-gray-400 shrink-0">
                            {QUESTION_TYPE_ICONS[q.questionType] ?? (
                              <Type className="w-4 h-4" />
                            )}
                          </span>
                          <span className="flex-1 text-sm text-gray-700 truncate">
                            {q.questionText}
                          </span>
                          {q.required && (
                            <span className="text-red-400 text-xs shrink-0">필수</span>
                          )}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                reorderQuestion(section.id, q.id, 'up')
                              }}
                              disabled={qIdx === 0}
                              className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                            >
                              <ChevronUp className="w-3 h-3 text-gray-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                reorderQuestion(section.id, q.id, 'down')
                              }}
                              disabled={qIdx === section.questions.length - 1}
                              className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                            >
                              <ChevronDown className="w-3 h-3 text-gray-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteQuestion(section.id, q.id)
                              }}
                              className="p-0.5 rounded hover:bg-red-50 text-red-300 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </button>
                      ))}

                      {/* Add question button */}
                      <button
                        onClick={() => addQuestion(section.id)}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        질문 추가
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* Add section button */}
          <button
            onClick={addSection}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            섹션 추가
          </button>
        </div>

        {/* Right panel: Question editor */}
        <div className="w-80 shrink-0">
          {selectedQuestion && selectedSection ? (
            <QuestionEditor
              key={selectedQuestion.id}
              question={selectedQuestion}
              sectionId={selectedSection.id}
              surveyId={surveyId}
              allQuestionCodes={allQuestionCodes}
              isSaving={isSaving}
              onSave={(data) => updateQuestion(selectedSection.id, selectedQuestion.id, data)}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <Type className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                질문을 선택하면
                <br />
                여기에서 편집할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          surveyId={surveyId}
          accessToken={survey.accessToken}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}

// ─── Question Editor Component ───
function QuestionEditor({
  question,
  sectionId,
  surveyId,
  allQuestionCodes,
  isSaving,
  onSave,
}: {
  question: SurveyQuestionDetail
  sectionId: string
  surveyId: string
  allQuestionCodes: { id: string; code: string | null; text: string }[]
  isSaving: boolean
  onSave: (data: Partial<SurveyQuestionDetail>) => void
}) {
  const [questionText, setQuestionText] = useState(question.questionText)
  const [questionType, setQuestionType] = useState(question.questionType)
  const [required, setRequired] = useState(question.required)
  const [questionCode, setQuestionCode] = useState(question.questionCode ?? '')
  const [conditionalLogic, setConditionalLogic] = useState<ConditionalLogic | null>(
    question.conditionalLogic
  )

  // Options for RADIO/CHECKBOX/DROPDOWN
  const [choiceOptions, setChoiceOptions] = useState<QuestionOption[]>(() => {
    const opts = question.options as Record<string, unknown> | null
    if (!opts) return []
    if (Array.isArray(opts)) return opts as QuestionOption[]
    if (opts.choices && Array.isArray(opts.choices)) return opts.choices as QuestionOption[]
    if (opts.options && Array.isArray(opts.options)) return opts.options as QuestionOption[]
    return []
  })

  // Range options
  const [rangeMin, setRangeMin] = useState(() => {
    const opts = question.options as Record<string, unknown> | null
    return Number(opts?.min ?? 0)
  })
  const [rangeMax, setRangeMax] = useState(() => {
    const opts = question.options as Record<string, unknown> | null
    return Number(opts?.max ?? 10)
  })
  const [rangeStep, setRangeStep] = useState(() => {
    const opts = question.options as Record<string, unknown> | null
    return Number(opts?.step ?? 1)
  })

  // Table options
  const [tableColumns, setTableColumns] = useState<{ key: string; label: string }[]>(() => {
    const opts = question.options as Record<string, unknown> | null
    return (opts?.columns as { key: string; label: string }[]) ?? []
  })
  const [tableRowCount, setTableRowCount] = useState(() => {
    const opts = question.options as Record<string, unknown> | null
    return Number(opts?.rowCount ?? 3)
  })

  // Ranked choice
  const [rankedChoices, setRankedChoices] = useState<QuestionOption[]>(() => {
    const opts = question.options as Record<string, unknown> | null
    return (opts?.choices as QuestionOption[]) ?? []
  })
  const [rankCount, setRankCount] = useState(() => {
    const opts = question.options as Record<string, unknown> | null
    return Number(opts?.rankCount ?? 3)
  })

  const buildOptions = () => {
    switch (questionType) {
      case 'RADIO':
      case 'CHECKBOX':
      case 'DROPDOWN':
        return { choices: choiceOptions }
      case 'RANGE':
        return { min: rangeMin, max: rangeMax, step: rangeStep }
      case 'TABLE':
        return { columns: tableColumns, rowCount: tableRowCount }
      case 'RANKED_CHOICE':
        return { choices: rankedChoices, rankCount }
      default:
        return null
    }
  }

  const handleSave = () => {
    onSave({
      questionText,
      questionType,
      required,
      questionCode: questionCode.trim() || null,
      options: buildOptions() as unknown,
      conditionalLogic,
    })
  }

  const needsOptions = ['RADIO', 'CHECKBOX', 'DROPDOWN'].includes(questionType)
  const isRange = questionType === 'RANGE'
  const isTable = questionType === 'TABLE'
  const isRankedChoice = questionType === 'RANKED_CHOICE'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 sticky top-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        {QUESTION_TYPE_ICONS[questionType]}
        질문 편집
      </h3>

      {/* Question text */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">질문 텍스트</label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Question type */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">질문 유형</label>
        <select
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value as typeof questionType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {QUESTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {QUESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {/* Required toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">필수 응답</label>
        <button
          onClick={() => setRequired(!required)}
          className={cn(
            'relative w-9 h-5 rounded-full transition-colors',
            required ? 'bg-blue-600' : 'bg-gray-300'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
              required ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      {/* Question code */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          질문 코드 <span className="text-gray-400">(선택)</span>
        </label>
        <input
          type="text"
          value={questionCode}
          onChange={(e) => setQuestionCode(e.target.value)}
          placeholder="예: Q1-1"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Options editor for RADIO/CHECKBOX/DROPDOWN */}
      {needsOptions && <OptionsEditor options={choiceOptions} onChange={setChoiceOptions} />}

      {/* Range options */}
      {isRange && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">범위 설정</label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">최소</label>
              <input
                type="number"
                value={rangeMin}
                onChange={(e) => setRangeMin(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">최대</label>
              <input
                type="number"
                value={rangeMax}
                onChange={(e) => setRangeMax(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">간격</label>
              <input
                type="number"
                value={rangeStep}
                onChange={(e) => setRangeStep(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table options */}
      {isTable && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">표 설정</label>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">행 수</label>
            <input
              type="number"
              value={tableRowCount}
              onChange={(e) => setTableRowCount(Number(e.target.value))}
              min={1}
              max={50}
              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-gray-400">열 정의</label>
              <button
                onClick={() =>
                  setTableColumns([
                    ...tableColumns,
                    { key: `col_${tableColumns.length + 1}`, label: '' },
                  ])
                }
                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
              >
                + 열 추가
              </button>
            </div>
            {tableColumns.map((col, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={col.key}
                  onChange={(e) => {
                    const updated = [...tableColumns]
                    updated[idx] = { ...updated[idx], key: e.target.value }
                    setTableColumns(updated)
                  }}
                  placeholder="키"
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={col.label}
                  onChange={(e) => {
                    const updated = [...tableColumns]
                    updated[idx] = { ...updated[idx], label: e.target.value }
                    setTableColumns(updated)
                  }}
                  placeholder="열 이름"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => setTableColumns(tableColumns.filter((_, i) => i !== idx))}
                  className="p-0.5 rounded hover:bg-red-50 text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranked choice options */}
      {isRankedChoice && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">순위 선택 설정</label>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">순위 수</label>
            <input
              type="number"
              value={rankCount}
              onChange={(e) => setRankCount(Number(e.target.value))}
              min={1}
              max={20}
              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <OptionsEditor options={rankedChoices} onChange={setRankedChoices} />
        </div>
      )}

      {/* Conditional logic */}
      <ConditionalLogicEditor
        conditionalLogic={conditionalLogic}
        onChange={setConditionalLogic}
        allQuestionCodes={allQuestionCodes.filter((q) => q.id !== question.id)}
      />

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        저장
      </button>
    </div>
  )
}
