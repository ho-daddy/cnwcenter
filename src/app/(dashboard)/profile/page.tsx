'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Key,
  Trash2,
  Loader2,
  AlertTriangle,
  Save,
} from 'lucide-react'

const ROLE_LABELS = {
  SUPER_ADMIN: '최고관리자',
  STAFF: '스탭',
  WORKPLACE_USER: '사업장 사용자',
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    organization: '',
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    if (session?.user) {
      // 프로필 데이터 불러오기
      fetch('/api/user/profile')
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setProfileData({
              name: data.user.name || '',
              phone: data.user.phone || '',
              organization: data.user.organization || '',
            })
          }
        })
    }
  }, [session])

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })

      if (response.ok) {
        await update() // 세션 업데이트
        alert('프로필이 저장되었습니다.')
      } else {
        const data = await response.json()
        alert(data.error || '저장 실패')
      }
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.')
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        alert('비밀번호가 변경되었습니다.')
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        const data = await response.json()
        alert(data.error || '비밀번호 변경 실패')
      }
    } catch (error) {
      alert('비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== session?.user?.email) {
      alert('이메일 주소가 일치하지 않습니다.')
      return
    }

    if (!confirm('정말로 계정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('계정이 삭제되었습니다.')
        router.push('/login')
      } else {
        const data = await response.json()
        alert(data.error || '계정 삭제 실패')
      }
    } catch (error) {
      alert('계정 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // 구글 로그인 사용자 (password가 없음)
  const isGoogleUser = !session.user.email?.endsWith('@saewoomter.org') && session.user.image

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">내 정보</h1>
        <p className="text-sm text-gray-500 mt-1">
          프로필 정보를 수정하고 계정을 관리하세요
        </p>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 이메일 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Mail className="h-4 w-4" />
              이메일
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
              {session.user.email}
            </div>
          </div>

          {/* 역할 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Shield className="h-4 w-4" />
              역할
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
              {ROLE_LABELS[session.user.role as keyof typeof ROLE_LABELS]}
            </div>
          </div>

          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="이름을 입력하세요"
            />
          </div>

          {/* 전화번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Phone className="h-4 w-4" />
              전화번호
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="010-0000-0000"
            />
          </div>

          {/* 소속사업장 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              소속사업장
            </label>
            <input
              type="text"
              value={profileData.organization}
              onChange={(e) => setProfileData({ ...profileData, organization: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="예: ㅇㅇ건설"
            />
            <p className="text-xs text-gray-500 mt-1">
              시스템 사업장 변경은 관리자에게 문의하세요
            </p>
          </div>

          <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            저장
          </Button>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 (이메일 가입자만) */}
      {!isGoogleUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              비밀번호 변경
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">6자 이상</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                비밀번호 변경
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 계정 삭제 */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            위험 구역
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="font-semibold text-red-700 mb-2">계정 삭제</h3>
            <p className="text-sm text-gray-600 mb-4">
              계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
              <br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  삭제를 확인하려면 이메일 주소를 입력하세요:
                </label>
                <input
                  type="email"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={session.user.email || ''}
                />
              </div>
              <Button
                variant="outline"
                className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirm !== session.user.email}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                계정 삭제
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
