'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { X, Plus, CheckCircle, Clock, AlertCircle, Trash2, Building2, ChevronRight, Camera, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import {
  HAZARD_CATEGORY_LABELS, HAZARD_CATEGORY_COLORS, getRiskLevel, calcRiskScore,
  SEVERITY_OPTIONS, LIKELIHOOD_OPTIONS, ADDITIONAL_SCORE_CONFIG,
} from '@/lib/risk-assessment'
import { PhotoUploader } from '@/components/ui/photo-uploader'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImprovementPhoto {
  id: string; photoPath: string; thumbnailPath?: string | null
}

interface ImprovementRecord {
  id: string
  status: 'PLANNED' | 'COMPLETED'
  updateDate: string
  improvementContent: string
  responsiblePerson: string
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  riskScore: number
  remarks: string | null
  createdAt: string
  photos: ImprovementPhoto[]
}

interface HazardImprovement {
  id: string
  status: 'PLANNED' | 'COMPLETED'
  riskScore: number
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  updateDate: string
}

interface Hazard {
  id: string
  cardId: string
  hazardCategory: string
  hazardFactor: string
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  riskScore: number
  improvementPlan: string | null
  improvements: HazardImprovement[]
  card: {
    id: string
    year: number
    evaluationType: string
    organizationUnit: {
      id: string
      name: string
      parent: { id: string; name: string } | null
    }
    workplace: { id: string; name: string }
  }
}

interface Workplace { id: string; name: string }

type HazardStatus = 'none' | 'planned' | 'completed'
type FilterStatus = '' | HazardStatus

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHazardStatus(improvements: HazardImprovement[]): HazardStatus {
  if (improvements.length === 0) return 'none'
  if (improvements.some(i => i.status === 'COMPLETED')) return 'completed'
  return 'planned'
}

function getCurrentRiskScore(hazard: Pick<Hazard, 'riskScore' | 'improvements'>): { score: number; isPlan: boolean } {
  const completed = hazard.improvements.filter(i => i.status === 'COMPLETED')
  if (completed.length > 0) return { score: completed[0].riskScore, isPlan: false }
  const planned = hazard.improvements.filter(i => i.status === 'PLANNED')
  if (planned.length > 0) return { score: planned[0].riskScore, isPlan: true }
  return { score: hazard.riskScore, isPlan: false }
}

function toHazardImprovement(r: ImprovementRecord): HazardImprovement {
  return {
    id: r.id, status: r.status, riskScore: r.riskScore,
    severityScore: r.severityScore, likelihoodScore: r.likelihoodScore,
    additionalPoints: r.additionalPoints, updateDate: r.updateDate,
  }
}

const STATUS_LABELS: Record<HazardStatus, string> = { none: '미실시', planned: '예정있음', completed: '완료됨' }
const STATUS_BADGE: Record<HazardStatus, string> = {
  none: 'bg-gray-100 text-gray-500',
  planned: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
}

// ─── AddImprovementForm ───────────────────────────────────────────────────────

function AddImprovementForm({ hazard, onSaved }: { hazard: Hazard; onSaved: (rec: ImprovementRecord) => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'PLANNED' | 'COMPLETED'>('PLANNED')
  const [updateDate, setUpdateDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [improvementContent, setImprovementContent] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('')
  // 기존 위험요인 점수를 기본값으로 사용
  const [severityScore, setSeverityScore] = useState(hazard.severityScore)
  const [likelihoodScore, setLikelihoodScore] = useState(hazard.likelihoodScore)
  const [additionalPoints, setAdditionalPoints] = useState(hazard.additionalPoints)
  const [remarks, setRemarks] = useState('')

  const riskScore = calcRiskScore(hazard.hazardCategory, severityScore, likelihoodScore, additionalPoints)

  const reset = () => {
    setStatus('PLANNED'); setUpdateDate(format(new Date(), 'yyyy-MM-dd'))
    setImprovementContent(''); setResponsiblePerson('')
    setSeverityScore(hazard.severityScore); setLikelihoodScore(hazard.likelihoodScore)
    setAdditionalPoints(hazard.additionalPoints); setRemarks('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!improvementContent.trim() || !responsiblePerson.trim()) return
    setSaving(true)
    const res = await fetch(`/api/risk-assessment/${hazard.cardId}/hazards/${hazard.id}/improvements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, updateDate, improvementContent, responsiblePerson, severityScore, likelihoodScore, additionalPoints, remarks, riskScore }),
    })
    if (res.ok) {
      const rec = await res.json()
      onSaved({ ...rec, photos: [] })
      reset()
      setOpen(false)
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 flex items-center justify-center gap-1.5 transition-colors mt-2"
      >
        <Plus className="w-4 h-4" /> 개선이력 추가
      </button>
    )
  }

  const isAbsolute = hazard.hazardCategory === 'ABSOLUTE'
  const rl = getRiskLevel(riskScore)
  const additionalConfig = ADDITIONAL_SCORE_CONFIG[hazard.hazardCategory]

  return (
    <form onSubmit={handleSubmit} className="border border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50 mt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-blue-800">새 개선이력 추가</h4>
        <button type="button" onClick={() => { setOpen(false); reset() }} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">상태</label>
          <select value={status} onChange={e => setStatus(e.target.value as 'PLANNED' | 'COMPLETED')}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
            <option value="PLANNED">예정</option>
            <option value="COMPLETED">완료</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">{status === 'PLANNED' ? '예정일' : '완료일'}</label>
          <input type="date" value={updateDate} onChange={e => setUpdateDate(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" required />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">개선 내용 *</label>
        <textarea value={improvementContent} onChange={e => setImprovementContent(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white resize-none"
          rows={2} required placeholder="개선 작업 내용을 입력하세요" />
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">담당자 *</label>
        <input type="text" value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" required placeholder="담당자 이름" />
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">
          {status === 'PLANNED' ? '예상 위험성 점수 (개선 후)' : '실제 위험성 점수 (개선 후)'}
        </label>
        <p className="text-xs text-gray-400 mb-2">최초 위험성: {hazard.severityScore}×{hazard.likelihoodScore}+{hazard.additionalPoints} = {hazard.riskScore}점</p>
        {isAbsolute ? (
          <span className="text-xs text-gray-500">절대기준 — 16점 고정</span>
        ) : (
          <div className="space-y-2">
            {/* 중대성 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 shrink-0">중대성</span>
              <select value={severityScore} onChange={e => setSeverityScore(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white w-16">
                {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}점</option>)}
              </select>
              <span className="text-xs text-gray-400 truncate">{SEVERITY_OPTIONS.find(o => o.value === severityScore)?.desc}</span>
            </div>
            {/* 가능성 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 shrink-0">가능성</span>
              <select value={likelihoodScore} onChange={e => setLikelihoodScore(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white w-16">
                {LIKELIHOOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}점</option>)}
              </select>
              <span className="text-xs text-gray-400 truncate">{LIKELIHOOD_OPTIONS.find(o => o.value === likelihoodScore)?.desc}</span>
            </div>
            {/* 추가점수 */}
            {additionalConfig && additionalConfig.max > 0 && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12 shrink-0">추가</span>
                  <select value={additionalPoints} onChange={e => setAdditionalPoints(parseInt(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm bg-white w-16">
                    {Array.from({ length: additionalConfig.max + 1 }, (_, i) => (
                      <option key={i} value={i}>{i}점</option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400 truncate">{additionalConfig.label}</span>
                </div>
                {additionalConfig.fields.length > 0 && (
                  <div className="ml-14 mt-1 space-y-0.5">
                    {additionalConfig.fields.map(f => (
                      <p key={f.key} className="text-xs text-gray-400">• {f.label}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* 결과 */}
            <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
              <span className="text-xs text-gray-500">결과:</span>
              <span className="text-xs font-mono text-gray-600">{severityScore}×{likelihoodScore}+{additionalPoints}</span>
              <span className="text-xs text-gray-400">=</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${rl.bg} ${rl.color}`}>{riskScore}점 ({rl.label})</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">비고</label>
        <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" placeholder="선택 입력" />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={() => { setOpen(false); reset() }} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">취소</button>
        <button type="submit" disabled={saving}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}

// ─── ImprovementPanel ────────────────────────────────────────────────────────

function ImprovementPanel({
  hazard, onClose, onUpdate,
}: {
  hazard: Hazard
  onClose: () => void
  onUpdate: (hazardId: string, improvements: HazardImprovement[]) => void
}) {
  const [improvements, setImprovements] = useState<ImprovementRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      const res = await fetch(`/api/risk-assessment/${hazard.cardId}/hazards/${hazard.id}/improvements`)
      if (!cancelled && res.ok) {
        const data = await res.json()
        setImprovements(data.improvements || [])
      }
      if (!cancelled) setIsLoading(false)
    })()
    return () => { cancelled = true }
  }, [hazard.cardId, hazard.id])

  const sync = (newList: ImprovementRecord[]) => {
    setImprovements(newList)
    onUpdate(hazard.id, newList.map(toHazardImprovement))
  }

  const handleComplete = async (recordId: string) => {
    const res = await fetch(`/api/risk-assessment/improvements/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    if (res.ok) {
      sync(improvements.map(r => r.id === recordId ? { ...r, status: 'COMPLETED' as const } : r))
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('이 개선이력을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/risk-assessment/improvements/${recordId}`, { method: 'DELETE' })
    if (res.ok) sync(improvements.filter(r => r.id !== recordId))
  }

  const handleSaved = (rec: ImprovementRecord) => {
    sync([...improvements, rec])
  }

  const handlePhotoUploaded = (recordId: string, photo: ImprovementPhoto) => {
    setImprovements(prev => prev.map(r =>
      r.id === recordId ? { ...r, photos: [...r.photos, photo] } : r
    ))
  }

  const handleDeletePhoto = async (recordId: string, photoId: string) => {
    const res = await fetch(`/api/risk-assessment/improvements/${recordId}/photos/${photoId}`, { method: 'DELETE' })
    if (res.ok) {
      setImprovements(prev => prev.map(r =>
        r.id === recordId ? { ...r, photos: r.photos.filter(p => p.id !== photoId) } : r
      ))
    }
  }

  const riskLevel = getRiskLevel(hazard.riskScore)
  const unit = hazard.card.organizationUnit
  const unitLabel = unit.parent ? `${unit.parent.name} > ${unit.name}` : unit.name

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden border-l border-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium mb-1.5 ${HAZARD_CATEGORY_COLORS[hazard.hazardCategory]}`}>
                {HAZARD_CATEGORY_LABELS[hazard.hazardCategory]}
              </span>
              <h2 className="text-sm font-bold text-gray-900 leading-snug">{hazard.hazardFactor}</h2>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3 shrink-0" />
                {hazard.card.workplace.name} · {unitLabel} · {hazard.card.year}년
              </p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="text-gray-500">최초 위험성:</span>
            {hazard.hazardCategory !== 'ABSOLUTE' && (
              <span className="font-mono text-gray-500">
                {hazard.severityScore}×{hazard.likelihoodScore}+{hazard.additionalPoints}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded font-bold ${riskLevel.bg} ${riskLevel.color}`}>
              {hazard.riskScore}점 ({riskLevel.label})
            </span>
          </div>

          {hazard.improvementPlan && (
            <p className="text-xs text-gray-600 mt-2 bg-white border border-gray-200 rounded px-2 py-1.5">
              <span className="font-medium text-gray-700">개선방안: </span>{hazard.improvementPlan}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            개선이력 {!isLoading && `(${improvements.length}건)`}
          </h3>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
          ) : improvements.length === 0 ? (
            <div className="text-center py-8 text-gray-300 text-sm">등록된 개선이력이 없습니다.</div>
          ) : (
            <div className="space-y-2 mb-2">
              {improvements.map(rec => {
                const rl = getRiskLevel(rec.riskScore)
                const isDone = rec.status === 'COMPLETED'
                const isPhotoExpanded = expandedPhotoId === rec.id
                return (
                  <div key={rec.id}
                    className={`rounded-lg border p-3 ${isDone ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${isDone ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                            {isDone ? '완료' : '예정'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(rec.updateDate), 'yyyy.MM.dd')}
                          </span>
                          <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${rl.bg} ${rl.color}`}>
                            {isDone ? '실제' : '예상'} {rec.riskScore}점
                          </span>
                          {!isDone && (
                            <span className="text-xs text-gray-400 font-mono">
                              ({rec.severityScore}×{rec.likelihoodScore}+{rec.additionalPoints})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 font-medium leading-snug">{rec.improvementContent}</p>
                        <p className="text-xs text-gray-500 mt-0.5">담당: {rec.responsiblePerson}</p>
                        {rec.remarks && <p className="text-xs text-gray-400 mt-0.5">비고: {rec.remarks}</p>}

                        {/* 사진 영역 */}
                        <div className="mt-1.5">
                          <button
                            onClick={() => setExpandedPhotoId(isPhotoExpanded ? null : rec.id)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Camera className="w-3 h-3" />
                            사진 {rec.photos.length > 0 ? `(${rec.photos.length})` : ''}
                            <ChevronDown className={`w-3 h-3 transition-transform ${isPhotoExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          {isPhotoExpanded && (
                            <div className="mt-2" onClick={e => e.stopPropagation()}>
                              <PhotoUploader
                                mode="immediate"
                                uploadUrl={`/api/risk-assessment/improvements/${rec.id}/photos`}
                                existingPhotos={rec.photos}
                                onUploaded={(photo) => handlePhotoUploaded(rec.id, photo)}
                                onDeleteExisting={(photoId) => handleDeletePhoto(rec.id, photoId)}
                                maxPhotos={10}
                                maxFileSize={10 * 1024 * 1024}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        {!isDone && (
                          <button onClick={() => handleComplete(rec.id)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-0.5 whitespace-nowrap">
                            <CheckCircle className="w-3 h-3" /> 완료확인
                          </button>
                        )}
                        <button onClick={() => handleDelete(rec.id)} className="p-1 text-gray-300 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <AddImprovementForm hazard={hazard} onSaved={handleSaved} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <Link href="/risk-assessment/conduct"
            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            평가 실시 <ChevronRight className="w-3 h-3" />
          </Link>
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImprovementPage() {
  const currentYear = new Date().getFullYear()
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(String(currentYear))
  const [filterWorkplace, setFilterWorkplace] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('')
  const [searchText, setSearchText] = useState('')
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null)

  useEffect(() => {
    fetch('/api/workplaces').then(r => r.json()).then(d => setWorkplaces(d.workplaces || []))
  }, [])

  useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams({ year: filterYear })
    if (filterWorkplace) params.set('workplaceId', filterWorkplace)
    fetch(`/api/risk-assessment/hazards?${params}`)
      .then(r => r.json())
      .then(d => { setHazards(d.hazards || []); setIsLoading(false) })
  }, [filterYear, filterWorkplace])

  const handleHazardUpdate = useCallback((hazardId: string, improvements: HazardImprovement[]) => {
    setHazards(prev => prev.map(h => h.id === hazardId ? { ...h, improvements } : h))
  }, [])

  const filteredHazards = useMemo(() => {
    return hazards.filter(h => {
      if (filterStatus) {
        if (getHazardStatus(h.improvements) !== filterStatus) return false
      }
      if (searchText) {
        const q = searchText.toLowerCase()
        const unit = h.card.organizationUnit
        if (
          !h.hazardFactor.toLowerCase().includes(q) &&
          !unit.name.toLowerCase().includes(q) &&
          !(unit.parent?.name.toLowerCase().includes(q) ?? false)
        ) return false
      }
      return true
    })
  }, [hazards, filterStatus, searchText])

  const stats = useMemo(() => ({
    total: hazards.length,
    none: hazards.filter(h => getHazardStatus(h.improvements) === 'none').length,
    planned: hazards.filter(h => getHazardStatus(h.improvements) === 'planned').length,
    completed: hazards.filter(h => getHazardStatus(h.improvements) === 'completed').length,
  }), [hazards])

  const statCards: Array<{ label: string; value: number; key: FilterStatus; icon: React.ReactNode; color: string; ring: string }> = [
    { label: '전체 위험요인', value: stats.total, key: '', icon: null, color: 'text-gray-800', ring: '' },
    { label: '미실시', value: stats.none, key: 'none', icon: <AlertCircle className="w-4 h-4 text-gray-400" />, color: 'text-gray-600', ring: 'ring-gray-400' },
    { label: '예정있음', value: stats.planned, key: 'planned', icon: <Clock className="w-4 h-4 text-amber-500" />, color: 'text-amber-600', ring: 'ring-amber-400' },
    { label: '완료됨', value: stats.completed, key: 'completed', icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: 'text-green-600', ring: 'ring-green-400' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">개선관리</h1>
        <p className="text-sm text-gray-500 mt-0.5">유해위험요인 개선작업 현황 및 이력 관리</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(stat => (
          <Card
            key={stat.label}
            className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === stat.key && stat.key !== '' ? `ring-2 ${stat.ring}` : ''}`}
            onClick={() => setFilterStatus(filterStatus === stat.key ? '' : stat.key)}
          >
            <CardContent className="pt-4 pb-4">
              {stat.icon
                ? <div className="flex items-center gap-1.5 mb-1">{stat.icon}<p className="text-xs text-gray-500">{stat.label}</p></div>
                : <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              }
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          {[currentYear - 1, currentYear, currentYear + 1].map(y =>
            <option key={y} value={String(y)}>{y}년</option>
          )}
        </select>
        <select value={filterWorkplace} onChange={e => setFilterWorkplace(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">전체 사업장</option>
          {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
        </select>
        <input
          type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
          placeholder="위험요인 또는 조직단위 검색..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-56"
        />
        <span className="text-xs text-gray-400 ml-auto">{filteredHazards.length}건</span>
      </div>

      {/* Hazard Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
          ) : filteredHazards.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {hazards.length === 0 ? '등록된 유해위험요인이 없습니다.' : '필터 조건에 맞는 항목이 없습니다.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">조직단위</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">분류</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">유해위험요인</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">최초 위험성</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">개선 후</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">개선 상태</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">개선이력</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHazards.map((hazard, idx) => {
                  const status = getHazardStatus(hazard.improvements)
                  const { score, isPlan } = getCurrentRiskScore(hazard)
                  const initLevel = getRiskLevel(hazard.riskScore)
                  const currLevel = getRiskLevel(score)
                  const unit = hazard.card.organizationUnit
                  return (
                    <tr key={hazard.id} className={`hover:bg-gray-50 ${
                      status === 'completed' ? 'bg-green-50/40' :
                      status === 'planned' ? 'bg-amber-50/40' : ''
                    }`}>
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        {unit.parent && <p className="text-xs text-gray-400">{unit.parent.name}</p>}
                        <p className="text-gray-700 font-medium">{unit.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${HAZARD_CATEGORY_COLORS[hazard.hazardCategory]}`}>
                          {HAZARD_CATEGORY_LABELS[hazard.hazardCategory]}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-800 line-clamp-2">{hazard.hazardFactor}</p>
                        {hazard.improvementPlan && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">방안: {hazard.improvementPlan}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${initLevel.bg} ${initLevel.color}`}>
                          {hazard.riskScore}점
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {status === 'none' ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${currLevel.bg} ${currLevel.color}`}>
                              {score}점
                            </span>
                            {isPlan && <p className="text-xs text-amber-500 mt-0.5">예상</p>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[status]}`}>
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedHazard(hazard)}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          관리
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Slide-over Panel */}
      {selectedHazard && (
        <ImprovementPanel
          hazard={selectedHazard}
          onClose={() => setSelectedHazard(null)}
          onUpdate={handleHazardUpdate}
        />
      )}
    </div>
  )
}
