'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, X, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExistingPhoto {
  id: string
  photoPath: string
  thumbnailPath?: string | null
}

interface PhotoUploaderProps {
  /** staged: 파일을 메모리에 모아둠 (신규 등록), immediate: 즉시 API 업로드 */
  mode: 'staged' | 'immediate'
  /** immediate 모드에서 파일을 POST할 URL */
  uploadUrl?: string
  /** staged 모드에서 파일 목록 변경 콜백 */
  onFilesChange?: (files: File[]) => void
  /** immediate 모드에서 업로드 성공 시 콜백 */
  onUploaded?: (photo: ExistingPhoto) => void
  /** 이미 업로드된 사진 목록 */
  existingPhotos?: ExistingPhoto[]
  /** 기존 사진 삭제 콜백 */
  onDeleteExisting?: (photoId: string) => void
  /** 최대 사진 수 (기본 10) */
  maxPhotos?: number
  /** 최대 파일 크기 바이트 (기본 10MB) */
  maxFileSize?: number
  disabled?: boolean
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_MAX_PHOTOS = 10

export function PhotoUploader({
  mode,
  uploadUrl,
  onFilesChange,
  onUploaded,
  existingPhotos = [],
  onDeleteExisting,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  maxFileSize = DEFAULT_MAX_SIZE,
  disabled = false,
}: PhotoUploaderProps) {
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalCount = existingPhotos.length + stagedFiles.length

  // staged preview URL 정리
  useEffect(() => {
    return () => {
      stagedPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'JPG, PNG, GIF, WebP 파일만 첨부할 수 있습니다.'
    }
    if (file.size > maxFileSize) {
      return `파일 크기는 ${Math.round(maxFileSize / 1024 / 1024)}MB 이하여야 합니다.`
    }
    return null
  }, [maxFileSize])

  const addFiles = useCallback(async (files: File[]) => {
    setError('')

    const remaining = maxPhotos - totalCount
    if (remaining <= 0) {
      setError(`최대 ${maxPhotos}장까지 첨부할 수 있습니다.`)
      return
    }

    const validFiles: File[] = []
    for (const file of files.slice(0, remaining)) {
      const err = validateFile(file)
      if (err) {
        setError(err)
        return
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    if (mode === 'staged') {
      const newPreviews = validFiles.map((f) => URL.createObjectURL(f))
      setStagedFiles((prev) => {
        const next = [...prev, ...validFiles]
        onFilesChange?.(next)
        return next
      })
      setStagedPreviews((prev) => [...prev, ...newPreviews])
    } else if (mode === 'immediate' && uploadUrl) {
      setIsUploading(true)
      try {
        for (const file of validFiles) {
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch(uploadUrl, { method: 'POST', body: formData })
          if (res.ok) {
            const photo = await res.json()
            onUploaded?.(photo)
          } else {
            const data = await res.json().catch(() => ({}))
            setError(data.error || '업로드에 실패했습니다.')
          }
        }
      } catch {
        setError('업로드 중 오류가 발생했습니다.')
      } finally {
        setIsUploading(false)
      }
    }
  }, [mode, uploadUrl, maxPhotos, totalCount, validateFile, onFilesChange, onUploaded])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) addFiles(files)
    e.target.value = '' // 같은 파일 재선택 허용
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const imageFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault()
      addFiles(imageFiles)
    }
  }, [addFiles])

  const removeStaged = (index: number) => {
    URL.revokeObjectURL(stagedPreviews[index])
    setStagedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      onFilesChange?.(next)
      return next
    })
    setStagedPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDeleteExisting = (photoId: string) => {
    if (!confirm('사진을 삭제하시겠습니까?')) return
    onDeleteExisting?.(photoId)
  }

  return (
    <div
      ref={containerRef}
      onPaste={handlePaste}
      tabIndex={0}
      className="outline-none"
    >
      <div className="flex flex-wrap gap-2">
        {/* 기존 업로드된 사진 */}
        {existingPhotos.map((photo) => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.thumbnailPath || photo.photoPath}
              alt=""
              className="w-20 h-20 rounded-lg object-cover border border-gray-200"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleDeleteExisting(photo.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* staged 사진 미리보기 */}
        {stagedPreviews.map((url, i) => (
          <div key={url} className="relative group">
            <img
              src={url}
              alt=""
              className="w-20 h-20 rounded-lg object-cover border border-blue-200"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeStaged(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* 추가 버튼 */}
        {!disabled && totalCount < maxPhotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors',
              isUploading
                ? 'border-gray-200 bg-gray-50 cursor-wait'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
            )}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5 text-gray-400" />
                <span className="text-[10px] text-gray-400">사진추가</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 안내 텍스트 */}
      {!disabled && totalCount < maxPhotos && (
        <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
          <ImagePlus className="w-3 h-3" />
          촬영, 파일 선택, 또는 붙여넣기(Ctrl+V) · 최대 {maxPhotos}장
        </p>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* 숨겨진 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  )
}
