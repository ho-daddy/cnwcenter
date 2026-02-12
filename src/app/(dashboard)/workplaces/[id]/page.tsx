'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Building2,
  Edit2,
  Loader2,
  Save,
  Trash2,
  X,
  FolderTree,
} from 'lucide-react'
import { ContactList } from '@/components/workplace/contact-list'

interface WorkplaceDetail {
  id: string
  name: string
  industry: string | null
  products: string | null
  address: string | null
  employeeCount: number | null
  contacts: any[]
  organization: any | null
}

export default function WorkplaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workplaceId = params.id as string

  const [workplace, setWorkplace] = useState<WorkplaceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    industry: '',
    products: '',
    address: '',
    employeeCount: '',
  })

  const fetchWorkplace = async () => {
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}`)
      const data = await res.json()
      if (data.workplace) {
        setWorkplace(data.workplace)
        setForm({
          name: data.workplace.name || '',
          industry: data.workplace.industry || '',
          products: data.workplace.products || '',
          address: data.workplace.address || '',
          employeeCount: data.workplace.employeeCount?.toString() || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch workplace:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkplace()
  }, [workplaceId])

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('사업장명은 필수입니다.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setEditing(false)
        fetchWorkplace()
      } else {
        const data = await res.json()
        alert(data.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('이 사업장을 삭제하시겠습니까?\n모든 담당자, 조직도 정보가 함께 삭제됩니다.')) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/workplaces')
      } else {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!workplace) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사업장을 찾을 수 없습니다.</p>
        <Link href="/workplaces">
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
          <Link href="/workplaces">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              목록
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {workplace.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/workplaces/${workplaceId}/organization`}>
            <Button variant="outline">
              <FolderTree className="h-4 w-4 mr-2" />
              조직도 관리
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 기초정보 카드 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>기초정보</CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1" />
              편집
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                저장
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium mb-1">
                  사업장명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">업종</label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">주요생산품 및 서비스</label>
                <textarea
                  value={form.products}
                  onChange={(e) => setForm({ ...form, products: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">소재지</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">인원규모 (명)</label>
                <input
                  type="number"
                  value={form.employeeCount}
                  onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">사업장명</dt>
                <dd className="font-medium">{workplace.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">업종</dt>
                <dd className="font-medium">{workplace.industry || '-'}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm text-gray-500">주요생산품 및 서비스</dt>
                <dd className="font-medium whitespace-pre-wrap">{workplace.products || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">소재지</dt>
                <dd className="font-medium">{workplace.address || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">인원규모</dt>
                <dd className="font-medium">
                  {workplace.employeeCount ? `${workplace.employeeCount}명` : '-'}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* 담당자 관리 */}
      <ContactList workplaceId={workplaceId} initialContacts={workplace.contacts} />

      {/* 조직도 요약 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>조직도</CardTitle>
          <Link href={`/workplaces/${workplaceId}/organization`}>
            <Button variant="ghost" size="sm">
              <FolderTree className="h-4 w-4 mr-1" />
              관리
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {workplace.organization ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-gray-400" />
                <span className="font-medium">조직도</span>
              </div>
              <span className="text-sm text-gray-500">
                {workplace.organization._count?.units || 0}개 단위
              </span>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              조직도가 아직 생성되지 않았습니다.
              <Link href={`/workplaces/${workplaceId}/organization`} className="text-blue-600 hover:underline ml-1">
                조직도 관리
              </Link>
              에서 단위를 추가하세요.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
