'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  X, Plus, CheckCircle, Trash2, Building2, Camera, ChevronDown, ChevronRight,
} from 'lucide-react'
import { PhotoUploader } from '@/components/ui/photo-uploader'
import {
  HAZARD_CATEGORY_LABELS, HAZARD_CATEGORY_COLORS, getRiskLevel,
  calcRiskScore, formatAdditionalDetails,
  getSeverityDesc, getLikelihoodDesc,
  SEVERITY_OPTIONS, LIKELIHOOD_OPTIONS, ADDITIONAL_SCORE_CONFIG,
} from '@/lib/risk-assessment'

// ─── Types ───

interface PhotoItem {
  id: string; photoPath: string; thumbnailPath?: string | null
}

interface ImprovementRecord {
  id: string; status: 'PLANNED' | 'COMPLETED'; updateDate: string
  improvementContent: string; responsiblePerson: string
  severityScore: number; likelihoodScore: number; additionalPoints: number
  riskScore: number; remarks: string | null; createdAt: string
  photos: PhotoItem[]
}

export interface ImprovementPanelHazard {
  id: string
  cardId: string
  hazardCategory: string
  hazardFactor: string
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  additionalDetails: Record<string, number> | null
  riskScore: number
  improvementPlan: string | null
  photos: PhotoItem[]
  workplaceName: string
  unitName: string
  parentUnitName?: string | null
  year: number
  evaluationType: string
}

interface SimpleImprovement {
  id: string; status: string
  riskScore?: number; severityScore?: number
  likelihoodScore?: number; additionalPoints?: number
  updateDate?: string
}

export interface ImprovementPanelProps {
  hazard: ImprovementPanelHazard
  onClose: () => void
  onUpdate?: (hazardId: string, improvements: SimpleImprovement[]) => void
  onOpenLightbox?: (photos: PhotoItem[], index: number) => void
  onDataChanged?: () => void
  footerLink?: { href: string; label: string }
}

// ─── AddImprovementForm ───

function AddImprovementForm({
  hazard, onSaved,
}: {
  hazard: ImprovementPanelHazard
  onSaved: (rec: ImprovementRecord) => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'PLANNED' | 'COMPLETED'>('PLANNED')
  const [updateDate, setUpdateDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [improvementContent, setImprovementContent] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('')
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
        <p className="text-xs text-gray-400 mb-2">
          최초 위험성: {hazard.severityScore}×{hazard.likelihoodScore}+{hazard.additionalPoints} = {hazard.riskScore}점
          {hazard.additionalDetails && hazard.additionalPoints > 0 && (
            <span className="text-blue-500 ml-1">({formatAdditionalDetails(hazard.hazardCategory, hazard.additionalDetails).join(', ')})</span>
          )}
        </p>
        {isAbsolute ? (
          <span className="text-xs text-gray-500">절대기준 — 16점 고정</span>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 shrink-0">중대성</span>
              <select value={severityScore} onChange={e => setSeverityScore(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white w-16">
                {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}점</option>)}
              </select>
              <span className="text-xs text-gray-400 truncate">{getSeverityDesc(hazard.hazardCategory, severityScore)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 shrink-0">가능성</span>
              <select value={likelihoodScore} onChange={e => setLikelihoodScore(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white w-16">
                {LIKELIHOOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}점</option>)}
              </select>
              <span className="text-xs text-gray-400 truncate">{getLikelihoodDesc(hazard.hazardCategory, hazard.evaluationType, likelihoodScore)}</span>
            </div>
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

// ─── ImprovementPanel ───

export default function ImprovementPanel({
  hazard, onClose, onUpdate, onOpenLightbox, onDataChanged, footerLink,
}: ImprovementPanelProps) {
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
    onUpdate?.(hazard.id, newList.map(r => ({
      id: r.id, status: r.status, riskScore: r.riskScore,
      severityScore: r.severityScore, likelihoodScore: r.likelihoodScore,
      additionalPoints: r.additionalPoints, updateDate: r.updateDate,
    })))
    onDataChanged?.()
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

  const handlePhotoUploaded = (recordId: string, photo: PhotoItem) => {
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
  const unitLabel = hazard.parentUnitName ? `${hazard.parentUnitName} > ${hazard.unitName}` : hazard.unitName

  const completedCount = improvements.filter(i => i.status === 'COMPLETED').length
  const plannedCount = improvements.filter(i => i.status === 'PLANNED').length

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/20" />
      <div
        className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden border-l border-gray-200"
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
                {hazard.workplaceName} · {unitLabel} · {hazard.year}년
              </p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-2.5 text-xs space-y-1">
            <div className="flex items-center gap-2">
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
            {hazard.hazardCategory !== 'ABSOLUTE' && (
              <div className="text-gray-400 space-y-0.5 pl-1">
                <p>중대성 {hazard.severityScore}점: {getSeverityDesc(hazard.hazardCategory, hazard.severityScore)}</p>
                <p>가능성 {hazard.likelihoodScore}점: {getLikelihoodDesc(hazard.hazardCategory, hazard.evaluationType, hazard.likelihoodScore)}</p>
                {hazard.additionalDetails && hazard.additionalPoints > 0 && (
                  <p className="text-blue-500">가점: {formatAdditionalDetails(hazard.hazardCategory, hazard.additionalDetails).join(', ')}</p>
                )}
              </div>
            )}
          </div>

          {hazard.improvementPlan && (
            <p className="text-xs text-gray-600 mt-2 bg-white border border-gray-200 rounded px-2 py-1.5">
              <span className="font-medium text-gray-700">개선방안: </span>{hazard.improvementPlan}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* 위험요인 사진 */}
          {hazard.photos.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">위험요인 사진</h3>
              <div className="flex flex-wrap gap-2">
                {hazard.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.thumbnailPath || p.photoPath}
                    alt=""
                    className={`w-16 h-16 object-cover rounded-lg border border-gray-200 ${onOpenLightbox ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}`}
                    onClick={() => onOpenLightbox?.(hazard.photos, i)}
                  />
                ))}
              </div>
            </div>
          )}

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            개선이력 {!isLoading && `(${improvements.length}건)`}
            {completedCount > 0 && <span className="text-green-600 ml-1">· 완료 {completedCount}</span>}
            {plannedCount > 0 && <span className="text-yellow-600 ml-1">· 예정 {plannedCount}</span>}
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
                          <span className="text-xs text-gray-400 font-mono">
                            ({rec.severityScore}×{rec.likelihoodScore}+{rec.additionalPoints})
                          </span>
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

          {/* 페이지 링크 */}
          {footerLink && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Link href={footerLink.href}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline">
                {footerLink.label} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
