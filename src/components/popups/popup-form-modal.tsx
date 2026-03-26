'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { format } from 'date-fns'

interface PopupData {
  id?: string
  title: string
  content: string
  startDate: string
  endDate: string
  isActive: boolean
}

interface Props {
  popup: PopupData | null
  onClose: () => void
  onSave: () => void
}

export function PopupFormModal({ popup, onClose, onSave }: Props) {
  const isEdit = !!popup?.id

  const [title, setTitle] = useState(popup?.title ?? '')
  const [content, setContent] = useState(popup?.content ?? '')
  const [startDate, setStartDate] = useState(
    popup?.startDate ? format(new Date(popup.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(
    popup?.endDate ? format(new Date(popup.endDate), 'yyyy-MM-dd') : ''
  )
  const [isActive, setIsActive] = useState(popup?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }
    if (!content.trim()) {
      setError('내용을 입력해주세요.')
      return
    }
    if (!startDate || !endDate) {
      setError('표시 기간을 설정해주세요.')
      return
    }

    setSaving(true)

    try {
      const url = isEdit ? `/api/popups/${popup!.id}` : '/api/popups'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate + 'T23:59:59').toISOString(),
          isActive,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '저장에 실패했습니다.')
        return
      }

      onSave()
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? '팝업 수정' : '새 팝업 만들기'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="팝업 제목을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* 내용 (HTML) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              내용 <span className="text-gray-400 font-normal">(HTML 지원)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="팝업 내용을 입력하세요. HTML 태그를 사용할 수 있습니다."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
            />
          </div>

          {/* 기간 설정 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 활성화 여부 */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
            </label>
            <span className="text-sm text-gray-700">활성화</span>
          </div>

          {/* 미리보기 */}
          {content.trim() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">미리보기</label>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">{title || '(제목 없음)'}</h3>
                <div
                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : isEdit ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
