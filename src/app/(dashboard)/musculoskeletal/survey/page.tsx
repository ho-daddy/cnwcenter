'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  ClipboardList,
  FileText,
  Calculator,
  BarChart3,
  CheckCircle,
  Loader2,
  AlertCircle,
  Trash2,
  Edit,
  X,
  FolderTree,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

// Import modals
import { Sheet2Modal } from '@/components/musculoskeletal/sheet2-modal'
import { Sheet3Modal } from '@/components/musculoskeletal/sheet3-modal'

interface Workplace {
  id: string
  name: string
  businessNumber: string
  _count?: {
    assessments: number
  }
}

interface OrganizationUnit {
  id: string
  name: string
  level: number
  isLeaf: boolean
  parentId: string | null
  children: OrganizationUnit[]
}

// Utility function to transform flat array to tree structure
function buildOrganizationTree(flatUnits: OrganizationUnit[]): OrganizationUnit[] {
  // Create a map for quick lookup
  const unitMap = new Map<string, OrganizationUnit>()

  // First pass: create all nodes with empty children arrays
  flatUnits.forEach((unit) => {
    unitMap.set(unit.id, { ...unit, children: [] })
  })

  // Second pass: build the tree structure
  const roots: OrganizationUnit[] = []

  flatUnits.forEach((unit) => {
    const node = unitMap.get(unit.id)!
    if (unit.parentId && unitMap.has(unit.parentId)) {
      // Has a parent - add as child
      const parent = unitMap.get(unit.parentId)!
      parent.children.push(node)
    } else {
      // No parent or parent not found - it's a root node
      roots.push(node)
    }
  })

  // Sort children by level and sortOrder if available
  const sortChildren = (units: OrganizationUnit[]) => {
    units.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ko'))
    units.forEach((unit) => {
      if (unit.children.length > 0) {
        sortChildren(unit.children)
      }
    })
  }

  sortChildren(roots)

  return roots
}

interface Assessment {
  id: string
  year: number
  assessmentType: string
  status: string
  dailyWorkHours: number | null
  dailyProduction: string | null
  workFrequency: string | null
  employmentType: string | null
  managementLevel: string | null
  overallComment: string | null
  organizationUnit: {
    id: string
    name: string
  }
  workplace: {
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

const BODY_PARTS = [
  { id: 'HAND_WRIST', name: '손/손목' },
  { id: 'ELBOW_FOREARM', name: '팔꿈치/아래팔' },
  { id: 'SHOULDER_ARM', name: '어깨/위팔' },
  { id: 'NECK', name: '목' },
  { id: 'BACK_HIP', name: '허리/고관절' },
  { id: 'KNEE_ANKLE', name: '무릎/발목' },
]

const MANAGEMENT_LEVELS = [
  { value: '상', label: '상 (7점)', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: '중상', label: '중상 (5-6점)', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: '중', label: '중 (3-4점)', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: '하', label: '하 (1-2점)', color: 'bg-green-100 text-green-700 border-green-300' },
]

export default function SurveyListPage() {
  // State for top section
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWorkplace, setSelectedWorkplace] = useState<Workplace | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgUnits, setOrgUnits] = useState<OrganizationUnit[]>([])
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnit | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // State for bottom section (assessment detail)
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(false)

  // Element work management
  const [isAddingWork, setIsAddingWork] = useState(false)
  const [newWorkName, setNewWorkName] = useState('')

  // Sheet modal state
  const [sheet2ModalOpen, setSheet2ModalOpen] = useState(false)
  const [sheet3ModalOpen, setSheet3ModalOpen] = useState(false)
  const [selectedWork, setSelectedWork] = useState<ElementWork | null>(null)

  // Fetch workplaces
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

  // Fetch organization and units when workplace changes (single org per workplace)
  useEffect(() => {
    if (!selectedWorkplace) {
      setOrgId(null)
      setOrgUnits([])
      setSelectedUnit(null)
      return
    }

    const fetchOrgAndUnits = async () => {
      try {
        // 단일 조직도 조회 (없으면 자동 생성)
        const orgRes = await fetch(`/api/workplaces/${selectedWorkplace.id}/organizations`)
        if (orgRes.ok) {
          const orgData = await orgRes.json()
          const org = orgData.organization
          if (org) {
            setOrgId(org.id)
            // 조직도 단위 트리 조회
            const unitsRes = await fetch(
              `/api/workplaces/${selectedWorkplace.id}/organizations/${org.id}`
            )
            if (unitsRes.ok) {
              const unitsData = await unitsRes.json()
              const flatUnits = unitsData.flatUnits || []
              const treeUnits = buildOrganizationTree(flatUnits)
              setOrgUnits(treeUnits)
            }
          }
        }
      } catch (error) {
        console.error('조직도 조회 오류:', error)
      }
    }
    fetchOrgAndUnits()
  }, [selectedWorkplace])

  // Fetch assessments when workplace changes
  useEffect(() => {
    if (!selectedWorkplace) {
      setAssessments([])
      setSelectedAssessment(null)
      return
    }

    const fetchAssessments = async () => {
      try {
        const res = await fetch(`/api/workplaces/${selectedWorkplace.id}/musculoskeletal`)
        if (res.ok) {
          const data = await res.json()
          setAssessments(data.assessments || [])
        }
      } catch (error) {
        console.error('조사 목록 조회 오류:', error)
      }
    }
    fetchAssessments()
  }, [selectedWorkplace])

  // Fetch full assessment details when selected
  const fetchAssessmentDetails = useCallback(async (assessmentId: string) => {
    setIsLoadingAssessment(true)
    try {
      const res = await fetch(`/api/musculoskeletal/${assessmentId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedAssessment(data.assessment)
      }
    } catch (error) {
      console.error('조사 상세 조회 오류:', error)
    } finally {
      setIsLoadingAssessment(false)
    }
  }, [])

  // Filter assessments by unit if selected
  const filteredAssessments = assessments.filter((a) => {
    if (searchTerm && !a.organizationUnit.name.includes(searchTerm)) return false
    if (statusFilter && a.status !== statusFilter) return false
    if (selectedUnit && a.organizationUnit.id !== selectedUnit.id) return false
    return true
  })

  // Handle new assessment
  const handleNewAssessment = async (year?: number, assessmentType?: string) => {
    if (!selectedWorkplace || !selectedUnit) {
      alert('사업장과 평가단위를 먼저 선택하세요.')
      return
    }

    try {
      const res = await fetch(`/api/workplaces/${selectedWorkplace.id}/musculoskeletal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationUnitId: selectedUnit.id,
          year: year || new Date().getFullYear(),
          assessmentType: assessmentType || '정기조사',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setAssessments([data.assessment, ...assessments])
        fetchAssessmentDetails(data.assessment.id)
      } else {
        const error = await res.json()
        alert(error.error || '조사 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('조사 생성 오류:', error)
      alert('조사 생성 중 오류가 발생했습니다.')
    }
  }

  // Handle add element work
  const handleAddElementWork = async () => {
    if (!newWorkName.trim() || !selectedAssessment || !selectedWorkplace) return

    try {
      const res = await fetch(
        `/api/workplaces/${selectedWorkplace.id}/musculoskeletal/${selectedAssessment.id}/element-works`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newWorkName }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        setSelectedAssessment({
          ...selectedAssessment,
          elementWorks: [...selectedAssessment.elementWorks, data.elementWork],
        })
        setNewWorkName('')
        setIsAddingWork(false)
      }
    } catch (error) {
      console.error('요소작업 추가 오류:', error)
    }
  }

  // Handle delete element work
  const handleDeleteElementWork = async (workId: string) => {
    if (!selectedAssessment || !selectedWorkplace || !confirm('이 요소작업을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(
        `/api/workplaces/${selectedWorkplace.id}/musculoskeletal/${selectedAssessment.id}/element-works/${workId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        setSelectedAssessment({
          ...selectedAssessment,
          elementWorks: selectedAssessment.elementWorks.filter((w) => w.id !== workId),
        })
      }
    } catch (error) {
      console.error('요소작업 삭제 오류:', error)
    }
  }

  // Open Sheet2 modal
  const openSheet2Modal = (work: ElementWork) => {
    setSelectedWork(work)
    setSheet2ModalOpen(true)
  }

  // Open Sheet3 modal
  const openSheet3Modal = (work: ElementWork) => {
    setSelectedWork(work)
    setSheet3ModalOpen(true)
  }

  // Handle modal save callback
  const handleModalSave = () => {
    if (selectedAssessment) {
      fetchAssessmentDetails(selectedAssessment.id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">조사 실시</h1>
          <p className="text-sm text-gray-500 mt-1">
            사업장과 평가단위를 선택하여 근골격계유해요인조사를 진행하세요.
          </p>
        </div>
      </div>

      {/* Top Section: Workplace + Organization Tree with Search */}
      <div className="grid grid-cols-12 gap-4">
        {/* Workplace Selector */}
        <Card className="col-span-12 lg:col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              사업장
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500 text-sm">로딩중...</div>
            ) : workplaces.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">등록된 사업장이 없습니다.</div>
            ) : (
              <div className="space-y-1">
                {workplaces.map((workplace) => (
                  <button
                    key={workplace.id}
                    onClick={() => {
                      setSelectedWorkplace(workplace)
                      setSelectedAssessment(null)
                      setSelectedUnit(null)
                    }}
                    className={`w-full p-2 rounded text-left text-sm transition-colors ${
                      selectedWorkplace?.id === workplace.id
                        ? 'bg-blue-100 border border-blue-400'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <p className="font-medium truncate">{workplace.name}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Tree with Search */}
        <Card className="col-span-12 lg:col-span-10">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                조직도
                {selectedWorkplace && (
                  <span className="text-gray-500 font-normal">- {selectedWorkplace.name}</span>
                )}
              </CardTitle>
            </div>
            {/* Search */}
            {selectedWorkplace && orgUnits.length > 0 && (
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="조직/공정 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 border rounded text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="">전체 상태</option>
                  <option value="DRAFT">작성중</option>
                  <option value="IN_PROGRESS">조사중</option>
                  <option value="COMPLETED">완료</option>
                </select>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-2 max-h-64 overflow-y-auto">
            {!selectedWorkplace ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p>사업장을 선택하세요.</p>
              </div>
            ) : orgUnits.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <FolderTree className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p>조직도가 없습니다.</p>
              </div>
            ) : (
              <IntegratedTreeView
                units={orgUnits}
                assessments={assessments}
                selectedUnit={selectedUnit}
                selectedAssessment={selectedAssessment}
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                onSelectUnit={(unit) => {
                  setSelectedUnit(unit)
                  setSelectedAssessment(null)
                }}
                onSelectAssessment={fetchAssessmentDetails}
                onNewAssessment={handleNewAssessment}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Assessment Details */}
      {isLoadingAssessment ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      ) : selectedAssessment ? (
        <AssessmentDetail
          assessment={selectedAssessment}
          workplaceId={selectedWorkplace?.id || ''}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAddingWork={isAddingWork}
          setIsAddingWork={setIsAddingWork}
          newWorkName={newWorkName}
          setNewWorkName={setNewWorkName}
          onAddWork={handleAddElementWork}
          onDeleteWork={handleDeleteElementWork}
          onOpenSheet2={openSheet2Modal}
          onOpenSheet3={openSheet3Modal}
          onUpdate={(updated) => setSelectedAssessment({ ...selectedAssessment, ...updated })}
        />
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>위에서 조사를 선택하면 상세 정보가 표시됩니다.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {selectedWork && selectedAssessment && selectedWorkplace && (
        <>
          <Sheet2Modal
            isOpen={sheet2ModalOpen}
            onClose={() => setSheet2ModalOpen(false)}
            workplaceId={selectedWorkplace.id}
            assessmentId={selectedAssessment.id}
            elementWork={selectedWork}
            onSave={handleModalSave}
          />
          <Sheet3Modal
            isOpen={sheet3ModalOpen}
            onClose={() => setSheet3ModalOpen(false)}
            workplaceId={selectedWorkplace.id}
            assessmentId={selectedAssessment.id}
            elementWork={selectedWork}
            onSave={handleModalSave}
          />
        </>
      )}
    </div>
  )
}

// Integrated Tree View Component with assessments
function IntegratedTreeView({
  units,
  assessments,
  selectedUnit,
  selectedAssessment,
  searchTerm,
  statusFilter,
  onSelectUnit,
  onSelectAssessment,
  onNewAssessment,
}: {
  units: OrganizationUnit[]
  assessments: Assessment[]
  selectedUnit: OrganizationUnit | null
  selectedAssessment: Assessment | null
  searchTerm: string
  statusFilter: string
  onSelectUnit: (unit: OrganizationUnit) => void
  onSelectAssessment: (assessmentId: string) => void
  onNewAssessment: (year?: number, assessmentType?: string) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Helper function to get all expandable node IDs
  const getAllExpandableIds = useCallback((unitList: OrganizationUnit[]): string[] => {
    const ids: string[] = []
    const traverse = (list: OrganizationUnit[]) => {
      list.forEach((unit) => {
        if (unit.children && unit.children.length > 0) {
          ids.push(unit.id)
          traverse(unit.children)
        }
      })
    }
    traverse(unitList)
    return ids
  }, [])

  // Initialize expanded state when units change
  useEffect(() => {
    const allIds = getAllExpandableIds(units)
    setExpanded(new Set(allIds))
  }, [units, getAllExpandableIds])

  const toggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Expand/Collapse all
  const expandAll = () => {
    const allIds = getAllExpandableIds(units)
    setExpanded(new Set(allIds))
  }

  const collapseAll = () => {
    setExpanded(new Set())
  }

  // Filter units by search term
  const matchesSearch = (unit: OrganizationUnit): boolean => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    if (unit.name.toLowerCase().includes(term)) return true
    if (unit.children?.some(matchesSearch)) return true
    // Check if any assessment for this unit matches
    if (unit.isLeaf) {
      const unitAssessments = assessments.filter((a) => a.organizationUnit.id === unit.id)
      if (unitAssessments.some((a) => a.organizationUnit.name.toLowerCase().includes(term))) {
        return true
      }
    }
    return false
  }

  // Filter assessments by status
  const getUnitAssessments = (unitId: string) => {
    return assessments.filter((a) => {
      if (a.organizationUnit.id !== unitId) return false
      if (statusFilter && a.status !== statusFilter) return false
      return true
    })
  }

  const renderUnit = (unit: OrganizationUnit, depth: number = 0): React.ReactNode => {
    if (!matchesSearch(unit)) return null

    const isExpanded = expanded.has(unit.id)
    const hasChildren = unit.children && unit.children.length > 0
    const isSelected = selectedUnit?.id === unit.id
    const unitAssessments = unit.isLeaf ? getUnitAssessments(unit.id) : []

    return (
      <div key={unit.id}>
        {/* Unit Row */}
        <div
          className={`flex items-center gap-1 py-1.5 rounded cursor-pointer text-sm transition-colors ${
            isSelected
              ? 'bg-blue-50 text-blue-700'
              : unit.isLeaf
                ? 'hover:bg-green-50'
                : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: '8px' }}
          onClick={() => onSelectUnit(unit)}
        >
          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <button
              onClick={(e) => toggle(unit.id, e)}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {/* Unit Name */}
          <span className={`flex-1 truncate font-medium ${unit.isLeaf ? 'text-green-700' : ''}`}>
            {unit.name}
          </span>

          {/* Leaf indicator + assessment count */}
          {unit.isLeaf && (
            <div className="flex items-center gap-1">
              {unitAssessments.length > 0 ? (
                <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                  {unitAssessments.length}건
                </span>
              ) : (
                <span className="text-xs text-gray-400">조사없음</span>
              )}
            </div>
          )}
        </div>

        {/* Assessments for this unit (shown when selected or has few items) */}
        {unit.isLeaf && isSelected && (
          <NewAssessmentPanel
            unitAssessments={unitAssessments}
            selectedAssessment={selectedAssessment}
            onSelectAssessment={onSelectAssessment}
            onNewAssessment={onNewAssessment}
          />
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {unit.children.map((child) => renderUnit(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Check if any units match the search
  const hasMatchingUnits = units.some(matchesSearch)

  // Check if there are expandable units
  const hasExpandableUnits = units.some((u) => u.children && u.children.length > 0)

  if (!hasMatchingUnits && searchTerm) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        <Search className="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p>&quot;{searchTerm}&quot; 검색 결과가 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Expand/Collapse All Controls */}
      {hasExpandableUnits && (
        <div className="flex justify-end gap-1 mb-2">
          <button
            onClick={expandAll}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded"
          >
            전체 펼치기
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded"
          >
            전체 접기
          </button>
        </div>
      )}
      <div className="space-y-0.5">{units.map((unit) => renderUnit(unit))}</div>
    </div>
  )
}

// New Assessment Panel with year + type selection
function NewAssessmentPanel({
  unitAssessments,
  selectedAssessment,
  onSelectAssessment,
  onNewAssessment,
}: {
  unitAssessments: Assessment[]
  selectedAssessment: Assessment | null
  onSelectAssessment: (assessmentId: string) => void
  onNewAssessment: (year?: number, assessmentType?: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear())
  const [newType, setNewType] = useState('정기조사')

  return (
    <div className="ml-9 mt-1 mb-2 space-y-1">
      {unitAssessments.length === 0 && !showForm && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
          <span className="text-gray-500">조사 내역이 없습니다.</span>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="w-3 h-3 mr-1" />
            새 조사
          </Button>
        </div>
      )}
      {unitAssessments.length > 0 && (
        <>
          {unitAssessments.map((assessment) => (
            <button
              key={assessment.id}
              onClick={(e) => {
                e.stopPropagation()
                onSelectAssessment(assessment.id)
              }}
              className={`w-full flex items-center justify-between p-2 rounded text-left text-sm transition-colors ${
                selectedAssessment?.id === assessment.id
                  ? 'bg-blue-100 border border-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <span className="text-gray-700">
                {assessment.year}년 {assessment.assessmentType}
              </span>
              <StatusBadge status={assessment.status} />
            </button>
          ))}
          {!showForm && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              새 조사 추가
            </Button>
          )}
        </>
      )}
      {showForm && (
        <div className="p-2 bg-blue-50 rounded border border-blue-200 space-y-2">
          <div className="flex gap-2">
            <select
              value={newYear}
              onChange={(e) => setNewYear(parseInt(e.target.value))}
              className="text-xs px-2 py-1 border rounded flex-1"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="text-xs px-2 py-1 border rounded flex-1"
            >
              <option value="정기조사">정기조사</option>
              <option value="수시조사">수시조사</option>
            </select>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                onNewAssessment(newYear, newType)
                setShowForm(false)
              }}
            >
              생성
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => setShowForm(false)}
            >
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const { label, className } = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-gray-100',
  }

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${className}`}>
      {label}
    </span>
  )
}

// Assessment Detail Component
function AssessmentDetail({
  assessment,
  workplaceId,
  activeTab,
  setActiveTab,
  isAddingWork,
  setIsAddingWork,
  newWorkName,
  setNewWorkName,
  onAddWork,
  onDeleteWork,
  onOpenSheet2,
  onOpenSheet3,
  onUpdate,
}: {
  assessment: Assessment
  workplaceId: string
  activeTab: string
  setActiveTab: (tab: string) => void
  isAddingWork: boolean
  setIsAddingWork: (v: boolean) => void
  newWorkName: string
  setNewWorkName: (v: string) => void
  onAddWork: () => void
  onDeleteWork: (workId: string) => void
  onOpenSheet2: (work: ElementWork) => void
  onOpenSheet3: (work: ElementWork) => void
  onUpdate: (data: Partial<Assessment>) => void
}) {
  const { label: statusLabel, className: statusClass } =
    STATUS_CONFIG[assessment.status] || { label: assessment.status, className: 'bg-gray-100' }

  return (
    <Card>
      {/* Assessment Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{assessment.organizationUnit.name}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {assessment.workplace.name} · {assessment.year}년 {assessment.assessmentType}
            </p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b pb-2 overflow-x-auto">
          {SHEET_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-t text-sm font-medium whitespace-nowrap transition-colors ${
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
      </CardHeader>

      <CardContent>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <OverviewContent
            assessment={assessment}
            isAddingWork={isAddingWork}
            setIsAddingWork={setIsAddingWork}
            newWorkName={newWorkName}
            setNewWorkName={setNewWorkName}
            onAddWork={onAddWork}
            onDeleteWork={onDeleteWork}
            onOpenSheet2={onOpenSheet2}
            onOpenSheet3={onOpenSheet3}
          />
        )}

        {/* Sheet1 Tab */}
        {activeTab === 'sheet1' && (
          <Sheet1Content
            assessment={assessment}
            workplaceId={workplaceId}
            onUpdate={onUpdate}
          />
        )}

        {/* Sheet2 Tab */}
        {activeTab === 'sheet2' && (
          <Sheet2Content
            assessment={assessment}
            onOpenSheet2={onOpenSheet2}
          />
        )}

        {/* Sheet3 Tab */}
        {activeTab === 'sheet3' && (
          <Sheet3Content
            assessment={assessment}
            onOpenSheet3={onOpenSheet3}
          />
        )}

        {/* Sheet4 Tab */}
        {activeTab === 'sheet4' && (
          <Sheet4Content
            assessment={assessment}
            workplaceId={workplaceId}
            onUpdate={onUpdate}
          />
        )}
      </CardContent>
    </Card>
  )
}

// Overview Content
function OverviewContent({
  assessment,
  isAddingWork,
  setIsAddingWork,
  newWorkName,
  setNewWorkName,
  onAddWork,
  onDeleteWork,
  onOpenSheet2,
  onOpenSheet3,
}: {
  assessment: Assessment
  isAddingWork: boolean
  setIsAddingWork: (v: boolean) => void
  newWorkName: string
  setNewWorkName: (v: string) => void
  onAddWork: () => void
  onDeleteWork: (workId: string) => void
  onOpenSheet2: (work: ElementWork) => void
  onOpenSheet3: (work: ElementWork) => void
}) {
  return (
    <div className="space-y-6">
      {/* Basic Info + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <h4 className="font-medium text-gray-800 mb-3">기본 정보</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-xs">조사년도</p>
              <p className="font-medium">{assessment.year}년</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-xs">조사유형</p>
              <p className="font-medium">{assessment.assessmentType}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-xs">요소작업</p>
              <p className="font-medium">{assessment.elementWorks.length}개</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-xs">최종수정</p>
              <p className="font-medium text-xs">
                {format(new Date(assessment.updatedAt), 'MM/dd HH:mm', { locale: ko })}
              </p>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-800 mb-3">진행 상태</h4>
          <div className="space-y-2">
            <SheetProgress label="1번시트" completed={!!assessment.dailyWorkHours} />
            <SheetProgress
              label="2번시트"
              completed={assessment.elementWorks.some((w) => w.bodyPartScores.length > 0)}
            />
            <SheetProgress
              label="3번시트"
              completed={assessment.elementWorks.some(
                (w) => w.rulaScore !== null || w.rebaScore !== null
              )}
            />
            <SheetProgress
              label="4번시트"
              completed={!!assessment.managementLevel}
            />
          </div>
        </div>
      </div>

      {/* Element Works */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-800">요소작업 목록</h4>
          <Button size="sm" variant="outline" onClick={() => setIsAddingWork(true)}>
            <Plus className="w-4 h-4 mr-1" />
            추가
          </Button>
        </div>

        {/* Add Work Form */}
        {isAddingWork && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg flex gap-2">
            <input
              type="text"
              value={newWorkName}
              onChange={(e) => setNewWorkName(e.target.value)}
              placeholder="요소작업명"
              className="flex-1 px-3 py-2 border rounded text-sm"
              autoFocus
            />
            <Button size="sm" onClick={onAddWork} disabled={!newWorkName.trim()}>
              추가
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAddingWork(false)
                setNewWorkName('')
              }}
            >
              취소
            </Button>
          </div>
        )}

        {/* Work List */}
        {assessment.elementWorks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">요소작업을 추가하세요.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assessment.elementWorks
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((work, index) => (
                <div
                  key={work.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
                >
                  <div className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 font-bold rounded-full text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{work.name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {work.bodyPartScores.length > 0 && (
                        <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                          부위 {work.bodyPartScores.length}/6
                        </span>
                      )}
                      {work.rulaScore !== null && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                          RULA {work.rulaScore}
                        </span>
                      )}
                      {work.rebaScore !== null && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                          REBA {work.rebaScore}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onOpenSheet2(work)}>
                      <Calculator className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onOpenSheet3(work)}>
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteWork(work.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SheetProgress({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center ${
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

// Sheet1 Content
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">1일 작업시간</label>
          <input
            type="number"
            step="0.5"
            value={formData.dailyWorkHours}
            onChange={(e) => setFormData({ ...formData, dailyWorkHours: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="시간"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">1일 생산량</label>
          <input
            type="text"
            value={formData.dailyProduction}
            onChange={(e) => setFormData({ ...formData, dailyProduction: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">작업빈도</label>
          <select
            value={formData.workFrequency}
            onChange={(e) => setFormData({ ...formData, workFrequency: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
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
            className="w-full px-3 py-2 border rounded-lg text-sm"
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
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          저장
        </Button>
      </div>
    </div>
  )
}

// Sheet2 Content
function Sheet2Content({
  assessment,
  onOpenSheet2,
}: {
  assessment: Assessment
  onOpenSheet2: (work: ElementWork) => void
}) {
  if (assessment.elementWorks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-2" />
        <p className="text-sm">개요 탭에서 먼저 요소작업을 추가하세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        각 요소작업을 선택하여 부위별 점수를 입력하세요.
      </p>
      {assessment.elementWorks
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((work, index) => (
          <div
            key={work.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
          >
            <div className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 font-bold rounded-full text-sm">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{work.name}</p>
              <div className="flex gap-2 mt-1">
                {BODY_PARTS.map((part) => {
                  const score = work.bodyPartScores.find((s) => s.bodyPart === part.id)
                  return (
                    <span
                      key={part.id}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        score
                          ? score.totalScore >= 7
                            ? 'bg-red-100 text-red-700'
                            : score.totalScore >= 5
                              ? 'bg-orange-100 text-orange-700'
                              : score.totalScore >= 3
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {score ? score.totalScore : '-'}
                    </span>
                  )
                })}
              </div>
            </div>
            <Button size="sm" onClick={() => onOpenSheet2(work)}>
              <Edit className="w-4 h-4 mr-1" />
              입력
            </Button>
          </div>
        ))}
    </div>
  )
}

// Sheet3 Content
function Sheet3Content({
  assessment,
  onOpenSheet3,
}: {
  assessment: Assessment
  onOpenSheet3: (work: ElementWork) => void
}) {
  if (assessment.elementWorks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-2" />
        <p className="text-sm">개요 탭에서 먼저 요소작업을 추가하세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        각 요소작업을 선택하여 RULA/REBA 평가를 진행하세요.
      </p>
      {assessment.elementWorks
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((work, index) => (
          <div
            key={work.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
          >
            <div className="w-7 h-7 flex items-center justify-center bg-purple-100 text-purple-600 font-bold rounded-full text-sm">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{work.name}</p>
              <div className="flex gap-2 mt-1">
                {work.rulaScore !== null && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                    RULA {work.rulaScore}
                  </span>
                )}
                {work.rebaScore !== null && (
                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                    REBA {work.rebaScore}
                  </span>
                )}
                {work.rulaScore === null && work.rebaScore === null && (
                  <span className="text-xs text-gray-400">평가 미실시</span>
                )}
              </div>
            </div>
            <Button size="sm" onClick={() => onOpenSheet3(work)}>
              <BarChart3 className="w-4 h-4 mr-1" />
              평가
            </Button>
          </div>
        ))}
    </div>
  )
}

// Sheet4 Content
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
    managementLevel: assessment.managementLevel || '',
    overallComment: assessment.overallComment || '',
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
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Score Summary Table */}
      {assessment.elementWorks.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-3">점수 요약</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2">요소작업</th>
                  {BODY_PARTS.map((part) => (
                    <th key={part.id} className="text-center p-2 whitespace-nowrap">
                      {part.name}
                    </th>
                  ))}
                  <th className="text-center p-2">최고점</th>
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
                      <tr key={work.id} className="border-b">
                        <td className="p-2 font-medium">{work.name}</td>
                        {BODY_PARTS.map((part) => {
                          const score = work.bodyPartScores.find((s) => s.bodyPart === part.id)
                          return (
                            <td key={part.id} className="text-center p-2">
                              {score ? (
                                <span
                                  className={`inline-block w-7 h-7 leading-7 rounded-full text-xs font-medium ${
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
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="text-center p-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
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
        </div>
      )}

      {/* Management Level and Comment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-800 mb-3">관리등급</h4>
          {maxScore > 0 && (
            <p className="text-sm text-blue-600 mb-2">
              권장: <strong>{recommendedLevel}</strong> (최고점 {maxScore}점)
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {MANAGEMENT_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setFormData({ ...formData, managementLevel: level.value })}
                className={`p-3 rounded-lg border-2 text-center text-sm transition-all ${
                  formData.managementLevel === level.value
                    ? level.color + ' border-current'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-800 mb-3">종합 의견</h4>
          <textarea
            value={formData.overallComment}
            onChange={(e) => setFormData({ ...formData, overallComment: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
            placeholder="조사 결과에 대한 종합적인 의견..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          종합평가 저장
        </Button>
      </div>
    </div>
  )
}
