'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  FileText,
  Calculator,
  BarChart3,
  Plus,
  Trash2,
  Edit,
  Loader2,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  Camera,
  X,
  Image as ImageIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  OCCASIONAL_REASON_OPTIONS,
  WORK_DAYS_OPTIONS,
  SHIFT_TYPE_OPTIONS,
  JOB_AUTONOMY_OPTIONS,
  OTHER_RISK_OPTIONS,
  AFFECTED_BODY_PARTS,
  WORK_CONDITION_CHANGES,
  CHANGE_OPTIONS,
} from '@/types/musculoskeletal'

interface Assessment {
  id: string
  year: number
  assessmentType: string
  status: string
  workerName: string | null
  investigatorName: string | null
  occasionalReason: string | null
  occasionalReasonCustom: string | null
  dailyWorkHours: number | null
  dailyProduction: string | null
  workFrequency: string | null
  employmentType: string | null
  workDays: string | null
  workDaysCustom: string | null
  shiftType: string | null
  shiftTypeCustom: string | null
  jobAutonomy: number | null
  hasNoise: boolean
  hasThermal: boolean
  hasBurn: boolean
  hasDust: boolean
  hasAccident: boolean
  hasStress: boolean
  hasOtherRisk: boolean
  otherRiskDetail: string | null
  affectedHandWrist: boolean
  affectedElbow: boolean
  affectedShoulder: boolean
  affectedNeck: boolean
  affectedBack: boolean
  affectedKnee: boolean
  changeWorkHours: string | null
  changeWorkSpeed: string | null
  changeManpower: string | null
  changeWorkload: string | null
  changeEquipment: string | null
  reference: string | null
  workplace: {
    id: string
    name: string
  }
  organizationUnit: {
    id: string
    name: string
  }
  elementWorks: ElementWork[]
  createdAt: string
  updatedAt: string
}

interface ElementWork {
  id: string
  sortOrder: number
  name: string
  description: string | null
  bodyPartScores: {
    bodyPart: string
    totalScore: number
  }[]
  rulaScore: number | null
  rebaScore: number | null
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '작성중', className: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: '조사중', className: 'bg-orange-100 text-orange-600' },
  COMPLETED: { label: '완료', className: 'bg-green-100 text-green-600' },
  REVIEWED: { label: '검토완료', className: 'bg-blue-100 text-blue-600' },
}

const SHEET_TABS = [
  { id: 'overview', label: '개요·관리카드', icon: FileText },
  { id: 'sheet2', label: '2.부위별점수', icon: Calculator },
  { id: 'sheet3', label: '3.RULA/REBA', icon: BarChart3 },
  { id: 'sheet4', label: '4.종합평가', icon: CheckCircle },
]

export default function SurveyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingWork, setIsAddingWork] = useState(false)
  const [newWorkName, setNewWorkName] = useState('')
  const [newWorkDescription, setNewWorkDescription] = useState('')

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const res = await fetch(`/api/musculoskeletal/${assessmentId}`)
        if (res.ok) {
          const data = await res.json()
          setAssessment(data.assessment)
        }
      } catch (error) {
        console.error('조사 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAssessment()
  }, [assessmentId])

  const handleAddElementWork = async () => {
    if (!newWorkName.trim() || !assessment) return
    try {
      const res = await fetch(
        `/api/workplaces/${assessment.workplace.id}/musculoskeletal/${assessmentId}/element-works`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newWorkName, description: newWorkDescription }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        setAssessment({
          ...assessment,
          elementWorks: [...assessment.elementWorks, data.elementWork],
        })
        setNewWorkName('')
        setNewWorkDescription('')
        setIsAddingWork(false)
      }
    } catch (error) {
      console.error('요소작업 추가 오류:', error)
    }
  }

  const handleDeleteElementWork = async (workId: string) => {
    if (!assessment || !confirm('이 요소작업을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(
        `/api/workplaces/${assessment.workplace.id}/musculoskeletal/${assessmentId}/element-works/${workId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setAssessment({
          ...assessment,
          elementWorks: assessment.elementWorks.filter((w) => w.id !== workId),
        })
      }
    } catch (error) {
      console.error('요소작업 삭제 오류:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <p className="text-gray-500">조사를 찾을 수 없습니다.</p>
        <Button className="mt-4" onClick={() => router.push('/musculoskeletal/survey')}>
          목록으로
        </Button>
      </div>
    )
  }

  const { label: statusLabel, className: statusClass } =
    STATUS_CONFIG[assessment.status] || { label: assessment.status, className: 'bg-gray-100' }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {assessment.organizationUnit.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {assessment.workplace.name} · {assessment.year}년 {assessment.assessmentType}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {SHEET_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 개요·관리카드 통합 탭 */}
      {activeTab === 'overview' && (
        <>
          {/* 기본 정보 + 진행상태 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">기본 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">사업장</p>
                    <p className="font-medium">{assessment.workplace.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">평가대상</p>
                    <p className="font-medium">{assessment.organizationUnit.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">조사년도</p>
                    <p className="font-medium">{assessment.year}년</p>
                  </div>
                  <div>
                    <p className="text-gray-500">조사유형</p>
                    <p className="font-medium">{assessment.assessmentType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">생성일</p>
                    <p className="font-medium">
                      {format(new Date(assessment.createdAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">최종수정</p>
                    <p className="font-medium">
                      {format(new Date(assessment.updatedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">진행 상태</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SheetProgress label="관리카드" completed={!!assessment.dailyWorkHours} />
                <SheetProgress
                  label="부위별점수"
                  completed={assessment.elementWorks.some((w) => w.bodyPartScores.length > 0)}
                />
                <SheetProgress
                  label="RULA/REBA"
                  completed={assessment.elementWorks.some(
                    (w) => w.rulaScore !== null || w.rebaScore !== null
                  )}
                />
                <SheetProgress
                  label="종합평가"
                  completed={assessment.status === 'COMPLETED' || assessment.status === 'REVIEWED'}
                />
              </CardContent>
            </Card>
          </div>

          {/* 관리카드 폼 */}
          <Sheet1Content
            assessment={assessment}
            workplaceId={assessment.workplace.id}
            onUpdate={(updated) => setAssessment({ ...assessment, ...updated })}
          />

          {/* 요소작업 목록 (작업내용·사진 입력 포함) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">요소작업 목록</CardTitle>
                <Button size="sm" onClick={() => setIsAddingWork(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  요소작업 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAddingWork && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWorkName}
                      onChange={(e) => setNewWorkName(e.target.value)}
                      placeholder="요소작업명 입력"
                      className="flex-1 px-3 py-2 border rounded-lg"
                      autoFocus
                    />
                  </div>
                  <textarea
                    value={newWorkDescription}
                    onChange={(e) => setNewWorkDescription(e.target.value)}
                    placeholder="작업내용 입력 (선택사항)"
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddElementWork} disabled={!newWorkName.trim()}>
                      추가
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingWork(false)
                        setNewWorkName('')
                        setNewWorkDescription('')
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}

              {assessment.elementWorks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>등록된 요소작업이 없습니다.</p>
                  <Button className="mt-4" onClick={() => setIsAddingWork(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    첫 요소작업 추가
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {assessment.elementWorks
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((work, index) => (
                      <ElementWorkItem
                        key={work.id}
                        work={work}
                        index={index}
                        assessmentId={assessmentId}
                        workplaceId={assessment.workplace.id}
                        onDelete={() => handleDeleteElementWork(work.id)}
                        onNavigate={() =>
                          router.push(`/musculoskeletal/survey/${assessmentId}/work/${work.id}`)
                        }
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'sheet2' && (
        <Sheet2Content
          assessment={assessment}
          workplaceId={assessment.workplace.id}
          onUpdate={(elementWorks) => setAssessment({ ...assessment, elementWorks })}
        />
      )}

      {activeTab === 'sheet3' && (
        <Sheet3Content
          assessment={assessment}
          workplaceId={assessment.workplace.id}
        />
      )}

      {activeTab === 'sheet4' && (
        <Sheet4Content
          assessment={assessment}
          workplaceId={assessment.workplace.id}
          onUpdate={(data) => setAssessment({ ...assessment, ...data })}
        />
      )}
    </div>
  )
}

function SheetProgress({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          completed ? 'bg-green-500' : 'bg-gray-200'
        }`}
      >
        {completed && <CheckCircle className="w-3 h-3 text-white" />}
      </div>
      <span className={`text-sm ${completed ? 'text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  )
}

// 요소작업 아이템 (사진 업로드 포함)
function ElementWorkItem({
  work,
  index,
  assessmentId,
  workplaceId,
  onDelete,
  onNavigate,
}: {
  work: ElementWork
  index: number
  assessmentId: string
  workplaceId: string
  onDelete: () => void
  onNavigate: () => void
}) {
  const [photos, setPhotos] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotos((prev) => [...prev, ev.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            if (ev.target?.result) {
              setPhotos((prev) => [...prev, ev.target!.result as string])
            }
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  return (
    <div className="p-4 rounded-lg border hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 font-bold rounded-full">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900">{work.name}</p>
          {work.description && (
            <p className="text-sm text-gray-500 mt-1">{work.description}</p>
          )}
          <div className="flex gap-2 mt-1">
            {work.bodyPartScores.length > 0 && (
              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">
                부위점수 {work.bodyPartScores.length}/6
              </span>
            )}
            {work.rulaScore !== null && (
              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                RULA {work.rulaScore}
              </span>
            )}
            {work.rebaScore !== null && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
                REBA {work.rebaScore}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onNavigate}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 사진 입력 영역 */}
      <div className="mt-3 ml-12" onPaste={handlePaste}>
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative w-20 h-20 rounded border overflow-hidden group">
              <img src={photo} alt={`사진 ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px] mt-1">사진추가</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <p className="text-[10px] text-gray-400 mt-1">모바일 촬영/데스크탑 파일 선택/붙여넣기 가능</p>
      </div>
    </div>
  )
}

// =====================================================
// Sheet1 Content Component - 관리카드 (확장)
// =====================================================
function Sheet1Content({
  assessment,
  workplaceId,
  onUpdate,
}: {
  assessment: Assessment
  workplaceId: string
  onUpdate: (data: Partial<Assessment>) => void
}) {
  const [formData, setFormData] = useState({
    workerName: assessment.workerName || '',
    investigatorName: assessment.investigatorName || '',
    occasionalReason: assessment.occasionalReason || '',
    occasionalReasonCustom: assessment.occasionalReasonCustom || '',
    dailyWorkHours: assessment.dailyWorkHours ?? '',
    dailyProduction: assessment.dailyProduction || '',
    workFrequency: assessment.workFrequency || '상시',
    employmentType: assessment.employmentType || '정규직',
    workDays: assessment.workDays || '주5일',
    workDaysCustom: assessment.workDaysCustom || '',
    shiftType: assessment.shiftType || '주간고정',
    shiftTypeCustom: assessment.shiftTypeCustom || '',
    jobAutonomy: assessment.jobAutonomy ?? null,
    // 기타 위험요인
    hasNoise: assessment.hasNoise,
    hasThermal: assessment.hasThermal,
    hasBurn: assessment.hasBurn,
    hasDust: assessment.hasDust,
    hasAccident: assessment.hasAccident,
    hasStress: assessment.hasStress,
    hasOtherRisk: assessment.hasOtherRisk,
    otherRiskDetail: assessment.otherRiskDetail || '',
    // 부담부위
    affectedHandWrist: assessment.affectedHandWrist,
    affectedElbow: assessment.affectedElbow,
    affectedShoulder: assessment.affectedShoulder,
    affectedNeck: assessment.affectedNeck,
    affectedBack: assessment.affectedBack,
    affectedKnee: assessment.affectedKnee,
    // 작업조건 변화
    changeWorkHours: assessment.changeWorkHours || 'NO_CHANGE',
    changeWorkSpeed: assessment.changeWorkSpeed || 'NO_CHANGE',
    changeManpower: assessment.changeManpower || 'NO_CHANGE',
    changeWorkload: assessment.changeWorkload || 'NO_CHANGE',
    changeEquipment: assessment.changeEquipment || 'NO_CHANGE',
    // 참조
    reference: assessment.reference || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/musculoskeletal/${assessment.id}/sheet1`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            dailyWorkHours: formData.dailyWorkHours
              ? parseFloat(formData.dailyWorkHours as string)
              : null,
            jobAutonomy: formData.jobAutonomy,
          }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        onUpdate(data.assessment)
        alert('저장되었습니다.')
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const setField = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">관리카드</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 작업자 / 조사자 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작업자</label>
            <input
              type="text"
              value={formData.workerName}
              onChange={(e) => setField('workerName', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="작업자명"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">조사자</label>
            <input
              type="text"
              value={formData.investigatorName}
              onChange={(e) => setField('investigatorName', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="조사자명"
            />
          </div>
        </div>

        {/* 정기조사/수시조사 사유 */}
        {assessment.assessmentType === '수시조사' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">수시조사 사유</label>
            <div className="flex flex-wrap gap-3">
              {OCCASIONAL_REASON_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="occasionalReason"
                    value={opt.value}
                    checked={formData.occasionalReason === opt.value}
                    onChange={(e) => setField('occasionalReason', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            {formData.occasionalReason === '기타' && (
              <input
                type="text"
                value={formData.occasionalReasonCustom}
                onChange={(e) => setField('occasionalReasonCustom', e.target.value)}
                className="mt-2 w-full px-3 py-2 border rounded-lg"
                placeholder="기타 사유 입력"
              />
            )}
          </div>
        )}

        {/* 작업조건 기본 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1일 작업시간 (시간)
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.dailyWorkHours}
              onChange={(e) => setField('dailyWorkHours', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="예: 8"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">1일 생산량</label>
            <input
              type="text"
              value={formData.dailyProduction}
              onChange={(e) => setField('dailyProduction', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="예: 100개/일"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작업빈도</label>
            <select
              value={formData.workFrequency}
              onChange={(e) => setField('workFrequency', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="상시">상시</option>
              <option value="간헐">간헐</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">고용형태</label>
            <select
              value={formData.employmentType}
              onChange={(e) => setField('employmentType', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="정규직">정규직</option>
              <option value="계약직">계약직</option>
              <option value="파견직">파견직</option>
              <option value="일용직">일용직</option>
            </select>
          </div>
        </div>

        {/* 작업일수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">작업일수</label>
          <div className="flex flex-wrap gap-3">
            {WORK_DAYS_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="workDays"
                  value={opt.value}
                  checked={formData.workDays === opt.value}
                  onChange={(e) => setField('workDays', e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          {formData.workDays === '기타' && (
            <input
              type="text"
              value={formData.workDaysCustom}
              onChange={(e) => setField('workDaysCustom', e.target.value)}
              className="mt-2 w-full max-w-xs px-3 py-2 border rounded-lg"
              placeholder="직접 입력"
            />
          )}
        </div>

        {/* 교대근무형태 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">교대근무형태</label>
          <div className="flex flex-wrap gap-3">
            {SHIFT_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shiftType"
                  value={opt.value}
                  checked={formData.shiftType === opt.value}
                  onChange={(e) => setField('shiftType', e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          {formData.shiftType === '기타' && (
            <input
              type="text"
              value={formData.shiftTypeCustom}
              onChange={(e) => setField('shiftTypeCustom', e.target.value)}
              className="mt-2 w-full max-w-xs px-3 py-2 border rounded-lg"
              placeholder="직접 입력"
            />
          )}
        </div>

        {/* 직무자율성 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">직무자율성</label>
          <div className="space-y-2">
            {JOB_AUTONOMY_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="jobAutonomy"
                  value={opt.value}
                  checked={formData.jobAutonomy === opt.value}
                  onChange={() => setField('jobAutonomy', opt.value)}
                  className="w-4 h-4 mt-0.5"
                />
                <span className="text-sm text-gray-700">{opt.value}. {opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 기타 위험요인 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">기타 위험요인</label>
          <div className="flex flex-wrap gap-3">
            {OTHER_RISK_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(formData as Record<string, unknown>)[opt.key]}
                  onChange={(e) => setField(opt.key, e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          {formData.hasOtherRisk && (
            <input
              type="text"
              value={formData.otherRiskDetail}
              onChange={(e) => setField('otherRiskDetail', e.target.value)}
              className="mt-2 w-full max-w-md px-3 py-2 border rounded-lg"
              placeholder="기타 위험요인 입력"
            />
          )}
        </div>

        {/* 부담부위 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">부담부위</label>
          <div className="flex flex-wrap gap-3">
            {AFFECTED_BODY_PARTS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(formData as Record<string, unknown>)[opt.key]}
                  onChange={(e) => setField(opt.key, e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 작업조건 변화 (최근 3년) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            작업조건 변화 (최근 3년)
          </label>
          <div className="space-y-2">
            {WORK_CONDITION_CHANGES.map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm text-gray-700">{item.label}</span>
                <div className="flex gap-4">
                  {CHANGE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={item.key}
                        value={opt.value}
                        checked={(formData as Record<string, unknown>)[item.key] === opt.value}
                        onChange={(e) => setField(item.key, e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 참조 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">참조</label>
          <textarea
            value={formData.reference}
            onChange={(e) => setField('reference', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg resize-none"
            placeholder="자유형식으로 참조사항을 입력하세요..."
          />
        </div>

        {/* 저장 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '관리카드 저장'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================================
// Sheet2 Content Component
// =====================================================
const BODY_PARTS = [
  { id: 'HAND_WRIST', name: '손/손목', color: 'blue' },
  { id: 'ELBOW_FOREARM', name: '팔꿈치/아래팔', color: 'green' },
  { id: 'SHOULDER_ARM', name: '어깨/위팔', color: 'yellow' },
  { id: 'NECK', name: '목', color: 'orange' },
  { id: 'BACK_HIP', name: '허리/고관절', color: 'red' },
  { id: 'KNEE_ANKLE', name: '무릎/발목', color: 'purple' },
]

function Sheet2Content({
  assessment,
  workplaceId,
  onUpdate,
}: {
  assessment: Assessment
  workplaceId: string
  onUpdate: (elementWorks: ElementWork[]) => void
}) {
  const router = useRouter()
  const [selectedWork, setSelectedWork] = useState<ElementWork | null>(
    assessment.elementWorks.length > 0 ? assessment.elementWorks[0] : null
  )

  if (assessment.elementWorks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p>등록된 요소작업이 없습니다.</p>
            <p className="text-sm mt-2">개요·관리카드 탭에서 먼저 요소작업을 추가하세요.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">요소작업 선택</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-1">
            {assessment.elementWorks
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((work, index) => {
                const isSelected = selectedWork?.id === work.id
                const scoreCount = work.bodyPartScores.filter((s) => s.totalScore > 0).length
                return (
                  <button
                    key={work.id}
                    onClick={() => setSelectedWork(work)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate">{work.name}</span>
                    </div>
                    {scoreCount > 0 && (
                      <div className="mt-1 ml-8">
                        <span className="text-xs text-green-600">{scoreCount}/6 부위 입력됨</span>
                      </div>
                    )}
                  </button>
                )
              })}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedWork ? `${selectedWork.name} - 부위별 점수` : '요소작업을 선택하세요'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedWork ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {BODY_PARTS.map((part) => {
                  const score = selectedWork.bodyPartScores.find((s) => s.bodyPart === part.id)
                  return (
                    <div
                      key={part.id}
                      className={`p-4 rounded-lg border-2 text-center ${
                        score && score.totalScore > 0
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <span className="block text-sm font-medium text-gray-900 mb-2">
                        {part.name}
                      </span>
                      {score && score.totalScore > 0 ? (
                        <span className="text-2xl font-bold text-green-600">
                          {score.totalScore}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={() =>
                    router.push(
                      `/musculoskeletal/survey/${assessment.id}/work/${selectedWork.id}`
                    )
                  }
                >
                  <Edit className="w-4 h-4 mr-2" />
                  부위별 점수 입력하기
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>왼쪽에서 요소작업을 선택하세요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =====================================================
// Sheet3 Content Component
// =====================================================
function Sheet3Content({
  assessment,
  workplaceId,
}: {
  assessment: Assessment
  workplaceId: string
}) {
  const router = useRouter()

  if (assessment.elementWorks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p>등록된 요소작업이 없습니다.</p>
            <p className="text-sm mt-2">개요·관리카드 탭에서 먼저 요소작업을 추가하세요.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="py-4">
          <p className="text-sm text-purple-800">
            각 요소작업을 선택하여 RULA/REBA 평가를 진행하세요.
            RULA는 상지 중심, REBA는 전신 자세 평가에 적합합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">요소작업별 RULA/REBA 평가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assessment.elementWorks
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((work, index) => {
                const hasRula = work.rulaScore !== null
                const hasReba = work.rebaScore !== null
                return (
                  <div
                    key={work.id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-600 font-bold rounded-full">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{work.name}</p>
                      <div className="flex gap-2 mt-1">
                        {hasRula && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                            RULA {work.rulaScore}
                          </span>
                        )}
                        {hasReba && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                            REBA {work.rebaScore}
                          </span>
                        )}
                        {!hasRula && !hasReba && (
                          <span className="text-xs text-gray-400">평가 미실시</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/musculoskeletal/survey/${assessment.id}/work/${work.id}?tab=sheet3`
                        )
                      }
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      RULA/REBA 입력
                    </Button>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {assessment.elementWorks.some((w) => w.rulaScore !== null || w.rebaScore !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">평가 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">요소작업</th>
                    <th className="text-center p-3 font-medium">RULA</th>
                    <th className="text-center p-3 font-medium">REBA</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.elementWorks
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .filter((w) => w.rulaScore !== null || w.rebaScore !== null)
                    .map((work) => (
                      <tr key={work.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{work.name}</td>
                        <td className="text-center p-3">
                          {work.rulaScore !== null ? (
                            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                              {work.rulaScore}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="text-center p-3">
                          {work.rebaScore !== null ? (
                            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                              {work.rebaScore}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =====================================================
// Sheet4 Content Component - 종합평가
// =====================================================
const MANAGEMENT_LEVELS = [
  { value: '상', label: '상 (7점)', minScore: 7, color: 'bg-red-100 text-red-700 border-red-300' },
  {
    value: '중상',
    label: '중상 (5-6점)',
    minScore: 5,
    color: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  {
    value: '중',
    label: '중 (3-4점)',
    minScore: 3,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  {
    value: '하',
    label: '하 (1-2점)',
    minScore: 1,
    color: 'bg-green-100 text-green-700 border-green-300',
  },
]

function Sheet4Content({
  assessment,
  workplaceId,
  onUpdate,
}: {
  assessment: Assessment
  workplaceId: string
  onUpdate: (data: Partial<Assessment>) => void
}) {
  const [formData, setFormData] = useState({
    managementLevel: (assessment as any).managementLevel || '',
    overallComment: (assessment as any).overallComment || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const maxScore = Math.max(
    ...assessment.elementWorks.flatMap((w) => w.bodyPartScores.map((s) => s.totalScore)),
    0
  )

  const recommendedLevel =
    maxScore >= 7 ? '상' : maxScore >= 5 ? '중상' : maxScore >= 3 ? '중' : '하'

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/musculoskeletal/${assessment.id}/sheet4`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      )
      if (res.ok) {
        const data = await res.json()
        onUpdate(data.assessment)
        alert('저장되었습니다.')
      } else {
        const error = await res.json()
        alert(error.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">요소작업별 점수 요약</CardTitle>
        </CardHeader>
        <CardContent>
          {assessment.elementWorks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>등록된 요소작업이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">요소작업</th>
                    {BODY_PARTS.map((part) => (
                      <th
                        key={part.id}
                        className="text-center p-3 font-medium whitespace-nowrap"
                      >
                        {part.name}
                      </th>
                    ))}
                    <th className="text-center p-3 font-medium">최고점</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.elementWorks
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((work) => {
                      const workMaxScore = Math.max(
                        ...work.bodyPartScores.map((s) => s.totalScore),
                        0
                      )
                      return (
                        <tr key={work.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{work.name}</td>
                          {BODY_PARTS.map((part) => {
                            const score = work.bodyPartScores.find(
                              (s) => s.bodyPart === part.id
                            )
                            return (
                              <td key={part.id} className="text-center p-3">
                                {score ? (
                                  <span
                                    className={`inline-block w-8 h-8 leading-8 rounded-full text-sm font-medium ${
                                      score.totalScore >= 7
                                        ? 'bg-red-100 text-red-700'
                                        : score.totalScore >= 5
                                          ? 'bg-orange-100 text-orange-700'
                                          : score.totalScore >= 3
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {score.totalScore}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="text-center p-3">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                                workMaxScore >= 7
                                  ? 'bg-red-100 text-red-700'
                                  : workMaxScore >= 5
                                    ? 'bg-orange-100 text-orange-700'
                                    : workMaxScore >= 3
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {workMaxScore > 0 ? workMaxScore : '-'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">관리등급</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {maxScore > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  최고 점수 <strong>{maxScore}점</strong>을 기준으로 권장 등급은{' '}
                  <strong>&quot;{recommendedLevel}&quot;</strong>입니다.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {MANAGEMENT_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setFormData({ ...formData, managementLevel: level.value })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.managementLevel === level.value
                      ? level.color + ' border-current'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className="block font-medium">{level.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">종합 의견</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={formData.overallComment}
              onChange={(e) => setFormData({ ...formData, overallComment: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg resize-none"
              placeholder="조사 결과에 대한 종합적인 의견을 작성하세요..."
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            '종합평가 저장'
          )}
        </Button>
      </div>
    </div>
  )
}
