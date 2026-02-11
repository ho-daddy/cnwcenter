'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  Calculator,
  BarChart3,
  Plus,
  Trash2,
  Edit,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Assessment {
  id: string
  year: number
  assessmentType: string
  status: string
  dailyWorkHours: number | null
  dailyProduction: string | null
  workFrequency: string | null
  employmentType: string | null
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
  { id: 'overview', label: '개요', icon: FileText },
  { id: 'sheet1', label: '1.관리카드', icon: ClipboardList },
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

  // 조사 정보 조회
  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        // 먼저 workplace ID를 찾기 위해 assessments를 조회해야 함
        const res = await fetch(`/api/musculoskeletal/${assessmentId}`)
        if (res.ok) {
          const data = await res.json()
          setAssessment(data.assessment)
        } else {
          console.error('조사 조회 실패')
        }
      } catch (error) {
        console.error('조사 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAssessment()
  }, [assessmentId])

  // 요소작업 추가
  const handleAddElementWork = async () => {
    if (!newWorkName.trim() || !assessment) return

    try {
      const res = await fetch(
        `/api/workplaces/${assessment.workplace.id}/musculoskeletal/${assessmentId}/element-works`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newWorkName }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        setAssessment({
          ...assessment,
          elementWorks: [...assessment.elementWorks, data.elementWork],
        })
        setNewWorkName('')
        setIsAddingWork(false)
      }
    } catch (error) {
      console.error('요소작업 추가 오류:', error)
    }
  }

  // 요소작업 삭제
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

      {/* 탭 콘텐츠 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 기본 정보 */}
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
                    {format(new Date(assessment.createdAt), 'yyyy-MM-dd HH:mm', {
                      locale: ko,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">최종수정</p>
                  <p className="font-medium">
                    {format(new Date(assessment.updatedAt), 'yyyy-MM-dd HH:mm', {
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 진행 상태 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">진행 상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SheetProgress
                label="1번시트 (관리카드)"
                completed={!!assessment.dailyWorkHours}
              />
              <SheetProgress
                label="2번시트 (부위별점수)"
                completed={assessment.elementWorks.some(
                  (w) => w.bodyPartScores.length > 0
                )}
              />
              <SheetProgress
                label="3번시트 (RULA/REBA)"
                completed={assessment.elementWorks.some(
                  (w) => w.rulaScore !== null || w.rebaScore !== null
                )}
              />
              <SheetProgress
                label="4번시트 (종합평가)"
                completed={assessment.status === 'COMPLETED' || assessment.status === 'REVIEWED'}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'overview' && (
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
            {/* 요소작업 추가 폼 */}
            {isAddingWork && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWorkName}
                    onChange={(e) => setNewWorkName(e.target.value)}
                    placeholder="요소작업명 입력"
                    className="flex-1 px-3 py-2 border rounded-lg"
                    autoFocus
                  />
                  <Button onClick={handleAddElementWork} disabled={!newWorkName.trim()}>
                    추가
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingWork(false)
                      setNewWorkName('')
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}

            {/* 요소작업 목록 */}
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
                    <div
                      key={work.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 font-bold rounded-full">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{work.name}</p>
                        {work.description && (
                          <p className="text-sm text-gray-500 truncate">{work.description}</p>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/musculoskeletal/survey/${assessmentId}/work/${work.id}`
                            )
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteElementWork(work.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 시트별 콘텐츠 - 추후 구현 */}
      {activeTab === 'sheet1' && (
        <Sheet1Content
          assessment={assessment}
          workplaceId={assessment.workplace.id}
          onUpdate={(updated) => setAssessment({ ...assessment, ...updated })}
        />
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

// Sheet1 Content Component
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
    dailyWorkHours: assessment.dailyWorkHours || '',
    dailyProduction: assessment.dailyProduction || '',
    workFrequency: assessment.workFrequency || '상시',
    employmentType: assessment.employmentType || '정규직',
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
            dailyWorkHours: formData.dailyWorkHours
              ? parseFloat(formData.dailyWorkHours as string)
              : null,
            dailyProduction: formData.dailyProduction || null,
            workFrequency: formData.workFrequency,
            employmentType: formData.employmentType,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">1번시트: 관리카드 (기본정보)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1일 작업시간 (시간)
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.dailyWorkHours}
              onChange={(e) => setFormData({ ...formData, dailyWorkHours: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="예: 8"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1일 생산량
            </label>
            <input
              type="text"
              value={formData.dailyProduction}
              onChange={(e) => setFormData({ ...formData, dailyProduction: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="예: 100개/일"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작업빈도</label>
            <select
              value={formData.workFrequency}
              onChange={(e) => setFormData({ ...formData, workFrequency: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="정규직">정규직</option>
              <option value="계약직">계약직</option>
              <option value="파견직">파견직</option>
              <option value="일용직">일용직</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Sheet2 Content Component - 부위별 점수 입력
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
            <p className="text-sm mt-2">개요 탭에서 먼저 요소작업을 추가하세요.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 요소작업 목록 */}
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
                const scoreCount = work.bodyPartScores.filter(s => s.totalScore > 0).length
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
                        <span className="text-xs text-green-600">
                          {scoreCount}/6 부위 입력됨
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* 부위별 점수 입력 */}
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
                  const score = selectedWork.bodyPartScores.find(
                    (s) => s.bodyPart === part.id
                  )
                  return (
                    <div
                      key={part.id}
                      className={`p-4 rounded-lg border-2 text-center ${
                        score && score.totalScore > 0
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <span className="block text-sm font-medium text-gray-900 mb-2">{part.name}</span>
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
                    router.push(`/musculoskeletal/survey/${assessment.id}/work/${selectedWork.id}`)
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

// Sheet4 Content Component - 종합평가
const MANAGEMENT_LEVELS = [
  { value: '상', label: '상 (7점)', minScore: 7, color: 'bg-red-100 text-red-700 border-red-300' },
  { value: '중상', label: '중상 (5-6점)', minScore: 5, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: '중', label: '중 (3-4점)', minScore: 3, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: '하', label: '하 (1-2점)', minScore: 1, color: 'bg-green-100 text-green-700 border-green-300' },
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

  // 최고 점수 계산
  const maxScore = Math.max(
    ...assessment.elementWorks.flatMap((w) =>
      w.bodyPartScores.map((s) => s.totalScore)
    ),
    0
  )

  // 권장 관리등급
  const recommendedLevel = maxScore >= 7 ? '상' : maxScore >= 5 ? '중상' : maxScore >= 3 ? '중' : '하'

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
      {/* 점수 요약 테이블 */}
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
                      <th key={part.id} className="text-center p-3 font-medium whitespace-nowrap">
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

      {/* 관리등급 및 종합의견 */}
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
                  onClick={() =>
                    setFormData({ ...formData, managementLevel: level.value })
                  }
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
              onChange={(e) =>
                setFormData({ ...formData, overallComment: e.target.value })
              }
              rows={6}
              className="w-full px-3 py-2 border rounded-lg resize-none"
              placeholder="조사 결과에 대한 종합적인 의견을 작성하세요..."
            />
          </CardContent>
        </Card>
      </div>

      {/* 저장 버튼 */}
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

// Sheet3 Content Component - RULA/REBA 요소작업 목록
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
            <p className="text-sm mt-2">개요 탭에서 먼저 요소작업을 추가하세요.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="py-4">
          <p className="text-sm text-purple-800">
            각 요소작업을 선택하여 RULA/REBA 평가를 진행하세요.
            RULA는 상지 중심, REBA는 전신 자세 평가에 적합합니다.
          </p>
        </CardContent>
      </Card>

      {/* Element Work List */}
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
                          <span className="text-xs text-gray-400">
                            평가 미실시
                          </span>
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

      {/* Summary */}
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
