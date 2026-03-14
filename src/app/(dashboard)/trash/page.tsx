'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, RotateCcw, Search, ChevronLeft, ChevronRight, Eye, AlertTriangle, X } from 'lucide-react'
import { ARCHIVE_DATA_TYPE_LABELS, type ArchiveDataType } from '@/types/archive'
import { formatDateTime } from '@/lib/utils'

interface ArchiveItem {
  id: string
  workplaceId: string
  dataType: ArchiveDataType
  unitName: string
  unitPath: string
  year: number
  assessmentType: string
  originalAssessmentId: string
  archivedAt: string
  archivedReason: string | null
  deletedBy: { id: string; name: string | null; email: string } | null
  workplace: { id: string; name: string }
}

interface ArchiveDetail {
  id: string
  dataType: string
  unitName: string
  unitPath: string
  year: number
  assessmentType: string
  archivedAt: string
  archivedReason: string | null
  assessmentData: Record<string, unknown>
  workplace: { id: string; name: string }
  deletedBy: { id: string; name: string | null; email: string } | null
}

interface Filters {
  years: number[]
  workplaces: { id: string; name: string }[]
}

const DATA_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  ...Object.entries(ARCHIVE_DATA_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

const REASON_OPTIONS = [
  { value: '', label: '전체' },
  { value: '조직 단위 삭제', label: '조직 삭제' },
  { value: '직접 삭제', label: '직접 삭제' },
]

export default function TrashPage() {
  const [archives, setArchives] = useState<ArchiveItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<Filters>({ years: [], workplaces: [] })
  const [loading, setLoading] = useState(true)

  // 필터 상태
  const [dataType, setDataType] = useState('')
  const [reason, setReason] = useState('')
  const [year, setYear] = useState('')
  const [workplaceId, setWorkplaceId] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 상세보기
  const [detailItem, setDetailItem] = useState<ArchiveDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 확인 모달
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'restore'; ids: string[] } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchArchives = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (dataType) params.set('dataType', dataType)
      if (reason) params.set('reason', reason)
      if (year) params.set('year', year)
      if (workplaceId) params.set('workplaceId', workplaceId)
      if (search) params.set('search', search)

      const res = await fetch(`/api/trash?${params}`)
      const data = await res.json()

      if (res.ok) {
        setArchives(data.archives)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setFilters(data.filters)
      }
    } catch (error) {
      console.error('Failed to fetch archives:', error)
    } finally {
      setLoading(false)
    }
  }, [page, dataType, reason, year, workplaceId, search])

  useEffect(() => {
    fetchArchives()
  }, [fetchArchives])

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [dataType, reason, year, workplaceId, search])

  const handleSearch = () => {
    setSearch(searchInput)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === archives.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(archives.map(a => a.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const viewDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/trash/${id}`)
      const data = await res.json()
      if (res.ok) setDetailItem(data.archived)
    } catch (error) {
      console.error('Failed to fetch detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const executeAction = async () => {
    if (!confirmAction) return
    setActionLoading(true)

    try {
      for (const id of confirmAction.ids) {
        if (confirmAction.type === 'delete') {
          await fetch(`/api/trash/${id}`, { method: 'DELETE' })
        } else {
          await fetch(`/api/trash/${id}/restore`, { method: 'POST' })
        }
      }
      setSelectedIds(new Set())
      setConfirmAction(null)
      setDetailItem(null)
      fetchArchives()
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">휴지통</h1>
        <p className="text-sm text-gray-500 mt-1">
          삭제된 데이터를 확인하고 복원하거나 영구 삭제할 수 있습니다.
        </p>
      </div>

      {/* 필터 바 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          {/* 타입 필터 */}
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {DATA_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* 사유 필터 */}
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {REASON_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* 연도 필터 */}
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">전체 연도</option>
            {filters.years.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>

          {/* 사업장 필터 */}
          <select
            value={workplaceId}
            onChange={(e) => setWorkplaceId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">전체 사업장</option>
            {filters.workplaces.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {/* 검색 */}
          <div className="flex gap-1 ml-auto">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="단위명, 경로 검색..."
              className="rounded-md border border-gray-300 px-3 py-2 text-sm w-48"
            />
            <button
              onClick={handleSearch}
              className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 일괄 작업 바 */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <span className="text-sm text-blue-700 font-medium">
            {selectedIds.size}건 선택됨
          </span>
          <button
            onClick={() => setConfirmAction({ type: 'restore', ids: Array.from(selectedIds) })}
            className="flex items-center gap-1 rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            복원
          </button>
          <button
            onClick={() => setConfirmAction({ type: 'delete', ids: Array.from(selectedIds) })}
            className="flex items-center gap-1 rounded-md bg-red-600 text-white px-3 py-1.5 text-sm hover:bg-red-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            영구 삭제
          </button>
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">불러오는 중...</div>
        ) : archives.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Trash2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>삭제된 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === archives.length && archives.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">유형</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">사업장</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">조직 경로</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">연도</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">사유</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">삭제자</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">삭제일시</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {archives.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTypeBadgeColor(item.dataType)}`}>
                        {ARCHIVE_DATA_TYPE_LABELS[item.dataType] || item.dataType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{item.workplace.name}</td>
                    <td className="px-3 py-3 text-gray-700 max-w-xs truncate" title={item.unitPath}>
                      {item.unitPath}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{item.year}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs ${item.archivedReason === '조직 단위 삭제' ? 'text-orange-600' : 'text-gray-600'}`}>
                        {item.archivedReason || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {item.deletedBy?.name || item.deletedBy?.email || '-'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDateTime(item.archivedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => viewDetail(item.id)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500"
                          title="상세보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'restore', ids: [item.id] })}
                          className="p-1 rounded hover:bg-blue-100 text-blue-600"
                          title="복원"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'delete', ids: [item.id] })}
                          className="p-1 rounded hover:bg-red-100 text-red-600"
                          title="영구 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              총 {total}건 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 상세보기 모달 */}
      {(detailItem || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailItem(null)}>
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="p-8 text-center text-gray-500">불러오는 중...</div>
            ) : detailItem && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">아카이브 상세</h2>
                    <p className="text-sm text-gray-500">
                      {ARCHIVE_DATA_TYPE_LABELS[detailItem.dataType as ArchiveDataType] || detailItem.dataType} — {detailItem.unitPath}
                    </p>
                  </div>
                  <button onClick={() => setDetailItem(null)} className="p-1 rounded hover:bg-gray-100">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* 메타 정보 */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">사업장:</span> <span className="font-medium">{detailItem.workplace.name}</span></div>
                    <div><span className="text-gray-500">연도:</span> <span className="font-medium">{detailItem.year}</span></div>
                    <div><span className="text-gray-500">유형:</span> <span className="font-medium">{detailItem.assessmentType}</span></div>
                    <div><span className="text-gray-500">사유:</span> <span className="font-medium">{detailItem.archivedReason || '-'}</span></div>
                    <div><span className="text-gray-500">삭제자:</span> <span className="font-medium">{detailItem.deletedBy?.name || detailItem.deletedBy?.email || '-'}</span></div>
                    <div><span className="text-gray-500">삭제일시:</span> <span className="font-medium">{formatDateTime(detailItem.archivedAt)}</span></div>
                  </div>

                  {/* JSON 데이터 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">저장된 데이터</h3>
                    <DataViewer data={detailItem.assessmentData} />
                  </div>
                </div>

                <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setDetailItem(null)
                      setConfirmAction({ type: 'restore', ids: [detailItem.id] })
                    }}
                    className="flex items-center gap-1 rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                    복원
                  </button>
                  <button
                    onClick={() => {
                      setDetailItem(null)
                      setConfirmAction({ type: 'delete', ids: [detailItem.id] })
                    }}
                    className="flex items-center gap-1 rounded-md bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    영구 삭제
                  </button>
                  <button
                    onClick={() => setDetailItem(null)}
                    className="ml-auto rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    닫기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${confirmAction.type === 'delete' ? 'bg-red-100' : 'bg-blue-100'}`}>
                {confirmAction.type === 'delete' ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <RotateCcw className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {confirmAction.type === 'delete' ? '영구 삭제' : '복원'}
                </h3>
                <p className="text-sm text-gray-500">
                  {confirmAction.ids.length}건을 {confirmAction.type === 'delete' ? '영구 삭제' : '복원'}하시겠습니까?
                </p>
              </div>
            </div>

            {confirmAction.type === 'delete' && (
              <p className="text-sm text-red-600 mb-4">
                영구 삭제된 데이터는 복구할 수 없습니다.
              </p>
            )}

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className={`rounded-md px-4 py-2 text-sm text-white ${
                  confirmAction.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {actionLoading ? '처리 중...' : confirmAction.type === 'delete' ? '영구 삭제' : '복원'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getTypeBadgeColor(dataType: string): string {
  switch (dataType) {
    case 'MUSCULOSKELETAL': return 'bg-green-100 text-green-700'
    case 'RISK_ASSESSMENT': return 'bg-blue-100 text-blue-700'
    case 'RISK_HAZARD': return 'bg-orange-100 text-orange-700'
    case 'RISK_IMPROVEMENT': return 'bg-purple-100 text-purple-700'
    case 'ELEMENT_WORK': return 'bg-cyan-100 text-cyan-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

// JSON 데이터를 읽기 쉽게 표시하는 컴포넌트
function DataViewer({ data }: { data: unknown }) {
  if (data === null || data === undefined) return <span className="text-gray-400">-</span>

  if (typeof data !== 'object') {
    return <span className="text-gray-700">{String(data)}</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-400">빈 배열</span>
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="border border-gray-100 rounded p-2 bg-gray-50">
            <div className="text-xs text-gray-400 mb-1">#{i + 1}</div>
            <DataViewer data={item} />
          </div>
        ))}
      </div>
    )
  }

  const entries = Object.entries(data as Record<string, unknown>)
  // 제외할 내부 필드
  const skipKeys = new Set(['id', 'createdAt', 'updatedAt', 'cardId', 'hazardId', 'assessmentId', 'recordId', 'workplaceId', 'organizationUnitId', 'createdById'])

  const filteredEntries = entries.filter(([key]) => !skipKeys.has(key))
  if (filteredEntries.length === 0) return <span className="text-gray-400">-</span>

  return (
    <div className="space-y-1">
      {filteredEntries.map(([key, value]) => {
        const isComplex = typeof value === 'object' && value !== null
        return (
          <div key={key} className={isComplex ? 'mt-2' : ''}>
            <span className="text-xs text-gray-500 font-medium">{getFieldLabel(key)}:</span>
            {isComplex ? (
              <div className="ml-3 mt-1">
                <DataViewer data={value} />
              </div>
            ) : (
              <span className="ml-2 text-sm text-gray-700">
                {value === null ? '-' : typeof value === 'boolean' ? (value ? '예' : '아니오') : String(value)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const FIELD_LABELS: Record<string, string> = {
  name: '이름',
  year: '연도',
  workerName: '작업자',
  evaluatorName: '평가자',
  workDescription: '작업내용',
  evaluationType: '평가유형',
  hazardCategory: '유해위험요인 분류',
  hazardFactor: '유해위험요인',
  severityScore: '중대성',
  likelihoodScore: '가능성',
  riskScore: '위험점수',
  improvementPlan: '개선계획',
  improvementContent: '개선내용',
  status: '상태',
  responsiblePerson: '담당자',
  updateDate: '일자',
  photoPath: '사진경로',
  filePath: '파일경로',
  fileName: '파일명',
  description: '설명',
  assessmentType: '조사유형',
  investigatorName: '조사자',
  managementLevel: '관리수준',
  overallComment: '종합의견',
  photos: '사진',
  hazards: '유해위험요인',
  improvements: '개선이력',
  elementWorks: '요소작업',
  attachments: '첨부파일',
  files: '파일',
  bodyPartScores: '부위별점수',
  measurements: '측정도구',
  organizationUnit: '조직 단위',
  createdBy: '작성자',
  additionalPoints: '가점',
  dailyWorkingHours: '1일작업시간',
  dailyProduction: '1일생산량',
  remarks: '비고',
  parentCardId: '상위 카드',
  parentHazardId: '상위 유해요인',
  parentAssessmentId: '상위 조사',
  hazard: '유해위험요인',
  card: '평가카드',
  improvement: '개선이력',
  elementWork: '요소작업',
  assessment: '조사',
}

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key
}
