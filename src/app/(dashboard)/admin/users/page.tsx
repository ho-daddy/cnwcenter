'use client'

import { useEffect, useState } from 'react'
import { UserTable } from '@/components/admin/user-table'
import { EmailModal } from '@/components/admin/email-modal'
import { Button } from '@/components/ui/button'
import { Mail, RefreshCw, Users, UserPlus } from 'lucide-react'

interface WorkplaceOption {
  id: string
  name: string
}

interface CreateUserForm {
  name: string
  email: string
  password: string
  role: string
  workplaceId: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [workplaces, setWorkplaces] = useState<WorkplaceOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: '', email: '', password: '', role: 'WORKPLACE_USER', workplaceId: '',
  })
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreateLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          workplaceId: createForm.workplaceId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || '등록 실패')
      } else {
        setShowCreateModal(false)
        setCreateForm({ name: '', email: '', password: '', role: 'WORKPLACE_USER', workplaceId: '' })
        fetchUsers()
      }
    } catch {
      setCreateError('오류가 발생했습니다.')
    } finally {
      setCreateLoading(false)
    }
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
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            사용자 등록
          </Button>
          <Button variant="outline" onClick={() => setShowBulkEmailModal(true)}>
            <Mail className="h-4 w-4 mr-2" />
            전체 메일 발송
          </Button>
          <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
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

      {/* 전체 메일 발송 모달 */}
      <EmailModal
        open={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
        userCount={users.length}
      />

      {/* 사용자 직접 등록 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">사용자 등록</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">이름 *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이메일 *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">임시 비밀번호 *</label>
                <input
                  type="text"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="6자 이상"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">역할</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="WORKPLACE_USER">사업장</option>
                  <option value="STAFF">스탭</option>
                  <option value="SUPER_ADMIN">최고관리자</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">사업장 (선택)</label>
                <select
                  value={createForm.workplaceId}
                  onChange={(e) => setCreateForm({ ...createForm, workplaceId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">선택 안 함</option>
                  {workplaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              {createError && (
                <p className="text-sm text-red-500">{createError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowCreateModal(false); setCreateError('') }}
                >
                  취소
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? '등록 중...' : '등록'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
