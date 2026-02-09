'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FolderTree, Loader2, Plus } from 'lucide-react'
import { OrganizationTree } from '@/components/workplace/organization-tree'
import { OrganizationUnitWithChildren, LEVEL_LABELS } from '@/types/workplace'

interface OrganizationDetail {
  id: string
  year: number
  name: string
  isActive: boolean
}

export default function OrganizationEditPage() {
  const params = useParams()
  const workplaceId = params.id as string
  const orgId = params.orgId as string

  const [organization, setOrganization] = useState<OrganizationDetail | null>(null)
  const [units, setUnits] = useState<OrganizationUnitWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [addingRoot, setAddingRoot] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [newUnitForm, setNewUnitForm] = useState({
    name: '',
    level: 1,
    isLeaf: false,
  })

  const fetchOrganization = async () => {
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}/organizations/${orgId}`)
      const data = await res.json()
      setOrganization(data.organization)
      setUnits(data.units || [])
    } catch (error) {
      console.error('Failed to fetch organization:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganization()
  }, [workplaceId, orgId])

  const handleAddRootUnit = async () => {
    if (!newUnitForm.name.trim()) {
      alert('조직 단위명은 필수입니다.')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/organizations/${orgId}/units`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newUnitForm.name,
            level: newUnitForm.level,
            parentId: null,
            isLeaf: newUnitForm.isLeaf,
          }),
        }
      )

      if (res.ok) {
        setAddingRoot(false)
        setNewUnitForm({ name: '', level: 1, isLeaf: false })
        fetchOrganization()
      } else {
        const data = await res.json()
        alert(data.error || '추가에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">조직도를 찾을 수 없습니다.</p>
        <Link href={`/workplaces/${workplaceId}/organization`}>
          <Button variant="outline" className="mt-4">
            목록으로
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/workplaces/${workplaceId}/organization`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              조직도 목록
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderTree className="h-6 w-6" />
              {organization.year}년 {organization.name}
            </h1>
            {organization.isActive && (
              <span className="text-sm text-green-600">현재 활성화된 조직도</span>
            )}
          </div>
        </div>
        <Button onClick={() => setAddingRoot(true)}>
          <Plus className="h-4 w-4 mr-2" />
          최상위 단위 추가
        </Button>
      </div>

      {/* 최상위 단위 추가 폼 */}
      {addingRoot && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">단위명</label>
                <input
                  type="text"
                  value={newUnitForm.name}
                  onChange={(e) => setNewUnitForm({ ...newUnitForm, name: e.target.value })}
                  placeholder="예: 생산본부"
                  className="px-3 py-2 border rounded-lg w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">단계</label>
                <select
                  value={newUnitForm.level}
                  onChange={(e) => setNewUnitForm({ ...newUnitForm, level: parseInt(e.target.value) })}
                  className="px-3 py-2 border rounded-lg"
                >
                  {[1, 2, 3, 4, 5].map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABELS[l]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={newUnitForm.isLeaf}
                  onChange={(e) => setNewUnitForm({ ...newUnitForm, isLeaf: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">평가 대상</span>
              </label>
              <Button onClick={handleAddRootUnit} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '추가'}
              </Button>
              <Button variant="ghost" onClick={() => setAddingRoot(false)}>
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 트리 뷰 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>조직 구조</CardTitle>
            <div className="text-sm text-gray-500">
              드래그하여 순서를 변경할 수 있습니다
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <FolderTree className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>조직 단위가 없습니다.</p>
              <p className="text-sm">위의 "최상위 단위 추가" 버튼을 눌러 시작하세요.</p>
            </div>
          ) : (
            <OrganizationTree
              workplaceId={workplaceId}
              orgId={orgId}
              units={units}
              onRefresh={fetchOrganization}
            />
          )}
        </CardContent>
      </Card>

      {/* 범례 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 rounded" />
              <span>1단계 (본부/사업장)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded" />
              <span>2단계 (부서/팀)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 rounded" />
              <span>3단계 (공정)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 rounded" />
              <span>4단계 (세부공정)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded" />
              <span>5단계 (작업)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">대상</span>
              <span>평가 대상 단위</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
