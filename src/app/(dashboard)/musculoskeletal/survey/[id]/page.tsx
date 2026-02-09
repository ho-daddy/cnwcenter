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
        <div className="text-center py-12 text-gray-500">
          <Calculator className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p>2번시트 (부위별 점수 입력)는 요소작업별로 입력합니다.</p>
          <p className="text-sm mt-2">위의 요소작업 목록에서 작업을 선택하세요.</p>
        </div>
      )}

      {activeTab === 'sheet3' && (
        <div className="text-center py-12 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p>3번시트 (RULA/REBA)는 요소작업별로 입력합니다.</p>
          <p className="text-sm mt-2">위의 요소작업 목록에서 작업을 선택하세요.</p>
        </div>
      )}

      {activeTab === 'sheet4' && (
        <div className="text-center py-12 text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p>4번시트 (종합평가) 기능 준비중입니다.</p>
        </div>
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
