'use client'

import { useState } from 'react'
import { UserRole, UserStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Check,
  X,
  Clock,
  Shield,
  User,
  Building2,
  MoreVertical,
  Loader2,
  Eye,
  Trash2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { UserDetailModal } from '@/components/admin/user-detail-modal'

interface UserData {
  id: string
  email: string
  name: string | null
  image: string | null
  phone: string | null
  organization: string | null
  role: UserRole
  status: UserStatus
  approvedAt: string | null
  rejectedAt: string | null
  rejectedReason: string | null
  createdAt: string
  workplaces: { workplace: { id: string; name: string } }[]
}

interface WorkplaceOption {
  id: string
  name: string
}

interface UserTableProps {
  users: UserData[]
  workplaces: WorkplaceOption[]
  onRefresh: () => void
}

const STATUS_LABELS: Record<UserStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: '대기', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  APPROVED: { label: '승인', color: 'bg-green-100 text-green-800', icon: <Check className="h-3 w-3" /> },
  REJECTED: { label: '거부', color: 'bg-red-100 text-red-800', icon: <X className="h-3 w-3" /> },
  SUSPENDED: { label: '정지', color: 'bg-gray-100 text-gray-800', icon: <X className="h-3 w-3" /> },
}

const ROLE_LABELS: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  SUPER_ADMIN: { label: '최고관리자', color: 'bg-purple-100 text-purple-800', icon: <Shield className="h-3 w-3" /> },
  STAFF: { label: '스탭', color: 'bg-blue-100 text-blue-800', icon: <User className="h-3 w-3" /> },
  WORKPLACE_USER: { label: '사업장', color: 'bg-gray-100 text-gray-800', icon: <Building2 className="h-3 w-3" /> },
}

export function UserTable({ users, workplaces, onRefresh }: UserTableProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null)
  const [showWorkplaceMenu, setShowWorkplaceMenu] = useState<string | null>(null)

  const handleApprove = async (userId: string) => {
    if (!confirm('이 사용자를 승인하시겠습니까?')) return

    setLoadingAction(`approve-${userId}`)
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        onRefresh()
      } else {
        const data = await response.json()
        alert(data.error || '승인 실패')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleReject = async (userId: string) => {
    const reason = prompt('거부 사유를 입력하세요 (선택):')

    setLoadingAction(`reject-${userId}`)
    try {
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        onRefresh()
      } else {
        const data = await response.json()
        alert(data.error || '거부 실패')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoadingAction(`role-${userId}`)
    setShowRoleMenu(null)
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        onRefresh()
      } else {
        const data = await response.json()
        alert(data.error || '역할 변경 실패')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleWorkplaceChange = async (userId: string, workplaceId: string | null) => {
    setLoadingAction(`workplace-${userId}`)
    setShowWorkplaceMenu(null)
    try {
      const response = await fetch(`/api/admin/users/${userId}/workplace`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workplaceId }),
      })

      const data = await response.json()
      if (response.ok) {
        onRefresh()
      } else {
        alert(data.error || '사업장 변경 실패')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoadingAction(null)
    }
  }

  const getUserWorkplace = (user: UserData) => {
    if (user.workplaces && user.workplaces.length > 0) {
      return user.workplaces[0].workplace
    }
    return null
  }

  const pendingUsers = users.filter((u) => u.status === 'PENDING')
  const otherUsers = users.filter((u) => u.status !== 'PENDING')

  return (
    <div className="space-y-6">
      {/* 승인 대기 사용자 */}
      {pendingUsers.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="bg-yellow-50 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              승인 대기 ({pendingUsers.length}명)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {pendingUsers.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{user.name || '(이름 없음)'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400">
                        가입일: {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.id)}
                      disabled={loadingAction !== null}
                    >
                      {loadingAction === `approve-${user.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          승인
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(user.id)}
                      disabled={loadingAction !== null}
                    >
                      {loadingAction === `reject-${user.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          거부
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 사용자 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">전체 사용자 ({users.length}명)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">사용자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">역할</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">사업장</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">가입일</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          {user.image ? (
                            <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <User className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{user.name || '(이름 없음)'}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setShowRoleMenu(showRoleMenu === user.id ? null : user.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ROLE_LABELS[user.role].color}`}
                          disabled={loadingAction !== null}
                        >
                          {ROLE_LABELS[user.role].icon}
                          {ROLE_LABELS[user.role].label}
                        </button>
                        {showRoleMenu === user.id && (
                          <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 py-1 min-w-[140px]">
                            {(['SUPER_ADMIN', 'STAFF', 'WORKPLACE_USER'] as UserRole[]).map((role) => (
                              <button
                                key={role}
                                onClick={() => handleRoleChange(user.id, role)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${user.role === role ? 'bg-gray-50' : ''}`}
                              >
                                {ROLE_LABELS[role].icon}
                                {ROLE_LABELS[role].label}
                                {user.role === role && <Check className="h-3 w-3 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[user.status].color}`}>
                        {STATUS_LABELS[user.status].icon}
                        {STATUS_LABELS[user.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.role === 'WORKPLACE_USER' ? (
                        <div className="relative">
                          <button
                            onClick={() => setShowWorkplaceMenu(showWorkplaceMenu === user.id ? null : user.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200"
                            disabled={loadingAction !== null}
                          >
                            <Building2 className="h-3 w-3" />
                            {getUserWorkplace(user)?.name || '미지정'}
                          </button>
                          {showWorkplaceMenu === user.id && (
                            <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 py-1 min-w-[180px] max-h-60 overflow-y-auto">
                              <button
                                onClick={() => handleWorkplaceChange(user.id, null)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${!getUserWorkplace(user) ? 'bg-gray-50' : ''}`}
                              >
                                <X className="h-3 w-3 text-gray-400" />
                                미지정
                                {!getUserWorkplace(user) && <Check className="h-3 w-3 ml-auto" />}
                              </button>
                              {workplaces.map((wp) => (
                                <button
                                  key={wp.id}
                                  onClick={() => handleWorkplaceChange(user.id, wp.id)}
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${getUserWorkplace(user)?.id === wp.id ? 'bg-gray-50' : ''}`}
                                >
                                  <Building2 className="h-3 w-3 text-gray-400" />
                                  {wp.name}
                                  {getUserWorkplace(user)?.id === wp.id && <Check className="h-3 w-3 ml-auto" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">{user.workplaces.length}개</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {user.status === 'PENDING' ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(user.id)}
                              disabled={loadingAction !== null}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject(user.id)}
                              disabled={loadingAction !== null}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedUser(user)
                            setShowDetailModal(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 상세정보 모달 */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          workplaces={workplaces}
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedUser(null)
          }}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}
