'use client'

import { useEffect, useState } from 'react'
import { UserTable } from '@/components/admin/user-table'
import { Button } from '@/components/ui/button'
import { RefreshCw, Users } from 'lucide-react'

interface WorkplaceOption {
  id: string
  name: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [workplaces, setWorkplaces] = useState<WorkplaceOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: '',
    role: '',
    search: '',
  })

  const fetchWorkplaces = async () => {
    try {
      const response = await fetch('/api/workplaces')
      const data = await response.json()
      if (response.ok) {
        setWorkplaces(data.workplaces.map((w: any) => ({ id: w.id, name: w.name })))
      }
    } catch (error) {
      console.error('사업장 목록 조회 오류:', error)
    }
  }

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.status) params.set('status', filter.status)
      if (filter.role) params.set('role', filter.role)
      if (filter.search) params.set('search', filter.search)

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      if (response.ok) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkplaces()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [filter.status, filter.role])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers()
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold">사용자 관리</h1>
            <p className="text-sm text-gray-500">
              사용자 승인, 역할 변경, 계정 관리
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">상태:</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-1.5 border rounded-md text-sm"
          >
            <option value="">전체</option>
            <option value="PENDING">대기</option>
            <option value="APPROVED">승인</option>
            <option value="REJECTED">거부</option>
            <option value="SUSPENDED">정지</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">역할:</label>
          <select
            value={filter.role}
            onChange={(e) => setFilter({ ...filter, role: e.target.value })}
            className="px-3 py-1.5 border rounded-md text-sm"
          >
            <option value="">전체</option>
            <option value="SUPER_ADMIN">최고관리자</option>
            <option value="STAFF">스탭</option>
            <option value="WORKPLACE_USER">사업장</option>
          </select>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="이메일 또는 이름 검색"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="px-3 py-1.5 border rounded-md text-sm w-64"
          />
          <Button type="submit" size="sm">
            검색
          </Button>
        </form>
      </div>

      {/* 사용자 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <UserTable users={users} workplaces={workplaces} onRefresh={fetchUsers} />
      )}
    </div>
  )
}
