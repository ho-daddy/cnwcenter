'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  X, Plus, Save, Building2, Pencil, CheckCircle, Trash2,
  Camera, ChevronDown,
} from 'lucide-react'
import { PhotoUploader } from '@/components/ui/photo-uploader'

// ─── Types ───

interface PhotoItem {
  id: string; photoPath: string; thumbnailPath?: string | null
}

interface ImprovementRecord {
  id: string; status: 'PLANNED' | 'COMPLETED'; updateDate: string
  improvementContent: string; responsiblePerson: string
  remarks: string | null; createdAt: string
  photos: PhotoItem[]
}

export interface MSurveyImprovementItem {
  id: string
  assessmentId: string
  documentNo: string | null
  problem: string
  improvement: string
  source: string | null
  status: string | null
  updateDate: string | null
  responsiblePerson: string | null
  remarks: string | null
  createdAt?: string
  assessment?: {
    id: string
    organizationUnit: { name: string }
    workplace: { id: string; name: string }
  }
}

export interface MSurveyImprovementPanelProps {
  item: MSurveyImprovementItem
  workplaceId: string
  workplaceName?: string
  unitName?: string
  onClose: () => void
  onUpdate?: (updated: MSurveyImprovementItem) => void
  onDataChanged?: () => void
}

const STATUS_OPTIONS = [
  { value: '', label: '미지정', color: 'bg-gray-100 text-gray-600' },
  { value: 'PLANNED', label: '예정', color: 'bg-amber-100 text-amber-700' },
  { value: 'COMPLETED', label: '완료', color: 'bg-green-100 text-green-700' },
]

function getStatusConfig(status: string | null) {
  return STATUS_OPTIONS.find(s => s.value === (status || '')) || STATUS_OPTIONS[0]
}

// ─── AddRecordForm ───

function AddRecordForm({
  improvementId, workplaceId, assessmentId,
  onSaved,
}: {
  improvementId: string; workplaceId: string; assessmentId: string
  onSaved: (rec: ImprovementRecord) => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'PLANNED' | 'COMPLETED'>('PLANNED')
  const [updateDate, setUpdateDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [improvementContent, setImprovementContent] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('')
  const [remarks, setRemarks] = useState('')

  const reset = () => {
    setStatus('PLANNED'); setUpdateDate(format(new Date(), 'yyyy-MM-dd'))
    setImprovementContent(''); setResponsiblePerson(''); setRemarks('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!improvementContent.trim() || !responsiblePerson.trim()) return
    setSaving(true)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/musculoskeletal/${assessmentId}/improvements/${improvementId}/records`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, updateDate, improvementContent, responsiblePerson, remarks }),
        }
      )
      if (res.ok) {
        const rec = await res.json()
        onSaved({ ...rec, photos: rec.photos || [] })
        reset()
        setOpen(false)
      }
    } catch (error) {
      console.error('개선이력 추가 오류:', error)
    } finally {
      setSaving(false)
    }
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

// ─── Panel ───

export default function MSurveyImprovementPanel({
  item, workplaceId, workplaceName, unitName, onClose, onUpdate, onDataChanged,
}: MSurveyImprovementPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Base fields
  const [problem, setProblem] = useState(item.problem)
  const [improvement, setImprovement] = useState(item.improvement)
  const [status, setStatus] = useState(item.status || '')

  // Records
  const [records, setRecords] = useState<ImprovementRecord[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)

  // Edit record state
  const [editStatus, setEditStatus] = useState<'PLANNED' | 'COMPLETED'>('PLANNED')
  const [editDate, setEditDate] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editPerson, setEditPerson] = useState('')
  const [editRemarks, setEditRemarks] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsLoadingRecords(true)
      try {
        const res = await fetch(
          `/api/workplaces/${workplaceId}/musculoskeletal/${item.assessmentId}/improvements/${item.id}/records`
        )
        if (!cancelled && res.ok) {
          const data = await res.json()
          setRecords(data.records || [])
        }
      } catch (error) {
        console.error('개선이력 조회 오류:', error)
      }
      if (!cancelled) setIsLoadingRecords(false)
    })()
    return () => { cancelled = true }
  }, [workplaceId, item.assessmentId, item.id])

  const syncParent = (newStatus?: string) => {
    const updated: MSurveyImprovementItem = {
      ...item,
      problem,
      improvement,
      status: newStatus !== undefined ? (newStatus || null) : (status || null),
    }
    onUpdate?.(updated)
    onDataChanged?.()
  }

  // ── Base field handlers ──

  const resetForm = () => {
    setProblem(item.problem)
    setImprovement(item.improvement)
    setIsEditing(false)
  }

  const handleSaveBase = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/musculoskeletal/${item.assessmentId}/improvements/${item.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem, improvement }),
        }
      )
      if (res.ok) {
        item.problem = problem
        item.improvement = improvement
        syncParent()
        setIsEditing(false)
      }
    } catch (error) {
      console.error('개선사항 수정 오류:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus)
    setIsSaving(true)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/musculoskeletal/${item.assessmentId}/improvements/${item.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus || null }),
        }
      )
      if (res.ok) {
        item.status = newStatus || null
        syncParent(newStatus)
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Record handlers ──

  const handleRecordSaved = (rec: ImprovementRecord) => {
    setRecords(prev => [...prev, rec])
    setStatus(rec.status)
    item.status = rec.status
    syncParent(rec.status)
  }

  const handleComplete = async (recordId: string) => {
    const res = await fetch(`/api/musculoskeletal/improvement-records/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    if (res.ok) {
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'COMPLETED' as const } : r))
      setStatus('COMPLETED')
      item.status = 'COMPLETED'
      syncParent('COMPLETED')
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('이 개선이력을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/musculoskeletal/improvement-records/${recordId}`, { method: 'DELETE' })
    if (res.ok) {
      const newRecords = records.filter(r => r.id !== recordId)
      setRecords(newRecords)
      if (editingRecordId === recordId) setEditingRecordId(null)
      syncParent()
    }
  }

  const startEditing = (rec: ImprovementRecord) => {
    setEditingRecordId(rec.id)
    setEditStatus(rec.status)
    setEditDate(format(new Date(rec.updateDate), 'yyyy-MM-dd'))
    setEditContent(rec.improvementContent)
    setEditPerson(rec.responsiblePerson)
    setEditRemarks(rec.remarks || '')
  }

  const cancelEditing = () => {
    setEditingRecordId(null)
  }

  const handleEditSave = async (recordId: string) => {
    if (!editContent.trim() || !editPerson.trim()) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/musculoskeletal/improvement-records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          updateDate: editDate,
          improvementContent: editContent,
          responsiblePerson: editPerson,
          remarks: editRemarks,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updated, photos: r.photos } : r))
        setEditingRecordId(null)
        syncParent(updated.status)
      }
    } catch (error) {
      console.error('개선이력 수정 오류:', error)
    } finally {
      setEditSaving(false)
    }
  }

  // ── Photo handlers ──

  const handlePhotoUploaded = (recordId: string, photo: PhotoItem) => {
    setRecords(prev => prev.map(r =>
      r.id === recordId ? { ...r, photos: [...r.photos, photo] } : r
    ))
  }

  const handleDeletePhoto = async (recordId: string, photoId: string) => {
    const res = await fetch(`/api/musculoskeletal/improvement-records/${recordId}/photos/${photoId}`, { method: 'DELETE' })
    if (res.ok) {
      setRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, photos: r.photos.filter(p => p.id !== photoId) } : r
      ))
    }
  }

  const wpName = workplaceName || item.assessment?.workplace?.name || ''
  const orgName = unitName || item.assessment?.organizationUnit?.name || ''
  const completedCount = records.filter(r => r.status === 'COMPLETED').length
  const plannedCount = records.filter(r => r.status === 'PLANNED').length

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
              <h2 className="text-sm font-bold text-gray-900 leading-snug">개선방안 관리</h2>
              {(wpName || orgName) && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3 shrink-0" />
                  {wpName}{wpName && orgName ? ' · ' : ''}{orgName}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Quick Change */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">상태:</span>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                disabled={isSaving}
                className={`px-2.5 py-1 text-xs rounded-full font-medium border transition-all ${
                  status === opt.value
                    ? opt.color + ' ring-2 ring-offset-1 ring-current border-current'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 문제점 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">주요 문제점</label>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                  <Pencil className="w-3 h-3" /> 수정
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={problem}
                onChange={e => setProblem(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2">{item.problem}</p>
            )}
          </div>

          {/* 개선방향 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">개선 검토 방향</label>
            {isEditing ? (
              <textarea
                value={improvement}
                onChange={e => setImprovement(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2">{item.improvement}</p>
            )}
          </div>

          {/* 수집경로 */}
          {item.source && (
            <div>
              <label className="text-xs text-gray-600 mb-1 block">수집경로</label>
              <p className="text-sm text-gray-600">{item.source}</p>
            </div>
          )}

          {/* 수정 중 저장/취소 */}
          {isEditing && (
            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">취소</button>
              <button
                onClick={handleSaveBase}
                disabled={isSaving || !problem.trim() || !improvement.trim()}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}

          {/* 개선이력 영역 */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              개선이력 {!isLoadingRecords && `(${records.length}건)`}
              {completedCount > 0 && <span className="text-green-600 ml-1">· 완료 {completedCount}</span>}
              {plannedCount > 0 && <span className="text-yellow-600 ml-1">· 예정 {plannedCount}</span>}
            </h3>

            {isLoadingRecords ? (
              <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-gray-300 text-sm">등록된 개선이력이 없습니다.</div>
            ) : (
              <div className="space-y-2 mb-2">
                {records.map(rec => {
                  const isDone = rec.status === 'COMPLETED'
                  const isPhotoExpanded = expandedPhotoId === rec.id
                  const isEditingThis = editingRecordId === rec.id

                  if (isEditingThis) {
                    return (
                      <div key={rec.id} className="rounded-lg border border-amber-300 p-3 bg-amber-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-amber-800">이력 수정</h4>
                          <button onClick={cancelEditing} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">상태</label>
                            <select value={editStatus} onChange={e => setEditStatus(e.target.value as 'PLANNED' | 'COMPLETED')}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
                              <option value="PLANNED">예정</option>
                              <option value="COMPLETED">완료</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">{editStatus === 'PLANNED' ? '예정일' : '완료일'}</label>
                            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" required />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">개선 내용 *</label>
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white resize-none" rows={2} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">담당자 *</label>
                          <input type="text" value={editPerson} onChange={e => setEditPerson(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">비고</label>
                          <input type="text" value={editRemarks} onChange={e => setEditRemarks(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" placeholder="선택 입력" />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button onClick={cancelEditing} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">취소</button>
                          <button onClick={() => handleEditSave(rec.id)} disabled={editSaving}
                            className="px-4 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
                            {editSaving ? '저장 중...' : '수정 저장'}
                          </button>
                        </div>
                      </div>
                    )
                  }

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
                                  uploadUrl={`/api/musculoskeletal/improvement-records/${rec.id}/photos`}
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
                          <button onClick={() => startEditing(rec)}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 flex items-center gap-0.5 whitespace-nowrap">
                            <Pencil className="w-3 h-3" /> 수정
                          </button>
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

            <AddRecordForm
              improvementId={item.id}
              workplaceId={workplaceId}
              assessmentId={item.assessmentId}
              onSaved={handleRecordSaved}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
