'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Video,
  Wifi,
  WifiOff,
  X,
  Upload,
  Plus,
  Trash2,
} from 'lucide-react'
import { useUploadQueueStore } from '@/stores/upload-queue-store'

const ALLOWED_TYPES = [
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
]
const MAX_SIZE = 500 * 1024 * 1024 // 500MB

interface VideoRecordModalProps {
  elementWorkId: string
  elementWorkName: string
  onClose: () => void
  /**
   * @deprecated 큐 기반 업로드로 전환됨. 페이지에서 useUploadQueueStore 의 success 변화를
   * 감지해서 fetchVideos 를 호출하세요. 호환을 위해 enqueue 직후에도 호출됨.
   */
  onUploaded?: () => void
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function VideoRecordModal({
  elementWorkId,
  elementWorkName,
  onClose,
  onUploaded,
}: VideoRecordModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const { data: session } = useSession()
  const userName = session?.user?.name || ''

  const fileInputRef = useRef<HTMLInputElement>(null)
  const enqueueMany = useUploadQueueStore((s) => s.enqueueMany)

  // 네트워크 상태 감지
  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    setIsOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  // 파일 선택 (다중)
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return

      const accepted: File[] = []
      const rejected: string[] = []

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          rejected.push(`${file.name}: 지원 안 함`)
          continue
        }
        if (file.size > MAX_SIZE) {
          rejected.push(`${file.name}: 500MB 초과`)
          continue
        }
        accepted.push(file)
      }

      setSelectedFiles((prev) => [...prev, ...accepted])
      setErrorMessage(rejected.length ? rejected.join('\n') : '')

      // input 초기화 (같은 파일 재선택 가능하게)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    []
  )

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleEnqueue = useCallback(() => {
    if (selectedFiles.length === 0) return

    const conn = (navigator as unknown as { connection?: { type?: string } })
      .connection
    if (conn?.type === 'cellular') {
      const ok = confirm('모바일 데이터를 사용 중입니다. 계속 업로드하시겠습니까?')
      if (!ok) return
    }

    enqueueMany(
      selectedFiles.map((file) => ({
        file,
        elementWorkId,
        elementWorkName,
        recorder: userName || '촬영자',
        durationSec: 0,
      }))
    )

    onUploaded?.()
    onClose()
  }, [
    selectedFiles,
    elementWorkId,
    elementWorkName,
    userName,
    enqueueMany,
    onUploaded,
    onClose,
  ])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">작업 영상 업로드</h2>
            <p className="text-sm text-gray-500 mt-0.5">{elementWorkName}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 촬영자 표시 */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Video className="w-4 h-4" />
            <span>촬영자: {userName || '(로그인 사용자)'}</span>
          </div>

          {/* 파일 선택 영역 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors"
          >
            <Upload className="w-8 h-8 text-blue-500" />
            <span className="text-base font-medium text-blue-700">
              {selectedFiles.length === 0
                ? '영상 선택 (여러 개 가능)'
                : '영상 추가'}
            </span>
            <span className="text-xs text-blue-500">
              mp4, webm, mov, avi, mkv (각 최대 500MB)
            </span>
          </button>

          {/* 선택된 파일 목록 */}
          {selectedFiles.length > 0 && (
            <div className="space-y-1 border rounded-lg divide-y max-h-60 overflow-y-auto">
              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}_${idx}`}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <Video className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatBytes(file.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 큐 추가 버튼 */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Button
                onClick={handleEnqueue}
                disabled={!isOnline}
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              >
                {!isOnline ? (
                  <>
                    <WifiOff className="w-5 h-5 mr-2" />
                    오프라인 - 업로드 불가
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    {selectedFiles.length}개 영상 업로드 시작
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                업로드는 백그라운드에서 진행됩니다. 바로 다음 작업으로 이동하셔도 됩니다.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="text-sm text-red-600 whitespace-pre-line bg-red-50 p-2 rounded">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
