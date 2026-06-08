'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ArrowLeft, Eye, Trash2, ChevronDown, ChevronRight,
  FileText, User, Loader2, AlertCircle, ChevronLeft,
  Pencil, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUESTION_TYPE_LABELS } from '@/lib/survey/constants'

interface SurveyMeta {
  id: string
  title: string
  status: string
}

interface AnswerItem {
  id: string
  questionId: string
  question: {
    id: string
    questionCode: string | null
    questionText: string
    questionType: string
    options: unknown
  }
  value: unknown
}

interface ResponseItem {
  id: string
  respondentName: string | null
  respondentInfo: Record<string, unknown> | null
  completedAt: string | null
  createdAt: string
  _count?: { answers: number }
}

const PAGE_SIZE = 20

export default function SurveyResponsesPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string

  const [survey, setSurvey] = useState<SurveyMeta | null>(null)
  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<Record<string, AnswerItem[]>>({})
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, unknown>>({})
  const [editName, setEditName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchData = useCallback(async (p: number) => {
    setIsLoading(true)
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}`),
        fetch(`/api/surveys/${surveyId}/responses?page=${p}&limit=${PAGE_SIZE}`),
      ])
      if (surveyRes.ok) {
        const surveyData = await surveyRes.json()
        setSurvey({ id: surveyData.id, title: surveyData.title, status: surveyData.status })
      }
      if (responsesRes.ok) {
        const data = await responsesRes.json()
        setResponses(data.responses ?? [])
        setTotal(data.total ?? 0)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [surveyId])

  useEffect(() => {
    fetchData(page)
  }, [fetchData, page])

  const loadDetail = async (id: string) => {
    if (expandedDetails[id]) return
    setLoadingDetail(id)
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses/${id}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedDetails((prev) => ({ ...prev, [id]: data.answers ?? [] }))
      }
    } catch {
      setExpandedDetails((prev) => ({ ...prev, [id]: [] }))
    } finally {
      setLoadingDetail(null)
    }
  }

  const handleEdit = async (resp: ResponseItem) => {
    setExpandedId(resp.id)
    setEditName(resp.respondentName ?? '')

    let answers = expandedDetails[resp.id]
    if (!answers) {
      setLoadingDetail(resp.id)
      try {
        const res = await fetch(`/api/surveys/${surveyId}/responses/${resp.id}`)
        if (res.ok) {
          const data = await res.json()
          answers = data.answers ?? []
          setExpandedDetails((prev) => ({ ...prev, [resp.id]: answers! }))
        }
      } catch {
        answers = []
        setExpandedDetails((prev) => ({ ...prev, [resp.id]: [] }))
      } finally {
        setLoadingDetail(null)
      }
    }

    const vals: Record<string, unknown> = {}
    ;(answers ?? []).forEach((a) => { vals[a.id] = a.value })
    setEditValues(vals)
    setEditingId(resp.id)
  }

  const handleSave = async (responseId: string) => {
    setIsSaving(true)
    try {
      const answers = expandedDetails[responseId] ?? []
      const res = await fetch(`/api/surveys/${surveyId}/responses/${responseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respondentName: editName,
          answers: answers.map((a) => ({ id: a.id, value: editValues[a.id] })),
        }),
      })
      if (res.ok) {
        setResponses((prev) =>
          prev.map((r) => r.id === responseId ? { ...r, respondentName: editName } : r)
        )
        setExpandedDetails((prev) => ({
          ...prev,
          [responseId]: (prev[responseId] ?? []).map((a) => ({ ...a, value: editValues[a.id] })),
        }))
        setEditingId(null)
      }
    } catch {
      // ignore
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => setEditingId(null)

  const handleDelete = async (responseId: string) => {
    if (!confirm('이 응답을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses/${responseId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setResponses((prev) => prev.filter((r) => r.id !== responseId))
        setTotal((prev) => prev - 1)
        if (expandedId === responseId) setExpandedId(null)
      }
    } catch {
      // ignore
    }
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setEditingId(null)
      return
    }
    setExpandedId(id)
    await loadDetail(id)
  }

  // ─── Render answer value ───
  const renderAnswer = (answer: AnswerItem) => {
    const value = answer.value
    const type = answer.question.questionType
    const opts = answer.question.options as Record<string, unknown> | null

    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-300 text-xs italic">미응답</span>
    }

    switch (type) {
      case 'TEXT':
      case 'NUMBER':
      case 'CONSENT':
        return <span className="text-sm text-gray-700">{String(value)}</span>

      case 'RADIO':
      case 'DROPDOWN': {
        const choices = (opts?.choices as { value: string; label: string }[]) ?? []
        const match = choices.find((c) => c.value === value)
        return (
          <span className="text-sm text-gray-700">
            {match ? match.label : String(value)}
          </span>
        )
      }

      case 'CHECKBOX': {
        const choices = (opts?.choices as { value: string; label: string }[]) ?? []
        const selected = Array.isArray(value) ? value : [value]
        return (
          <div className="flex flex-wrap gap-1">
            {selected.map((v: string, i: number) => {
              const match = choices.find((c) => c.value === v)
              return (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                >
                  {match ? match.label : String(v)}
                </span>
              )
            })}
          </div>
        )
      }

      case 'RANGE':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-600">{String(value)}</span>
            <span className="text-xs text-gray-400">
              ({String(opts?.min ?? 0)} ~ {String(opts?.max ?? 10)})
            </span>
          </div>
        )

      case 'TABLE': {
        const tableData = value as Record<string, unknown>[]
        if (!Array.isArray(tableData)) return <span className="text-sm text-gray-700">{JSON.stringify(value)}</span>
        const columns = (opts?.columns as { key: string; label: string }[]) ?? []
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead>
                <tr className="bg-gray-50">
                  {columns.map((col) => (
                    <th key={col.key} className="px-2 py-1 text-left text-gray-600 font-medium border-b">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    {columns.map((col) => (
                      <td key={col.key} className="px-2 py-1 text-gray-700">
                        {String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      case 'RANKED_CHOICE': {
        const ranked = Array.isArray(value) ? value : []
        const choices = (opts?.choices as { value: string; label: string }[]) ?? []
        return (
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-0.5">
            {ranked.map((v: string, i: number) => {
              const match = choices.find((c) => c.value === v)
              return (
                <li key={i}>
                  <span className="text-xs text-gray-400 mr-1">{i + 1}순위</span>
                  {match ? match.label : String(v)}
                </li>
              )
            })}
          </ol>
        )
      }

      default:
        return <span className="text-sm text-gray-700">{JSON.stringify(value)}</span>
    }
  }

  const renderEditInput = (answer: AnswerItem) => {
    const type = answer.question.questionType
    const opts = answer.question.options as Record<string, unknown> | null
    const val = editValues[answer.id]
    const set = (v: unknown) => setEditValues((prev) => ({ ...prev, [answer.id]: v }))

    switch (type) {
      case 'TEXT':
      case 'CONSENT':
        return (
          <textarea
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            rows={2}
            value={typeof val === 'string' ? val : ''}
            onChange={(e) => set(e.target.value)}
          />
        )
      case 'NUMBER':
        return (
          <input
            type="number"
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 w-32"
            value={typeof val === 'number' ? val : (val ?? '')}
            onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
          />
        )
      case 'RADIO':
      case 'DROPDOWN': {
        const choices = (opts?.choices as { value: string; label: string }[]) ?? []
        return (
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={typeof val === 'string' ? val : ''}
            onChange={(e) => set(e.target.value)}
          >
            <option value="">선택 안함</option>
            {choices.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        )
      }
      case 'CHECKBOX': {
        const choices = (opts?.choices as { value: string; label: string }[]) ?? []
        const selected: string[] = Array.isArray(val) ? val : []
        return (
          <div className="flex flex-wrap gap-2">
            {choices.map((c) => (
              <label key={c.value} className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(c.value)}
                  onChange={(e) => {
                    if (e.target.checked) set([...selected, c.value])
                    else set(selected.filter((v) => v !== c.value))
                  }}
                />
                {c.label}
              </label>
            ))}
          </div>
        )
      }
      case 'RANGE': {
        const min = Number(opts?.min ?? 0)
        const max = Number(opts?.max ?? 10)
        const numVal = typeof val === 'number' ? val : Number(val ?? min)
        return (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={min}
              max={max}
              value={numVal}
              onChange={(e) => set(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm font-medium text-blue-600 w-6 text-center">{numVal}</span>
          </div>
        )
      }
      default:
        return (
          <textarea
            className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            rows={3}
            value={JSON.stringify(val, null, 2)}
            onChange={(e) => {
              try { set(JSON.parse(e.target.value)) } catch { set(e.target.value) }
            }}
          />
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        로딩 중...
      </div>
    )
  }

  const startIdx = (page - 1) * PAGE_SIZE

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
              <FileText className="w-6 h-6 text-blue-600" />
              {survey?.title ?? '설문'} &mdash; 응답 목록
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              총 {total}건의 응답
            </p>
          </div>
        </div>
      </div>

      {/* Response list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_140px_90px_90px_60px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>#</span>
          <span>응답자</span>
          <span>완료 일시</span>
          <span className="text-center">보기</span>
          <span className="text-center">수정</span>
          <span className="text-center">삭제</span>
        </div>

        {responses.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">아직 응답이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {responses.map((resp, idx) => (
              <div key={resp.id}>
                {/* Row */}
                <div className="grid grid-cols-[40px_1fr_140px_90px_90px_60px] gap-4 px-5 py-3 items-center">
                  <span className="text-sm text-gray-500 font-medium">{startIdx + idx + 1}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-900 truncate">
                      {resp.respondentName || '익명'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {resp.completedAt
                      ? format(new Date(resp.completedAt), 'yyyy.MM.dd HH:mm', { locale: ko })
                      : '미완료'}
                  </span>
                  <div className="text-center">
                    <button
                      onClick={() => toggleExpand(resp.id)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                        expandedId === resp.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-blue-600 hover:bg-blue-50'
                      )}
                    >
                      {loadingDetail === resp.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : expandedId === resp.id ? (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          접기
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          보기
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => handleEdit(resp)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                        editingId === resp.id
                          ? 'bg-amber-100 text-amber-700'
                          : 'text-amber-600 hover:bg-amber-50'
                      )}
                    >
                      <Pencil className="w-3 h-3" />
                      수정
                    </button>
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => handleDelete(resp.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === resp.id && (
                  <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                    {!expandedDetails[resp.id] ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        불러오는 중...
                      </div>
                    ) : editingId === resp.id ? (
                      /* ── 수정 모드 ── */
                      <div className="space-y-4 pt-3">
                        {/* 응답자 이름 */}
                        <div className="bg-white rounded-lg border border-amber-200 p-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">응답자 이름</p>
                          <input
                            type="text"
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="이름 입력"
                          />
                        </div>
                        {expandedDetails[resp.id].map((answer) => (
                          <div
                            key={answer.id}
                            className="bg-white rounded-lg border border-amber-200 p-3"
                          >
                            <div className="flex items-start gap-2 mb-1.5">
                              {answer.question.questionCode && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded font-mono shrink-0">
                                  {answer.question.questionCode}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 shrink-0">
                                [{QUESTION_TYPE_LABELS[answer.question.questionType as keyof typeof QUESTION_TYPE_LABELS] ?? answer.question.questionType}]
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-800 mb-2">
                              {answer.question.questionText}
                            </p>
                            <div className="pl-2 border-l-2 border-amber-300">
                              {renderEditInput(answer)}
                            </div>
                          </div>
                        ))}
                        {/* 저장/취소 */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleSave(resp.id)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            저장
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600 text-sm font-medium rounded-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── 보기 모드 ── */
                      <div className="space-y-4 pt-3">
                        {expandedDetails[resp.id].length === 0 ? (
                          <p className="text-sm text-gray-400">응답 데이터가 없습니다.</p>
                        ) : (
                          expandedDetails[resp.id].map((answer) => (
                            <div
                              key={answer.id}
                              className="bg-white rounded-lg border border-gray-200 p-3"
                            >
                              <div className="flex items-start gap-2 mb-1.5">
                                {answer.question.questionCode && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded font-mono shrink-0">
                                    {answer.question.questionCode}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500 shrink-0">
                                  [{QUESTION_TYPE_LABELS[answer.question.questionType as keyof typeof QUESTION_TYPE_LABELS] ?? answer.question.questionType}]
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-800 mb-2">
                                {answer.question.questionText}
                              </p>
                              <div className="pl-2 border-l-2 border-blue-200">
                                {renderAnswer(answer)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`e${i}`} className="px-1 text-gray-400 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    page === p
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  )
}
