'use client'

import { useEffect, useState } from 'react'
import {
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  RotateCcw,
  Clock,
  Trash2,
} from 'lucide-react'
import { useUploadQueueStore, type UploadItem } from '@/stores/upload-queue-store'

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatusIcon({ status }: { status: UploadItem['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-gray-500" />
    case 'uploading':
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
    case 'retrying':
      return <RotateCcw className="w-4 h-4 text-amber-500 animate-pulse" />
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-red-600" />
  }
}

function statusLabel(item: UploadItem) {
  switch (item.status) {
    case 'pending':
      return '대기 중'
    case 'uploading':
      return `업로드 중 ${item.progress}%`
    case 'retrying':
      return `재시도 대기 (${item.retryCount}/3)`
    case 'success':
      return '완료'
    case 'failed':
      return item.errorMessage || '실패'
  }
}

function UploadRow({ item }: { item: UploadItem }) {
  const remove = useUploadQueueStore((s) => s.remove)
  const retry = useUploadQueueStore((s) => s.retry)
  const cancel = useUploadQueueStore((s) => s.cancel)

  // retry 카운트다운
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  useEffect(() => {
    if (item.status !== 'retrying' || !item.retryAt) {
      setSecondsLeft(null)
      return
    }
    const update = () => {
      const left = Math.max(0, Math.ceil((item.retryAt! - Date.now()) / 1000))
      setSecondsLeft(left)
    }
    update()
    const id = setInterval(update, 500)
    return () => clearInterval(id)
  }, [item.status, item.retryAt])

  const isInProgress = item.status === 'uploading' || item.status === 'pending'
  const showProgress = item.status === 'uploading'

  return (
    <div className="px-3 py-2 border-b last:border-b-0 hover:bg-gray-50">
      <div className="flex items-center gap-2 min-w-0">
        <StatusIcon status={item.status} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-900 truncate">
            {item.file.name}
          </div>
          <div className="text-[11px] text-gray-500 truncate">
            {item.elementWorkName} · {formatBytes(item.file.size)}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.status === 'failed' && (
            <button
              type="button"
              onClick={() => retry(item.id)}
              className="p-1 hover:bg-gray-200 rounded text-blue-600"
              title="재시도"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {isInProgress ? (
            <button
              type="button"
              onClick={() => cancel(item.id)}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
              title="취소"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
              title="제거"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 진행률 바 */}
      {showProgress && (
        <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}

      {/* 상태 라벨 (재시도 카운트다운 포함) */}
      <div className="mt-1 text-[11px] text-gray-500">
        {item.status === 'retrying' && secondsLeft !== null
          ? `재시도까지 ${secondsLeft}초 (${item.retryCount}/3)`
          : statusLabel(item)}
      </div>
    </div>
  )
}

export function UploadQueuePanel() {
  const items = useUploadQueueStore((s) => s.items)
  const isMinimized = useUploadQueueStore((s) => s.isPanelMinimized)
  const setMinimized = useUploadQueueStore((s) => s.setPanelMinimized)
  const clearCompleted = useUploadQueueStore((s) => s.clearCompleted)

  // 페이지 이동/새로고침 경고: 진행 중인 업로드가 있으면 차단
  useEffect(() => {
    const hasActive = items.some(
      (i) =>
        i.status === 'pending' ||
        i.status === 'uploading' ||
        i.status === 'retrying'
    )
    if (!hasActive) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [items])

  if (items.length === 0) return null

  const activeCount = items.filter(
    (i) =>
      i.status === 'uploading' ||
      i.status === 'pending' ||
      i.status === 'retrying'
  ).length
  const successCount = items.filter((i) => i.status === 'success').length
  const failedCount = items.filter((i) => i.status === 'failed').length

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b cursor-pointer select-none"
        onClick={() => setMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Upload className="w-4 h-4 text-blue-600" />
          {activeCount > 0 ? (
            <span>업로드 {activeCount}개 진행 중</span>
          ) : (
            <span>업로드 완료</span>
          )}
          {successCount > 0 && (
            <span className="text-xs text-green-600">· {successCount}개 완료</span>
          )}
          {failedCount > 0 && (
            <span className="text-xs text-red-600">· {failedCount}개 실패</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {successCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearCompleted()
              }}
              className="p-1 hover:bg-gray-200 rounded text-gray-500 text-[11px]"
              title="완료된 항목 정리"
            >
              완료 정리
            </button>
          )}
          <button
            type="button"
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
          >
            {isMinimized ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 항목 리스트 */}
      {!isMinimized && (
        <div className="max-h-[50vh] overflow-y-auto">
          {items.map((item) => (
            <UploadRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
