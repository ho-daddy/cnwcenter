'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Video,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  X,
  Plus,
  Upload,
} from 'lucide-react'

type UploadState = 'idle' | 'selected' | 'uploading' | 'uploaded' | 'error'

interface VideoRecordModalProps {
  elementWorkId: string
  elementWorkName: string
  onClose: () => void
  onUploaded: () => void
}

export function VideoRecordModal({
  elementWorkId,
  elementWorkName,
  onClose,
  onUploaded,
}: VideoRecordModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const { data: session } = useSession()
  const userName = session?.user?.name || ''

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // 파일 선택
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('지원하지 않는 파일 형식입니다. (mp4, webm, mov, avi, mkv)')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      setErrorMessage('파일 크기는 500MB 이하여야 합니다.')
      return
    }

    setErrorMessage('')
    setSelectedFile(file)
    setUploadState('selected')

    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = URL.createObjectURL(file)
      videoRef.current.controls = true
    }
  }, [])

  // 업로드
  const uploadVideo = useCallback(async () => {
    if (!selectedFile) return

    const conn = (navigator as unknown as { connection?: { type?: string } }).connection
    if (conn?.type === 'cellular') {
      const ok = confirm('모바일 데이터를 사용 중입니다. 계속 업로드하시겠습니까?')
      if (!ok) return
    }

    setUploadState('uploading')
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', selectedFile, selectedFile.name)
    formData.append('elementWorkId', elementWorkId)
    formData.append('processName', elementWorkName)
    formData.append('recorder', userName || '촬영자')
    formData.append('durationSec', '0')

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            const err = JSON.parse(xhr.responseText)
            reject(new Error(err.error || '업로드 실패'))
          }
        }

        xhr.onerror = () => reject(new Error('네트워크 오류'))
        xhr.open('POST', '/api/videos')
        xhr.send(formData)
      })

      setUploadState('uploaded')
      onUploaded()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '업로드에 실패했습니다.')
      setUploadState('error')
    }
  }, [selectedFile, elementWorkId, elementWorkName, userName, onUploaded])

  // 리셋
  const resetForNext = useCallback(() => {
    setUploadState('idle')
    setSelectedFile(null)
    setUploadProgress(0)
    setErrorMessage('')
    if (videoRef.current) {
      videoRef.current.src = ''
      videoRef.current.controls = false
    }
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 촬영자 표시 */}
          {uploadState === 'idle' && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Video className="w-4 h-4" />
              <span>촬영자: {userName || '(로그인 사용자)'}</span>
            </div>
          )}

          {/* 파일 선택 버튼 (idle 상태) */}
          {uploadState === 'idle' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors"
              >
                <Upload className="w-10 h-10 text-blue-500" />
                <span className="text-lg font-medium text-blue-700">영상 촬영/선택</span>
                <span className="text-sm text-blue-500">
                  mp4, webm, mov, avi, mkv (최대 500MB)
                </span>
              </button>
            </>
          )}

          {/* 비디오 미리보기 (선택됨 이후) */}
          {uploadState !== 'idle' && (
            <div className="relative bg-black aspect-video rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
              />
            </div>
          )}

          {/* 선택된 파일 업로드 */}
          {uploadState === 'selected' && (
            <div className="space-y-2">
              <Button
                onClick={uploadVideo}
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
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Google Drive에 저장
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetForNext} className="w-full h-10">
                다른 영상 선택
              </Button>
            </div>
          )}

          {/* 업로드 진행 */}
          {uploadState === 'uploading' && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">업로드 중...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-gray-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 업로드 완료 */}
          {uploadState === 'uploaded' && (
            <div className="space-y-3">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">업로드 완료!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    영상이 Google Drive에 저장되었습니다.
                  </p>
                </CardContent>
              </Card>
              <Button
                onClick={resetForNext}
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                추가 영상 업로드
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full h-10">
                닫기
              </Button>
            </div>
          )}

          {/* 에러 */}
          {uploadState === 'error' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">업로드 실패</span>
                </div>
                <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={uploadVideo} className="flex-1">
                    재시도
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetForNext} className="flex-1">
                    처음부터
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {errorMessage && uploadState === 'idle' && (
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}
