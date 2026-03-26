'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface ActivePopup {
  id: string
  title: string
  content: string
}

const DISMISS_KEY_PREFIX = 'popup_dismissed_'

function getDismissKey(popupId: string): string {
  const today = new Date().toISOString().split('T')[0]
  return `${DISMISS_KEY_PREFIX}${popupId}_${today}`
}

function isDismissedToday(popupId: string): boolean {
  try {
    return localStorage.getItem(getDismissKey(popupId)) === '1'
  } catch {
    return false
  }
}

function dismissForToday(popupId: string) {
  try {
    localStorage.setItem(getDismissKey(popupId), '1')
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

export function PopupDisplay() {
  const [popups, setPopups] = useState<ActivePopup[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const fetchPopups = useCallback(async () => {
    try {
      const res = await fetch('/api/popups/active')
      if (!res.ok) return

      const data = await res.json()
      const visible = (data.popups as ActivePopup[]).filter(
        (p) => !isDismissedToday(p.id)
      )
      setPopups(visible)
    } catch {
      // 실패 시 팝업 미표시
    }
  }, [])

  useEffect(() => {
    fetchPopups()
  }, [fetchPopups])

  const handleClose = () => {
    setPopups((prev) => {
      const next = prev.filter((_, i) => i !== currentIndex)
      if (currentIndex >= next.length && next.length > 0) {
        setCurrentIndex(next.length - 1)
      }
      return next
    })
  }

  const handleDismissToday = () => {
    const popup = popups[currentIndex]
    if (popup) {
      dismissForToday(popup.id)
    }
    handleClose()
  }

  if (popups.length === 0) return null

  const popup = popups[currentIndex]
  if (!popup) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{popup.title}</h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 overflow-y-auto flex-1">
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: popup.content }}
          />
        </div>

        {/* 하단 */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-xl shrink-0">
          <button
            onClick={handleDismissToday}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            오늘 하루 보지 않기
          </button>
          <div className="flex items-center gap-3">
            {popups.length > 1 && (
              <span className="text-xs text-gray-400">
                {currentIndex + 1} / {popups.length}
              </span>
            )}
            {popups.length > 1 && currentIndex < popups.length - 1 && (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                다음
              </button>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
