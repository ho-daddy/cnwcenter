'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Building2,
  Pencil,
} from 'lucide-react'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import MSurveyImprovementPanel, { type MSurveyImprovementItem } from '@/components/musculoskeletal/MSurveyImprovementPanel'

interface Improvement {
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
  createdAt: string
  assessment: {
    id: string
    organizationUnit: {
      name: string
    }
    workplace: {
      id: string
      name: string
    }
  }
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
}

function getStatusLabel(status: string | null) {
  if (status === 'COMPLETED') return '완료'
  if (status === 'PLANNED') return '예정'
  return '미지정'
}

export default function ImprovementPage() {
  const [improvements, setImprovements] = useState<Improvement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<Improvement | null>(null)

  const fetchImprovements = async () => {
    try {
      const res = await fetch('/api/musculoskeletal/improvements')
      if (res.ok) {
        const data = await res.json()
        setImprovements(data.improvements || [])
      }
    } catch (error) {
      console.error('개선사항 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchImprovements()
  }, [])

  // 통계
  const stats = useMemo(() => {
    const planned = improvements.filter(i => i.status === 'PLANNED').length
    const completed = improvements.filter(i => i.status === 'COMPLETED').length
    const unset = improvements.filter(i => !i.status).length
    return { planned, completed, unset }
  }, [improvements])

  // 필터링
  const filteredImprovements = useMemo(() => {
    let result = improvements

    if (statusFilter !== 'all') {
      if (statusFilter === 'unset') {
        result = result.filter(i => !i.status)
      } else {
        result = result.filter(i => i.status === statusFilter)
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.problem.toLowerCase().includes(term) ||
        item.improvement.toLowerCase().includes(term) ||
        item.assessment.organizationUnit.name.toLowerCase().includes(term) ||
        item.assessment.workplace.name.toLowerCase().includes(term)
      )
    }

    return result
  }, [improvements, searchTerm, statusFilter])

  const handleUpdate = (updated: MSurveyImprovementItem) => {
    setImprovements(prev => prev.map(imp =>
      imp.id === updated.id
        ? { ...imp, ...updated, assessment: imp.assessment }
        : imp
    ))
    setSelectedItem(prev =>
      prev && prev.id === updated.id
        ? { ...prev, ...updated, assessment: prev.assessment }
        : prev
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-1.5">개선작업 <HelpTooltip content="근골조사에서 도출된 모든 개선과제를 한 곳에서 조회하고 진행 상태를 관리합니다." /></h1>
          <p className="text-sm text-gray-500 mt-1">
            근골격계유해요인조사에서 도출된 개선과제를 관리합니다.
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'unset' ? 'ring-2 ring-orange-400' : 'hover:shadow-md'}`}
          onClick={() => setStatusFilter(statusFilter === 'unset' ? 'all' : 'unset')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">대기중</p>
                <p className="text-2xl font-bold">{stats.unset}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'PLANNED' ? 'ring-2 ring-blue-400' : 'hover:shadow-md'}`}
          onClick={() => setStatusFilter(statusFilter === 'PLANNED' ? 'all' : 'PLANNED')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">진행중(예정)</p>
                <p className="text-2xl font-bold">{stats.planned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'COMPLETED' ? 'ring-2 ring-green-400' : 'hover:shadow-md'}`}
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'all' : 'COMPLETED')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">완료</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="문제점, 개선방향, 사업장, 평가단위 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="px-3 py-2 text-sm text-gray-500 border rounded-lg hover:bg-gray-50"
              >
                필터 초기화
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 개선사항 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            개선과제 목록
            <span className="text-sm font-normal text-gray-500">
              {filteredImprovements.length}건
              {filteredImprovements.length !== improvements.length && ` (전체 ${improvements.length}건)`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">로딩중...</div>
          ) : filteredImprovements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>등록된 개선과제가 없습니다.</p>
              <p className="text-sm mt-2">
                조사 결과에서 개선방향을 등록하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredImprovements.map((item) => {
                const statusLabel = getStatusLabel(item.status)
                const statusColor = item.status ? (STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600'

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <Building2 className="w-4 h-4" />
                          {item.assessment.workplace.name} /{' '}
                          {item.assessment.organizationUnit.name}
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              주요 문제점
                            </p>
                            <p className="text-sm text-gray-900">{item.problem}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              개선 검토 방향
                            </p>
                            <p className="text-sm text-gray-900">{item.improvement}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          {item.responsiblePerson && (
                            <span>담당: {item.responsiblePerson}</span>
                          )}
                          {item.source && (
                            <span>수집경로: {item.source}</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-3 shrink-0">
                        <Pencil className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement Panel */}
      {selectedItem && (
        <MSurveyImprovementPanel
          item={{
            id: selectedItem.id,
            assessmentId: selectedItem.assessmentId,
            documentNo: selectedItem.documentNo,
            problem: selectedItem.problem,
            improvement: selectedItem.improvement,
            source: selectedItem.source,
            status: selectedItem.status,
            updateDate: selectedItem.updateDate,
            responsiblePerson: selectedItem.responsiblePerson,
            remarks: selectedItem.remarks,
            assessment: selectedItem.assessment,
          }}
          workplaceId={selectedItem.assessment.workplace.id}
          workplaceName={selectedItem.assessment.workplace.name}
          unitName={selectedItem.assessment.organizationUnit.name}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleUpdate}
          onDataChanged={() => fetchImprovements()}
        />
      )}
    </div>
  )
}
