'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ArrowLeft, Plus, Trash2, Phone, Calendar, Tag, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Consultation {
  id: string
  consultDate: string
  consultType: string
  content: string
  nextAction: string | null
  createdAt: string
}

interface CounselingCase {
  id: string
  caseNumber: string
  victimName: string
  victimContact: string
  accidentDate: string | null
  accidentType: string | null
  status: string
  createdAt: string
  user: { id: string; name: string | null }
  consultations: Consultation[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN:        { label: '접수',   color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: '진행중', color: 'bg-amber-100 text-amber-700' },
  PENDING:     { label: '보류',   color: 'bg-gray-100 text-gray-600' },
  CLOSED:      { label: '종결',   color: 'bg-green-100 text-green-700' },
}

const CONSULT_TYPES = ['전화', '방문', '이메일', '화상', '문자', '기타']

export default function CounselingCaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [caseData, setCaseData] = useState<CounselingCase | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [consultForm, setConsultForm] = useState({
    consultDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    consultType: '전화',
    content: '',
    nextAction: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isStaff = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'STAFF'

  useEffect(() => {
    fetch(`/api/counseling/${caseId}`)
      .then((r) => r.json())
      .then(setCaseData)
      .finally(() => setIsLoading(false))
  }, [caseId])

  const handleStatusChange = async (status: string) => {
    const res = await fetch(`/api/counseling/${caseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setCaseData((prev) => prev ? { ...prev, status: updated.status } : prev)
    }
  }

  const handleDeleteCase = async () => {
    if (!confirm('이 케이스를 삭제하시겠습니까? 모든 상담기록도 함께 삭제됩니다.')) return
    setIsDeleting(true)
    const res = await fetch(`/api/counseling/${caseId}`, { method: 'DELETE' })
    if (res.ok) router.push('/counseling')
    else setIsDeleting(false)
  }

  const handleAddConsultation = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/counseling/${caseId}/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consultForm),
      })
      if (res.ok) {
        const newConsult = await res.json()
        setCaseData((prev) => prev ? { ...prev, consultations: [newConsult, ...prev.consultations] } : prev)
        setShowAddForm(false)
        setConsultForm({ ...consultForm, content: '', nextAction: '' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConsultation = async (consultationId: string) => {
    if (!confirm('이 상담기록을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/counseling/${caseId}/consultations/${consultationId}`, { method: 'DELETE' })
    if (res.ok) {
      setCaseData((prev) => prev ? {
        ...prev,
        consultations: prev.consultations.filter((c) => c.id !== consultationId),
      } : prev)
    }
  }

  if (isLoading) return <div className="text-center py-20 text-sm text-gray-400">로딩 중...</div>
  if (!caseData) return <div className="text-center py-20 text-sm text-gray-400">케이스를 찾을 수 없습니다.</div>

  const status = STATUS_CONFIG[caseData.status] ?? { label: caseData.status, color: 'bg-gray-100' }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/counseling" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{caseData.victimName}</h1>
          <p className="text-xs text-gray-400">{caseData.caseNumber}</p>
        </div>
        {isStaff && (
          <button onClick={handleDeleteCase} disabled={isDeleting}
            className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50">
            케이스 삭제
          </button>
        )}
      </div>

      {/* 케이스 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', status.color)}>{status.label}</span>
          <div className="flex gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => handleStatusChange(key)}
                disabled={caseData.status === key}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
                  caseData.status === key
                    ? 'opacity-30 cursor-not-allowed border-gray-200'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            {caseData.victimContact}
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            담당: {caseData.user.name}
          </div>
          {caseData.accidentDate && (
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              {format(new Date(caseData.accidentDate), 'yyyy년 M월 d일', { locale: ko })}
            </div>
          )}
          {caseData.accidentType && (
            <div className="flex items-center gap-2 text-gray-700">
              <Tag className="w-4 h-4 text-gray-400 shrink-0" />
              {caseData.accidentType}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">
          등록일: {format(new Date(caseData.createdAt), 'yyyy.MM.dd', { locale: ko })}
        </p>
      </div>

      {/* 상담기록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">상담기록 ({caseData.consultations.length}건)</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            기록 추가
          </button>
        </div>

        {/* 추가 폼 */}
        {showAddForm && (
          <form onSubmit={handleAddConsultation} className="p-5 bg-blue-50 border-b border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">상담 일시 *</label>
                <input type="datetime-local" value={consultForm.consultDate}
                  onChange={(e) => setConsultForm({ ...consultForm, consultDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">상담 방법</label>
                <select value={consultForm.consultType}
                  onChange={(e) => setConsultForm({ ...consultForm, consultType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CONSULT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">상담 내용 *</label>
              <textarea value={consultForm.content}
                onChange={(e) => setConsultForm({ ...consultForm, content: e.target.value })}
                rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="상담 내용을 입력하세요" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">다음 조치사항</label>
              <input type="text" value={consultForm.nextAction}
                onChange={(e) => setConsultForm({ ...consultForm, nextAction: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="다음 상담 또는 조치 계획" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
              <button type="submit" disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isSubmitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}

        {caseData.consultations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">상담기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {caseData.consultations.map((consult) => (
              <div key={consult.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-gray-700">
                        {format(new Date(consult.consultDate), 'yyyy.MM.dd HH:mm', { locale: ko })}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{consult.consultType}</span>
                    </div>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{consult.content}</p>
                    {consult.nextAction && (
                      <div className="mt-2 pl-3 border-l-2 border-blue-200">
                        <p className="text-xs text-blue-700 font-medium">다음 조치: {consult.nextAction}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDeleteConsultation(consult.id)}
                    className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
