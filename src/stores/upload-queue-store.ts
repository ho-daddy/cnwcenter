import { create } from 'zustand'
import { performResumableUpload } from '@/lib/resumable-upload-client'

const RETRY_DELAYS_MS = [5000, 15000, 45000]
const MAX_RETRIES = RETRY_DELAYS_MS.length

export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'retrying'
  | 'success'
  | 'failed'

export interface UploadItem {
  id: string
  file: File
  elementWorkId: string
  elementWorkName: string
  recorder: string
  durationSec: number
  status: UploadStatus
  progress: number
  retryCount: number
  errorMessage?: string
  videoId?: string
  driveUrl?: string
  enqueuedAt: number
  retryAt?: number
}

export interface EnqueueParams {
  file: File
  elementWorkId: string
  elementWorkName: string
  recorder: string
  durationSec?: number
}

interface UploadQueueState {
  items: UploadItem[]
  isProcessing: boolean
  isPanelMinimized: boolean
  setPanelMinimized: (v: boolean) => void

  enqueue: (params: EnqueueParams) => string
  enqueueMany: (paramsList: EnqueueParams[]) => string[]
  remove: (id: string) => void
  retry: (id: string) => void
  cancel: (id: string) => void
  clearCompleted: () => void

  _activeAbort: AbortController | null
  _activeId: string | null
  _processNext: () => void
}

const generateId = () =>
  `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const buildItem = (params: EnqueueParams): UploadItem => ({
  id: generateId(),
  file: params.file,
  elementWorkId: params.elementWorkId,
  elementWorkName: params.elementWorkName,
  recorder: params.recorder,
  durationSec: params.durationSec ?? 0,
  status: 'pending',
  progress: 0,
  retryCount: 0,
  enqueuedAt: Date.now(),
})

export const useUploadQueueStore = create<UploadQueueState>((set, get) => ({
  items: [],
  isProcessing: false,
  isPanelMinimized: false,
  _activeAbort: null,
  _activeId: null,

  setPanelMinimized: (v) => set({ isPanelMinimized: v }),

  enqueue: (params) => {
    const item = buildItem(params)
    set((s) => ({ items: [...s.items, item] }))
    setTimeout(() => get()._processNext(), 0)
    return item.id
  },

  enqueueMany: (paramsList) => {
    const newItems = paramsList.map(buildItem)
    set((s) => ({ items: [...s.items, ...newItems] }))
    setTimeout(() => get()._processNext(), 0)
    return newItems.map((i) => i.id)
  },

  remove: (id) => {
    const { _activeId, _activeAbort } = get()
    if (id === _activeId && _activeAbort) {
      _activeAbort.abort()
      set({ _activeAbort: null, _activeId: null, isProcessing: false })
    }
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
    setTimeout(() => get()._processNext(), 0)
  },

  retry: (id) => {
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id
          ? {
              ...i,
              status: 'pending' as UploadStatus,
              retryCount: 0,
              errorMessage: undefined,
              progress: 0,
              retryAt: undefined,
            }
          : i
      ),
    }))
    setTimeout(() => get()._processNext(), 0)
  },

  cancel: (id) => {
    const { _activeId, _activeAbort } = get()
    if (id === _activeId && _activeAbort) {
      _activeAbort.abort()
      set({ _activeAbort: null, _activeId: null, isProcessing: false })
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id
          ? { ...i, status: 'failed' as UploadStatus, errorMessage: '취소됨' }
          : i
      ),
    }))
    setTimeout(() => get()._processNext(), 0)
  },

  clearCompleted: () => {
    set((s) => ({
      items: s.items.filter((i) => i.status !== 'success'),
    }))
  },

  _processNext: () => {
    const state = get()
    if (state.isProcessing) return

    const now = Date.now()
    const next = state.items.find((i) => {
      if (i.status === 'pending') return true
      if (i.status === 'retrying' && i.retryAt && i.retryAt <= now) return true
      return false
    })

    if (!next) {
      // 재시도 대기 중인 항목이 있으면 도래 시점에 다시 호출
      const upcoming = state.items
        .filter((i) => i.status === 'retrying' && i.retryAt)
        .sort((a, b) => a.retryAt! - b.retryAt!)
      if (upcoming[0]) {
        const delay = Math.max(0, upcoming[0].retryAt! - now) + 50
        setTimeout(() => get()._processNext(), delay)
      }
      return
    }

    const abort = new AbortController()
    set({
      isProcessing: true,
      _activeId: next.id,
      _activeAbort: abort,
    })
    set((s) => ({
      items: s.items.map((i) =>
        i.id === next.id
          ? { ...i, status: 'uploading' as UploadStatus, progress: 0 }
          : i
      ),
    }))

    const updateItem = (patch: Partial<UploadItem>) => {
      set((s) => ({
        items: s.items.map((i) =>
          i.id === next.id ? { ...i, ...patch } : i
        ),
      }))
    }

    const scheduleRetryOrFail = (errMsg: string) => {
      const item = get().items.find((i) => i.id === next.id)
      if (!item) {
        set({
          _activeAbort: null,
          _activeId: null,
          isProcessing: false,
        })
        setTimeout(() => get()._processNext(), 0)
        return
      }

      if (item.retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[item.retryCount]
        const retryAt = Date.now() + delay
        set((s) => ({
          items: s.items.map((i) =>
            i.id === next.id
              ? {
                  ...i,
                  status: 'retrying' as UploadStatus,
                  retryCount: i.retryCount + 1,
                  errorMessage: errMsg,
                  retryAt,
                }
              : i
          ),
          _activeAbort: null,
          _activeId: null,
          isProcessing: false,
        }))
        setTimeout(() => get()._processNext(), delay + 100)
      } else {
        set((s) => ({
          items: s.items.map((i) =>
            i.id === next.id
              ? {
                  ...i,
                  status: 'failed' as UploadStatus,
                  errorMessage: errMsg,
                }
              : i
          ),
          _activeAbort: null,
          _activeId: null,
          isProcessing: false,
        }))
      }
    }

    // 비동기 시퀀스: initiate → resumable upload → complete
    ;(async () => {
      try {
        // 1. Resumable session 시작
        const initiateRes = await fetch('/api/videos/initiate-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: next.file.name,
            fileSize: next.file.size,
            mimeType: next.file.type,
            elementWorkId: next.elementWorkId,
            processName: next.elementWorkName,
            recorder: next.recorder,
            durationSec: next.durationSec,
          }),
          signal: abort.signal,
        })

        if (!initiateRes.ok) {
          let msg = '업로드 세션 시작 실패'
          try {
            const err = await initiateRes.json()
            msg = err.error || err.detail || msg
          } catch {}
          scheduleRetryOrFail(msg)
          setTimeout(() => get()._processNext(), 0)
          return
        }

        const { videoId, uploadUrl } = (await initiateRes.json()) as {
          videoId: string
          uploadUrl: string
        }
        updateItem({ videoId })

        // 2. Resumable Upload (클라이언트 → Drive 직접)
        const result = await performResumableUpload({
          uploadUrl,
          file: next.file,
          abortSignal: abort.signal,
          onProgress: (uploaded, total) => {
            const progress = Math.round((uploaded / total) * 100)
            set((s) => ({
              items: s.items.map((i) =>
                i.id === next.id ? { ...i, progress } : i
              ),
            }))
          },
        })

        // 3. Complete (DB UPLOADED, 권한 설정)
        const completeRes = await fetch(
          `/api/videos/${videoId}/complete-upload`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driveFileId: result.driveFileId,
              driveUrl: result.driveUrl,
              durationSec: next.durationSec,
            }),
            signal: abort.signal,
          }
        )

        if (!completeRes.ok) {
          let msg = '완료 처리 실패'
          try {
            const err = await completeRes.json()
            msg = err.error || err.detail || msg
          } catch {}
          scheduleRetryOrFail(msg)
          setTimeout(() => get()._processNext(), 0)
          return
        }

        const completeData = await completeRes.json()

        set((s) => ({
          items: s.items.map((i) =>
            i.id === next.id
              ? {
                  ...i,
                  status: 'success' as UploadStatus,
                  progress: 100,
                  videoId,
                  driveUrl: completeData.video?.driveUrl,
                }
              : i
          ),
          _activeAbort: null,
          _activeId: null,
          isProcessing: false,
        }))
        setTimeout(() => get()._processNext(), 0)
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === 'AbortError'
        ) {
          // remove/cancel 에서 이미 상태 변경됨
          setTimeout(() => get()._processNext(), 0)
          return
        }
        const msg = err instanceof Error ? err.message : '알 수 없는 오류'
        if (msg === 'Aborted') {
          setTimeout(() => get()._processNext(), 0)
          return
        }
        scheduleRetryOrFail(msg)
        setTimeout(() => get()._processNext(), 0)
      }
    })()
  },
}))

// success 항목 수 (페이지에서 fetchVideos 트리거용)
export const selectSuccessCount = (s: UploadQueueState) =>
  s.items.filter((i) => i.status === 'success').length

export const selectSuccessCountByElementWork = (elementWorkId: string) =>
  (s: UploadQueueState) =>
    s.items.filter(
      (i) => i.status === 'success' && i.elementWorkId === elementWorkId
    ).length
