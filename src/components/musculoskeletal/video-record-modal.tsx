'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Video,
  Square,
  CircleDot,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  X,
  Plus,
  Upload,
} from 'lucide-react'

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'uploaded' | 'error'

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
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [mode, setMode] = useState<'record' | 'upload'>('record')
  const { data: session } = useSession()
  const userName = session?.user?.name || ''

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
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

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // 촬영 시작
  const startRecording = useCallback(async () => {
    try {
      setErrorMessage('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType.split(';')[0] })
        setRecordedBlob(blob)
        setRecordingState('recorded')

        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.src = URL.createObjectURL(blob)
          videoRef.current.controls = true
        }
      }

      recorder.start(1000)
      setRecordingState('recording')
      setRecordingDuration(0)

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1)
      }, 1000)
    } catch {
      setErrorMessage('카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.')
    }
  }, [])

  // 촬영 중지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 파일 선택 업로드
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

    setRecordedBlob(file)
    setRecordingState('recorded')

    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = URL.createObjectURL(file)
      videoRef.current.controls = true
    }
  }, [])

  // 업로드
  const uploadVideo = useCallback(async () => {
    if (!recordedBlob) return

    const conn = (navigator as unknown as { connection?: { type?: string } }).connection
    if (conn?.type === 'cellular') {
      const ok = confirm('모바일 데이터를 사용 중입니다. 계속 업로드하시겠습니까?')
      if (!ok) return
    }

    setRecordingState('uploading')
    setUploadProgress(0)

    const formData = new FormData()
    const ext = recordedBlob.type.includes('webm') ? 'webm' : 'mp4'
    const fileName = recordedBlob instanceof File ? recordedBlob.name : `recording_${Date.now()}.${ext}`
    formData.append('file', recordedBlob, fileName)
    formData.append('elementWorkId', elementWorkId)
    formData.append('processName', elementWorkName)
    formData.append('recorder', userName || '촬영자')
    formData.append('durationSec', String(recordingDuration))

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

      setRecordingState('uploaded')
      onUploaded()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '업로드에 실패했습니다.')
      setRecordingState('error')
    }
  }, [recordedBlob, elementWorkId, elementWorkName, userName, recordingDuration, onUploaded])

  // 리셋
  const resetForNext = useCallback(() => {
    setRecordingState('idle')
    setRecordedBlob(null)
    setRecordingDuration(0)
    setUploadProgress(0)
    setErrorMessage('')
    if (videoRef.current) {
      videoRef.current.src = ''
      videoRef.current.controls = false
    }
  }, [])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">작업 영상 촬영</h2>
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
          {/* 모드 선택 (idle일 때만) */}
          {recordingState === 'idle' && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode('record')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  mode === 'record'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CircleDot className="w-4 h-4 inline mr-1" />
                직접 촬영
              </button>
              <button
                onClick={() => setMode('upload')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  mode === 'upload'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-1" />
                파일 업로드
              </button>
            </div>
          )}

          {/* 촬영자 표시 */}
          {recordingState === 'idle' && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Video className="w-4 h-4" />
              <span>촬영자: {userName || '(로그인 사용자)'}</span>
            </div>
          )}

          {/* 비디오 영역 */}
          <div className="relative bg-black aspect-video rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              muted={recordingState === 'recording'}
            />

            {recordingState === 'recording' && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                  <CircleDot className="w-4 h-4 animate-pulse" />
                  REC {formatTime(recordingDuration)}
                </div>
              </div>
            )}

            {recordingState === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <Video className="w-12 h-12 mb-2" />
                <p className="text-sm">
                  {mode === 'record' ? '촬영 버튼을 눌러 시작하세요' : '파일을 선택해주세요'}
                </p>
              </div>
            )}
          </div>

          {/* 컨트롤 */}
          {recordingState === 'idle' && mode === 'record' && (
            <Button
              onClick={startRecording}
              className="w-full h-12 text-base bg-red-600 hover:bg-red-700"
            >
              <CircleDot className="w-5 h-5 mr-2" />
              촬영 시작
            </Button>
          )}

          {recordingState === 'idle' && mode === 'upload' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-5 h-5 mr-2" />
                영상 파일 선택
              </Button>
            </>
          )}

          {recordingState === 'recording' && (
            <Button
              onClick={stopRecording}
              className="w-full h-12 text-base bg-gray-800 hover:bg-gray-900"
            >
              <Square className="w-5 h-5 mr-2" />
              촬영 중지 ({formatTime(recordingDuration)})
            </Button>
          )}

          {recordingState === 'recorded' && (
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
                다시 촬영
              </Button>
            </div>
          )}

          {recordingState === 'uploading' && (
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
                  {recordedBlob && (
                    <p className="text-xs text-gray-400">
                      {(recordedBlob.size / 1024 / 1024).toFixed(1)}MB
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {recordingState === 'uploaded' && (
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
                추가 촬영
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full h-10">
                닫기
              </Button>
            </div>
          )}

          {recordingState === 'error' && (
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

          {errorMessage && recordingState === 'idle' && (
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}
