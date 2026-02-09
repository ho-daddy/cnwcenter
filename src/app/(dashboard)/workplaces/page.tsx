'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Plus,
  Search,
  Users,
  Phone,
  FolderTree,
  Loader2,
} from 'lucide-react'

interface WorkplaceItem {
  id: string
  name: string
  industry: string | null
  address: string | null
  employeeCount: number | null
  _count: {
    users: number
    contacts: number
    organizations: number
  }
}

export default function WorkplacesPage() {
  const [workplaces, setWorkplaces] = useState<WorkplaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchWorkplaces = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const res = await fetch(`/api/workplaces?${params}`)
      const data = await res.json()
      setWorkplaces(data.workplaces || [])
    } catch (error) {
      console.error('Failed to fetch workplaces:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkplaces()
  }, [search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          사업장 관리
        </h1>
        <Link href="/workplaces/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            사업장 등록
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="사업장명 또는 주소로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-sm text-gray-500">
              총 {workplaces.length}개
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : workplaces.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {search
                ? '검색 결과가 없습니다.'
                : '등록된 사업장이 없습니다. 새 사업장을 등록해주세요.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      사업장명
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      업종
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      소재지
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                      인원
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                      담당자
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                      조직도
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {workplaces.map((wp) => (
                    <tr key={wp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/workplaces/${wp.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {wp.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {wp.industry || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {wp.address || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {wp.employeeCount ? (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            {wp.employeeCount}명
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {wp._count.contacts}명
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className="inline-flex items-center gap-1">
                          <FolderTree className="h-3.5 w-3.5 text-gray-400" />
                          {wp._count.organizations}개
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/workplaces/${wp.id}`}>
                          <Button variant="ghost" size="sm">
                            상세
                          </Button>
                        </Link>
                        <Link href={`/workplaces/${wp.id}/organization`}>
                          <Button variant="ghost" size="sm">
                            조직도
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
