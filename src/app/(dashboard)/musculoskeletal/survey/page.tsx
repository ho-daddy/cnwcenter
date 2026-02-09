'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  ChevronRight,
  Plus,
  Search,
  Filter,
  ClipboardList,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Workplace {
  id: string
  name: string
  businessNumber: string
  _count?: {
    assessments: number
  }
}

interface Assessment {
  id: string
  year: number
  assessmentType: string
  status: string
  organizationUnit: {
    name: string
  }
  workplace: {
    name: string
  }
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '작성중', className: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: '조사중', className: 'bg-orange-100 text-orange-600' },
  COMPLETED: { label: '완료', className: 'bg-green-100 text-green-600' },
  REVIEWED: { label: '검토완료', className: 'bg-blue-100 text-blue-600' },
}

export default function SurveyListPage() {
  const router = useRouter()
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWorkplace, setSelectedWorkplace] = useState<Workplace | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // 사업장 목록 조회
  useEffect(() => {
    const fetchWorkplaces = async () => {
      try {
        const res = await fetch('/api/workplaces')
        if (res.ok) {
          const data = await res.json()
          setWorkplaces(data.workplaces)
        }
      } catch (error) {
        console.error('사업장 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchWorkplaces()
  }, [])

  // 선택된 사업장의 조사 목록 조회
  useEffect(() => {
    if (!selectedWorkplace) {
      setAssessments([])
      return
    }

    const fetchAssessments = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/workplaces/${selectedWorkplace.id}/musculoskeletal`)
        if (res.ok) {
          const data = await res.json()
          setAssessments(data.assessments)
        }
      } catch (error) {
        console.error('조사 목록 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAssessments()
  }, [selectedWorkplace])

  // 필터링된 조사 목록
  const filteredAssessments = assessments.filter((a) => {
    if (searchTerm && !a.organizationUnit.name.includes(searchTerm)) return false
    if (statusFilter && a.status !== statusFilter) return false
    return true
  })

  // 새 조사 시작
  const handleNewAssessment = () => {
    if (selectedWorkplace) {
      router.push(`/musculoskeletal/survey/new?workplaceId=${selectedWorkplace.id}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">조사 실시</h1>
          <p className="text-sm text-gray-500 mt-1">
            사업장을 선택하고 근골격계유해요인조사를 시작하세요.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 사업장 선택 패널 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              사업장 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && workplaces.length === 0 ? (
              <div className="text-center py-8 text-gray-500">로딩중...</div>
            ) : workplaces.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                등록된 사업장이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {workplaces.map((workplace) => (
                  <button
                    key={workplace.id}
                    onClick={() => setSelectedWorkplace(workplace)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedWorkplace?.id === workplace.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{workplace.name}</p>
                        <p className="text-xs text-gray-500">{workplace.businessNumber}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 조사 목록 패널 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  {selectedWorkplace ? `${selectedWorkplace.name} 조사 목록` : '조사 목록'}
                </CardTitle>
                {selectedWorkplace && (
                  <Button onClick={handleNewAssessment}>
                    <Plus className="w-4 h-4 mr-2" />
                    새 조사
                  </Button>
                )}
              </div>
              {/* 필터 */}
              {selectedWorkplace && (
                <div className="flex gap-2 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="평가단위 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">전체 상태</option>
                    <option value="DRAFT">작성중</option>
                    <option value="IN_PROGRESS">조사중</option>
                    <option value="COMPLETED">완료</option>
                    <option value="REVIEWED">검토완료</option>
                  </select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedWorkplace ? (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>왼쪽에서 사업장을 선택하세요.</p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12 text-gray-500">로딩중...</div>
              ) : filteredAssessments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>조사 내역이 없습니다.</p>
                  <Button className="mt-4" onClick={handleNewAssessment}>
                    <Plus className="w-4 h-4 mr-2" />
                    첫 조사 시작하기
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAssessments.map((assessment) => (
                    <button
                      key={assessment.id}
                      onClick={() => router.push(`/musculoskeletal/survey/${assessment.id}`)}
                      className="w-full p-4 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {assessment.organizationUnit.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {assessment.year}년 {assessment.assessmentType}
                          </p>
                        </div>
                        <StatusBadge status={assessment.status} />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        최종 수정:{' '}
                        {format(new Date(assessment.updatedAt), 'yyyy-MM-dd HH:mm', {
                          locale: ko,
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { label, className } = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-gray-100',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
      {label}
    </span>
  )
}
