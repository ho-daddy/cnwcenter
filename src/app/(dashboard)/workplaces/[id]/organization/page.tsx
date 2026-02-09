'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  FolderTree,
  Plus,
  Loader2,
  Copy,
  Check,
  Trash2,
  Edit2,
} from 'lucide-react'

interface Organization {
  id: string
  year: number
  name: string
  isActive: boolean
  _count?: { units: number }
}

export default function OrganizationListPage() {
  const params = useParams()
  const workplaceId = params.id as string

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [newOrgForm, setNewOrgForm] = useState({
    year: new Date().getFullYear(),
    name: '기본 조직도',
  })

  const [copyModal, setCopyModal] = useState<{ sourceId: string; sourceYear: number } | null>(null)
  const [copyForm, setCopyForm] = useState({
    targetYear: new Date().getFullYear(),
    newName: '',
  })

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}/organizations`)
      const data = await res.json()
      setOrganizations(data.organizations || [])
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [workplaceId])

  const handleAdd = async () => {
    setActionLoading('add')
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrgForm),
      })

      const data = await res.json()
      if (res.ok) {
        setAdding(false)
        setNewOrgForm({ year: new Date().getFullYear(), name: '기본 조직도' })
        fetchOrganizations()
      } else {
        alert(data.error || '생성에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSetActive = async (orgId: string) => {
    setActionLoading(orgId)
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })

      if (res.ok) {
        fetchOrganizations()
      } else {
        const data = await res.json()
        alert(data.error || '활성화에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (orgId: string) => {
    if (!confirm('이 조직도를 삭제하시겠습니까?\n모든 조직 단위가 함께 삭제됩니다.')) return

    setActionLoading(orgId)
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}/organizations/${orgId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchOrganizations()
      } else {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCopy = async () => {
    if (!copyModal) return

    setActionLoading('copy')
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/organizations/${copyModal.sourceId}/copy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(copyForm),
        }
      )

      const data = await res.json()
      if (res.ok) {
        setCopyModal(null)
        setCopyForm({ targetYear: new Date().getFullYear(), newName: '' })
        fetchOrganizations()
        alert(data.message)
      } else {
        alert(data.error || '복사에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  // 연도별로 그룹화
  const groupedByYear = organizations.reduce((acc, org) => {
    if (!acc[org.year]) acc[org.year] = []
    acc[org.year].push(org)
    return acc
  }, {} as Record<number, Organization[]>)

  const years = Object.keys(groupedByYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/workplaces/${workplaceId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              사업장
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="h-6 w-6" />
            조직도 관리
          </h1>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          새 조직도
        </Button>
      </div>

      {/* 새 조직도 추가 폼 */}
      {adding && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">연도</label>
                <input
                  type="number"
                  value={newOrgForm.year}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, year: parseInt(e.target.value) })}
                  className="px-3 py-2 border rounded-lg w-24"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">조직도명</label>
                <input
                  type="text"
                  value={newOrgForm.name}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                  placeholder="예: 기본 조직도"
                  className="px-3 py-2 border rounded-lg w-full"
                />
              </div>
              <Button onClick={handleAdd} disabled={actionLoading === 'add'}>
                {actionLoading === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : '생성'}
              </Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 복사 모달 */}
      {copyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>조직도 복사</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {copyModal.sourceYear}년 조직도를 다른 연도로 복사합니다.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">대상 연도</label>
                <input
                  type="number"
                  value={copyForm.targetYear}
                  onChange={(e) => setCopyForm({ ...copyForm, targetYear: parseInt(e.target.value) })}
                  className="px-3 py-2 border rounded-lg w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">새 조직도명 (선택)</label>
                <input
                  type="text"
                  value={copyForm.newName}
                  onChange={(e) => setCopyForm({ ...copyForm, newName: e.target.value })}
                  placeholder={`${copyForm.targetYear}년 조직도`}
                  className="px-3 py-2 border rounded-lg w-full"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCopyModal(null)}>
                  취소
                </Button>
                <Button onClick={handleCopy} disabled={actionLoading === 'copy'}>
                  {actionLoading === 'copy' ? <Loader2 className="h-4 w-4 animate-spin" /> : '복사'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 조직도 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : organizations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            등록된 조직도가 없습니다. 새 조직도를 생성하세요.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {years.map((year) => (
            <Card key={year}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{year}년</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groupedByYear[year].map((org) => (
                    <div
                      key={org.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        org.isActive ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FolderTree className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{org.name}</span>
                            {org.isActive && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                활성
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {org._count?.units || 0}개 조직 단위
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/workplaces/${workplaceId}/organization/${org.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit2 className="h-4 w-4 mr-1" />
                            편집
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCopyModal({ sourceId: org.id, sourceYear: org.year })
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!org.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetActive(org.id)}
                            disabled={actionLoading === org.id}
                          >
                            {actionLoading === org.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(org.id)}
                          disabled={actionLoading === org.id}
                        >
                          {actionLoading === org.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
