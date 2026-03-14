'use client'

import { useState } from 'react'
import { UserRole, UserStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  X,
  User as UserIcon,
  Mail,
  Shield,
  Building2,
  Calendar,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

interface UserDetailModalProps {
  user: UserData
  workplaces: WorkplaceOption[]
  open: boolean
  onClose: () => void
  onRefresh: () => void
}

const STATUS_LABELS: Record<UserStatus, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '거부',
  SUSPENDED: '정지',
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: '최고관리자',
  STAFF: '스탭',
  WORKPLACE_USER: '사업장 사용자',
}

export function UserDetailModal({ user, workplaces, open, onClose, onRefresh }: UserDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [editedData, setEditedData] = useState({
    name: user.name || '',
    phone: user.phone || '',
    organization: user.organization || '',
    role: user.role,
    status: user.status,
    workplaceId: user.workplaces[0]?.workplace.id || '',
  })

  if (!open) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 기본 정보 수정
      const updateRes = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedData.name,
          phone: editedData.phone || null,
          organization: editedData.organization || null,
        }),
      })

      if (!updateRes.ok) {
        throw new Error('기본 정보 수정 실패')
      }

      // 역할 변경
      if (editedData.role !== user.role) {
        const roleRes = await fetch(`/api/admin/users/${user.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: editedData.role }),
        })
        if (!roleRes.ok) {
          throw new Error('역할 변경 실패')
        }
      }

      // 상태 변경
      if (editedData.status !== user.status) {
        let endpoint = ''
        if (editedData.status === 'APPROVED') endpoint = 'approve'
        else if (editedData.status === 'REJECTED') endpoint = 'reject'
        else if (editedData.status === 'SUSPENDED') endpoint = 'suspend'

        if (endpoint) {
          const statusRes = await fetch(`/api/admin/users/${user.id}/${endpoint}`, {
            method: 'POST',
          })
          if (!statusRes.ok) {
            throw new Error('상태 변경 실패')
          }
        }
      }

      // 사업장 변경 (WORKPLACE_USER인 경우만)
      if (editedData.role === 'WORKPLACE_USER' && editedData.workplaceId !== (user.workplaces[0]?.workplace.id || '')) {
        const wpRes = await fetch(`/api/admin/users/${user.id}/workplace`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workplaceId: editedData.workplaceId || null }),
        })
        if (!wpRes.ok) {
          throw new Error('사업장 변경 실패')
        }
      }

      alert('수정되었습니다.')
      setIsEditing(false)
      onRefresh()
      onClose()
    } catch (error: any) {
      alert(error.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`정말로 ${user.name || user.email} 사용자를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('사용자가 삭제되었습니다.')
        onRefresh()
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || '삭제 실패')
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserIcon className="h-6 w-6" />
            사용자 상세정보
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 프로필 */}
          <div className="flex items-center gap-4 pb-6 border-b">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              {user.image ? (
                <img src={user.image} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <UserIcon className="h-8 w-8 text-gray-500" />
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.name}
                  onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-lg font-semibold"
                  placeholder="이름"
                />
              ) : (
                <>
                  <div className="text-xl font-bold">{user.name || '(이름 없음)'}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 상세 정보 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedData.phone}
                  onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="010-0000-0000"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                  {user.phone || '(없음)'}
                </div>
              )}
            </div>

            {/* 소속사업장 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">소속사업장</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.organization}
                  onChange={(e) => setEditedData({ ...editedData, organization: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="예: ㅇㅇ건설"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                  {user.organization || '(없음)'}
                </div>
              )}
            </div>

            {/* 역할 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Shield className="h-4 w-4" />
                역할
              </label>
              {isEditing ? (
                <select
                  value={editedData.role}
                  onChange={(e) => setEditedData({ ...editedData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="SUPER_ADMIN">최고관리자</option>
                  <option value="STAFF">스탭</option>
                  <option value="WORKPLACE_USER">사업장 사용자</option>
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-medium">
                  {ROLE_LABELS[user.role]}
                </div>
              )}
            </div>

            {/* 상태 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              {isEditing ? (
                <select
                  value={editedData.status}
                  onChange={(e) => setEditedData({ ...editedData, status: e.target.value as UserStatus })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="PENDING">대기</option>
                  <option value="APPROVED">승인</option>
                  <option value="REJECTED">거부</option>
                  <option value="SUSPENDED">정지</option>
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-medium">
                  {STATUS_LABELS[user.status]}
                </div>
              )}
            </div>

            {/* 시스템 사업장 (WORKPLACE_USER만) */}
            {editedData.role === 'WORKPLACE_USER' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  시스템 사업장
                </label>
                {isEditing ? (
                  <select
                    value={editedData.workplaceId}
                    onChange={(e) => setEditedData({ ...editedData, workplaceId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">미지정</option>
                    {workplaces.map((wp) => (
                      <option key={wp.id} value={wp.id}>
                        {wp.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                    {user.workplaces[0]?.workplace.name || '미지정'}
                  </div>
                )}
              </div>
            )}

            {/* 가입일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                가입일
              </label>
              <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                {formatDate(user.createdAt)}
              </div>
            </div>

            {/* 승인일/거부일 */}
            {user.approvedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">승인일</label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                  {formatDate(user.approvedAt)}
                </div>
              </div>
            )}
            {user.rejectedAt && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">거부 사유</label>
                <div className="px-3 py-2 bg-red-50 rounded-md text-sm text-red-700">
                  {user.rejectedReason || '(사유 없음)'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
          <div>
            {isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                취소
              </Button>
            ) : (
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                저장
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                수정
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
