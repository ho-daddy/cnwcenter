'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ChevronRight,
  ChevronDown,
  Building2,
  FolderTree,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

// Suspense boundary로 감싸기 위한 래퍼
export default function NewSurveyPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <NewSurveyPage />
    </Suspense>
  )
}

interface OrganizationUnit {
  id: string
  name: string
  code: string | null
  isLeaf: boolean
  parentId: string | null
  children?: OrganizationUnit[]
}

interface Workplace {
  id: string
  name: string
}

// Utility function to transform flat array to tree structure
function buildOrganizationTree(flatUnits: OrganizationUnit[]): OrganizationUnit[] {
  const unitMap = new Map<string, OrganizationUnit>()

  flatUnits.forEach((unit) => {
    unitMap.set(unit.id, { ...unit, children: [] })
  })

  const roots: OrganizationUnit[] = []

  flatUnits.forEach((unit) => {
    const node = unitMap.get(unit.id)!
    if (unit.parentId && unitMap.has(unit.parentId)) {
      const parent = unitMap.get(unit.parentId)!
      parent.children!.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function NewSurveyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workplaceId = searchParams.get('workplaceId')

  const [workplace, setWorkplace] = useState<Workplace | null>(null)
  const [units, setUnits] = useState<OrganizationUnit[]>([])
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnit | null>(null)
  const [assessmentType, setAssessmentType] = useState<string>('정기조사')
  const [assessmentYear, setAssessmentYear] = useState<number>(new Date().getFullYear())
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // 사업장 정보 및 단일 조직도 조회
  useEffect(() => {
    if (!workplaceId) {
      router.push('/musculoskeletal/survey')
      return
    }

    const fetchData = async () => {
      try {
        // 사업장 정보
        const wpRes = await fetch(`/api/workplaces/${workplaceId}`)
        if (wpRes.ok) {
          const wpData = await wpRes.json()
          setWorkplace(wpData.workplace)
        }

        // 단일 조직도 조회 (없으면 자동 생성)
        const orgRes = await fetch(`/api/workplaces/${workplaceId}/organizations`)
        if (orgRes.ok) {
          const orgData = await orgRes.json()
          const org = orgData.organization
          if (org) {
            // 조직도 트리 조회
            const unitsRes = await fetch(
              `/api/workplaces/${workplaceId}/organizations/${org.id}`
            )
            if (unitsRes.ok) {
              const unitsData = await unitsRes.json()
              const flatUnits = unitsData.flatUnits || []
              const treeUnits = buildOrganizationTree(flatUnits)
              setUnits(treeUnits)
              // 전체 펼치기
              const allIds: string[] = []
              const collectIds = (nodes: OrganizationUnit[]) => {
                nodes.forEach((n) => {
                  if (n.children && n.children.length > 0) {
                    allIds.push(n.id)
                    collectIds(n.children)
                  }
                })
              }
              collectIds(treeUnits)
              setExpandedNodes(new Set(allIds))
            }
          }
        }
      } catch (error) {
        console.error('데이터 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [workplaceId, router])

  // 노드 확장/축소 토글
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  // 조사 생성
  const handleCreate = async () => {
    if (!selectedUnit || !workplaceId) return

    setIsCreating(true)
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}/musculoskeletal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationUnitId: selectedUnit.id,
          year: assessmentYear,
          assessmentType,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/musculoskeletal/survey/${data.assessment.id}`)
      } else {
        const error = await res.json()
        alert(error.error || '조사 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('조사 생성 오류:', error)
      alert('조사 생성 중 오류가 발생했습니다.')
    } finally {
      setIsCreating(false)
    }
  }

  // 트리 노드 렌더링
  const renderTree = (nodes: OrganizationUnit[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedNodes.has(node.id)
      const hasChildren = node.children && node.children.length > 0
      const isSelected = selectedUnit?.id === node.id

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-100 border border-blue-500'
                : node.isLeaf
                  ? 'hover:bg-blue-50'
                  : 'hover:bg-gray-50'
            }`}
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
            onClick={() => {
              if (node.isLeaf) {
                setSelectedUnit(node)
              } else if (hasChildren) {
                toggleNode(node.id)
              }
            }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNode(node.id)
                }}
                className="p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}
            <span
              className={`flex-1 text-sm ${
                node.isLeaf ? 'text-blue-600 font-medium' : 'text-gray-700'
              }`}
            >
              {node.name}
            </span>
            {node.isLeaf && (
              <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                평가단위
              </span>
            )}
          </div>
          {hasChildren && isExpanded && renderTree(node.children!, depth + 1)}
        </div>
      )
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">새 조사 시작</h1>
          <p className="text-sm text-gray-500 mt-1">
            {workplace?.name} - 평가대상 단위를 선택하세요.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 조직도 및 단위 선택 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderTree className="w-5 h-5" />
                평가대상 선택
              </CardTitle>
              <p className="text-sm text-gray-500 mt-2">
                파란색으로 표시된 &quot;평가단위&quot;를 클릭하여 선택하세요.
              </p>
            </CardHeader>
            <CardContent>
              {units.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>조직도가 없습니다.</p>
                  <p className="text-sm mt-2">사업장 관리에서 조직도를 먼저 등록하세요.</p>
                </div>
              ) : (
                <div className="border rounded-lg p-2 max-h-[400px] overflow-y-auto">
                  {renderTree(units)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 조사 설정 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">조사 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 선택된 단위 표시 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  선택된 평가대상
                </label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  {selectedUnit ? (
                    <p className="font-medium text-blue-600">{selectedUnit.name}</p>
                  ) : (
                    <p className="text-gray-400 text-sm">왼쪽에서 평가단위를 선택하세요.</p>
                  )}
                </div>
              </div>

              {/* 조사 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  조사 유형
                </label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="정기조사">정기조사</option>
                  <option value="수시조사">수시조사</option>
                </select>
              </div>

              {/* 조사 년도 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  조사 년도
                </label>
                <select
                  value={assessmentYear}
                  onChange={(e) => setAssessmentYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
                    (y) => (
                      <option key={y} value={y}>
                        {y}년
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* 생성 버튼 */}
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedUnit || isCreating}
                onClick={handleCreate}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  '조사 시작하기'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
