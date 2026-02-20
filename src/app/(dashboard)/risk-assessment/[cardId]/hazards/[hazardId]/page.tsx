'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ArrowLeft, Plus, Trash2, CheckCircle, Clock } from 'lucide-react'
import { PhotoUploader } from '@/components/ui/photo-uploader'
import {
  getRiskLevel, HAZARD_CATEGORY_LABELS, HAZARD_CATEGORY_COLORS, IMPROVEMENT_STATUS_LABELS,
} from '@/lib/risk-assessment'
import { cn } from '@/lib/utils'

interface Improvement {
  id: string
  status: string
  updateDate: string
  improvementContent: string
  responsiblePerson: string
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  riskScore: number
  remarks: string | null
}

interface HazardPhoto {
  id: string
  photoPath: string
  thumbnailPath?: string | null
}

interface Hazard {
  id: string
  hazardCategory: string
  hazardFactor: string
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  riskScore: number
  improvementPlan: string | null
  chemicalProduct: { name: string } | null
  improvements: Improvement[]
  photos: HazardPhoto[]
}

export default function HazardDetailPage() {
  const { cardId, hazardId } = useParams<{ cardId: string; hazardId: string }>()
  const [hazard, setHazard] = useState<Hazard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [impForm, setImpForm] = useState({
    status: 'PLANNED',
    updateDate: format(new Date(), 'yyyy-MM-dd'),
    improvementContent: '',
    responsiblePerson: '',
    severityScore: 1,
    likelihoodScore: 1,
    additionalPoints: 0,
    remarks: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/risk-assessment/${cardId}/hazards/${hazardId}`)
      .then((r) => r.json())
      .then(setHazard)
      .finally(() => setIsLoading(false))
  }, [cardId, hazardId])

  const handleAddImprovement = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/risk-assessment/${cardId}/hazards/${hazardId}/improvements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(impForm),
      })
      if (res.ok) {
        const newImp = await res.json()
        setHazard((prev) => prev ? { ...prev, improvements: [...prev.improvements, newImp] } : prev)
        setShowAddForm(false)
        setImpForm({ ...impForm, improvementContent: '', responsiblePerson: '', remarks: '' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoUploaded = (photo: HazardPhoto) => {
    setHazard((prev) => prev ? { ...prev, photos: [...prev.photos, photo] } : prev)
  }

  const handleDeletePhoto = async (photoId: string) => {
    const res = await fetch(`/api/risk-assessment/${cardId}/hazards/${hazardId}/photos/${photoId}`, { method: 'DELETE' })
    if (res.ok) {
      setHazard((prev) => prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== photoId) } : prev)
    }
  }

  const handleDeleteImprovement = async (id: string) => {
    if (!confirm('개선이력을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/risk-assessment/improvements/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setHazard((prev) => prev ? { ...prev, improvements: prev.improvements.filter((i) => i.id !== id) } : prev)
    }
  }

  if (isLoading) return <div className="text-center py-20 text-sm text-gray-400">로딩 중...</div>
  if (!hazard) return <div className="text-center py-20 text-sm text-gray-400">위험요인을 찾을 수 없습니다.</div>

  const risk = getRiskLevel(hazard.riskScore)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/risk-assessment/${cardId}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">위험요인 상세</h1>
      </div>

      {/* 위험요인 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium shrink-0', HAZARD_CATEGORY_COLORS[hazard.hazardCategory])}>
            {HAZARD_CATEGORY_LABELS[hazard.hazardCategory]}
          </span>
          <div className={cn('px-3 py-1 rounded-full text-sm font-bold shrink-0', risk.bg, risk.color)}>
            {hazard.riskScore}점 · {risk.label}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">유해위험요인</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{hazard.hazardFactor}</p>
        </div>
        {hazard.chemicalProduct && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">연결 화학물질</p>
            <p className="text-sm text-purple-700">{hazard.chemicalProduct.name}</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100 text-sm text-center">
          <div>
            <p className="text-xs text-gray-500">중대성</p>
            <p className="text-xl font-bold text-gray-900">{hazard.severityScore}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">가능성</p>
            <p className="text-xl font-bold text-gray-900">{hazard.likelihoodScore}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">가점</p>
            <p className="text-xl font-bold text-gray-900">+{hazard.additionalPoints}</p>
          </div>
        </div>
        {hazard.improvementPlan && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">개선 계획</p>
            <p className="text-sm text-gray-800">{hazard.improvementPlan}</p>
          </div>
        )}
        {/* 현장 사진 */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">현장 사진</p>
          <PhotoUploader
            mode="immediate"
            uploadUrl={`/api/risk-assessment/${cardId}/hazards/${hazardId}/photos`}
            existingPhotos={hazard.photos}
            onUploaded={handlePhotoUploaded}
            onDeleteExisting={handleDeletePhoto}
            maxPhotos={10}
            maxFileSize={10 * 1024 * 1024}
          />
        </div>
      </div>

      {/* 개선이력 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">개선이력 ({hazard.improvements.length}건)</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            이력 추가
          </button>
        </div>

        {/* 이력 추가 폼 */}
        {showAddForm && (
          <form onSubmit={handleAddImprovement} className="p-5 border-b border-gray-100 bg-blue-50 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">개선이력 추가</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">상태</label>
                <select value={impForm.status} onChange={(e) => setImpForm({ ...impForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="PLANNED">예정</option>
                  <option value="COMPLETED">완료</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{impForm.status === 'PLANNED' ? '예정일' : '완료일'}</label>
                <input type="date" value={impForm.updateDate} onChange={(e) => setImpForm({ ...impForm, updateDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">개선 내용 *</label>
              <textarea value={impForm.improvementContent} onChange={(e) => setImpForm({ ...impForm, improvementContent: e.target.value })}
                rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y"
                placeholder="개선 조치 내용" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">담당자 *</label>
              <input type="text" value={impForm.responsiblePerson} onChange={(e) => setImpForm({ ...impForm, responsiblePerson: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="개선 담당자명" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['severityScore', 'likelihoodScore', 'additionalPoints'].map((k, i) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {['중대성(개선후)', '가능성(개선후)', '가점(개선후)'][i]}
                  </label>
                  <input type="number" min={k === 'additionalPoints' ? 0 : 1} max={k === 'additionalPoints' ? 3 : 4}
                    value={impForm[k as keyof typeof impForm] as number}
                    onChange={(e) => setImpForm({ ...impForm, [k]: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
              ))}
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

        {hazard.improvements.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">개선이력이 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {hazard.improvements.map((imp) => {
              const impRisk = getRiskLevel(imp.riskScore)
              const isCompleted = imp.status === 'COMPLETED'
              return (
                <div key={imp.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {isCompleted ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" /> 완료
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                            <Clock className="w-3.5 h-3.5" /> 예정
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {format(new Date(imp.updateDate), 'yyyy.MM.dd', { locale: ko })}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', impRisk.bg, impRisk.color)}>
                          개선후 {imp.riskScore}점
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{imp.improvementContent}</p>
                      <p className="text-xs text-gray-500 mt-1">담당: {imp.responsiblePerson}</p>
                      {imp.remarks && <p className="text-xs text-gray-400 mt-0.5">{imp.remarks}</p>}
                    </div>
                    <button onClick={() => handleDeleteImprovement(imp.id)}
                      className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
