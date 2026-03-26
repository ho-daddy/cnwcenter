'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { PopupFormModal } from '@/components/popups/popup-form-modal'

interface Popup {
  id: string
  title: string
  content: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  createdBy: { id: string; name: string | null }
}

export default function PopupsManagementPage() {
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null)

  const fetchPopups = useCallback(async () => {
    try {
      const res = await fetch('/api/popups')
      if (res.ok) {
        const data = await res.json()
        setPopups(data.popups)
      }
    } catch (error) {
      console.error('팝업 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPopups()
  }, [fetchPopups])

  const handleCreate = () => {
    setEditingPopup(null)
    setShowModal(true)
  }

  const handleEdit = (popup: Popup) => {
    setEditingPopup(popup)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 팝업을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/popups/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPopups((prev) => prev.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('팝업 삭제 실패:', error)
    }
  }

  const handleToggleActive = async (popup: Popup) => {
    try {
      const res = await fetch(`/api/popups/${popup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...popup,
          isActive: !popup.isActive,
        }),
      })
      if (res.ok) {
        setPopups((prev) =>
          prev.map((p) => (p.id === popup.id ? { ...p, isActive: !p.isActive } : p))
        )
      }
    } catch (error) {
      console.error('팝업 상태 변경 실패:', error)
    }
  }

  const handleSave = () => {
    setShowModal(false)
    setEditingPopup(null)
    fetchPopups()
  }

  const isCurrentlyActive = (popup: Popup) => {
    if (!popup.isActive) return false
    const now = new Date()
    const start = new Date(popup.startDate)
    const end = new Date(popup.endDate)
    
    // 날짜만 비교 (시간 무시)
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    
    return startDate <= nowDate && nowDate <= endDate
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">팝업 관리</h1>
          <p className="text-sm text-gray-500 mt-1">메인 페이지에 표시할 팝업을 관리합니다.</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          새 팝업
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">불러오는 중...</div>
      ) : popups.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500">등록된 팝업이 없습니다.</p>
          <button
            onClick={handleCreate}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            첫 팝업 만들기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {popups.map((popup) => {
            const active = isCurrentlyActive(popup)
            return (
              <div
                key={popup.id}
                className="bg-white rounded-lg border p-4 flex items-center gap-4"
              >
                {/* 상태 표시 */}
                <div className="shrink-0">
                  {active ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      표시 중
                    </span>
                  ) : popup.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      기간 외
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      비활성
                    </span>
                  )}
                </div>

                {/* 팝업 정보 */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{popup.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {format(new Date(popup.startDate), 'yyyy.MM.dd', { locale: ko })} ~{' '}
                    {format(new Date(popup.endDate), 'yyyy.MM.dd', { locale: ko })}
                    <span className="mx-2">·</span>
                    {popup.createdBy.name ?? '알 수 없음'}
                  </p>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(popup)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={popup.isActive ? '비활성화' : '활성화'}
                  >
                    {popup.isActive ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(popup)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="수정"
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(popup.id)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <PopupFormModal
          popup={editingPopup}
          onClose={() => {
            setShowModal(false)
            setEditingPopup(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
