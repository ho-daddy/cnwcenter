/**
 * Google Drive Resumable Upload 클라이언트 헬퍼
 * 클라이언트가 직접 Drive 의 임시 업로드 URL 에 청크 단위로 PUT 한다.
 * 청크 사이의 끊김은 308 응답의 Range 헤더를 통해 재개 가능.
 *
 * 참고: https://developers.google.com/drive/api/guides/manage-uploads#resumable
 */

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024 // 8MB (256KB 의 배수)
const DEFAULT_CHUNK_RETRIES = 3

export interface ResumableUploadOptions {
  uploadUrl: string
  file: File
  chunkSize?: number
  onProgress?: (uploaded: number, total: number) => void
  abortSignal?: AbortSignal
  /** 재개 시작 위치 (default 0) */
  startByte?: number
  /** 청크별 재시도 횟수 (default 3) */
  maxRetries?: number
}

export interface ResumableUploadResult {
  driveFileId: string
  driveUrl?: string
  metadata: Record<string, unknown>
}

interface ChunkResponse {
  done: boolean
  data?: Record<string, unknown>
  nextByte?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function performResumableUpload({
  uploadUrl,
  file,
  chunkSize = DEFAULT_CHUNK_SIZE,
  onProgress,
  abortSignal,
  startByte = 0,
  maxRetries = DEFAULT_CHUNK_RETRIES,
}: ResumableUploadOptions): Promise<ResumableUploadResult> {
  const total = file.size
  let cursor = startByte

  while (cursor < total) {
    if (abortSignal?.aborted) {
      throw new Error('Aborted')
    }

    const end = Math.min(cursor + chunkSize, total)
    const chunk = file.slice(cursor, end)
    const contentRange = `bytes ${cursor}-${end - 1}/${total}`

    let lastError: Error | null = null
    let response: ChunkResponse | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (abortSignal?.aborted) throw new Error('Aborted')
      try {
        response = await uploadChunk({
          uploadUrl,
          chunk,
          contentRange,
          totalSize: total,
          onProgress,
          baseOffset: cursor,
          abortSignal,
        })
        lastError = null
        break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error')
        if (lastError.message === 'Aborted') throw lastError
        // 청크 단위 짧은 백오프
        if (attempt < maxRetries) {
          await sleep(1000 * Math.pow(2, attempt))
        }
      }
    }

    if (!response) throw lastError || new Error('청크 업로드 실패')

    if (response.done) {
      const data = response.data || {}
      onProgress?.(total, total)
      return {
        driveFileId: String(data.id || ''),
        driveUrl:
          typeof data.webViewLink === 'string' ? data.webViewLink : undefined,
        metadata: data,
      }
    }

    cursor = response.nextByte ?? end
  }

  throw new Error('업로드가 완료되지 않았습니다')
}

interface UploadChunkParams {
  uploadUrl: string
  chunk: Blob
  contentRange: string
  totalSize: number
  baseOffset: number
  onProgress?: (uploaded: number, total: number) => void
  abortSignal?: AbortSignal
}

function uploadChunk({
  uploadUrl,
  chunk,
  contentRange,
  totalSize,
  baseOffset,
  onProgress,
  abortSignal,
}: UploadChunkParams): Promise<ChunkResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    const onAbort = () => xhr.abort()
    abortSignal?.addEventListener('abort', onAbort, { once: true })

    const cleanup = () => {
      abortSignal?.removeEventListener('abort', onAbort)
    }

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return
      onProgress(baseOffset + e.loaded, totalSize)
    }

    xhr.onload = () => {
      cleanup()
      if (xhr.status === 200 || xhr.status === 201) {
        let data: Record<string, unknown> = {}
        try {
          data = JSON.parse(xhr.responseText)
        } catch {}
        resolve({ done: true, data })
        return
      }
      if (xhr.status === 308) {
        const range =
          xhr.getResponseHeader('Range') || xhr.getResponseHeader('range')
        let nextByte: number | undefined
        if (range) {
          const m = range.match(/bytes=\d+-(\d+)/i)
          if (m) nextByte = parseInt(m[1], 10) + 1
        }
        resolve({ done: false, nextByte })
        return
      }
      const snippet = (xhr.responseText || '').slice(0, 200)
      reject(new Error(`청크 업로드 실패: ${xhr.status} ${snippet}`))
    }

    xhr.onerror = () => {
      cleanup()
      reject(new Error('네트워크 오류'))
    }
    xhr.onabort = () => {
      cleanup()
      reject(new Error('Aborted'))
    }

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Range', contentRange)
    xhr.send(chunk)
  })
}

/**
 * 업로드 진행 상태 확인 (재개 시작 위치 결정용)
 * @returns nextByte 다음에 업로드해야 할 byte 위치 (이미 끝났으면 fileSize)
 */
export async function queryResumableUploadStatus(
  uploadUrl: string,
  fileSize: number
): Promise<{ done: boolean; nextByte: number; data?: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        let data: Record<string, unknown> = {}
        try {
          data = JSON.parse(xhr.responseText)
        } catch {}
        resolve({ done: true, nextByte: fileSize, data })
        return
      }
      if (xhr.status === 308) {
        const range =
          xhr.getResponseHeader('Range') || xhr.getResponseHeader('range')
        let nextByte = 0
        if (range) {
          const m = range.match(/bytes=\d+-(\d+)/i)
          if (m) nextByte = parseInt(m[1], 10) + 1
        }
        resolve({ done: false, nextByte })
        return
      }
      reject(new Error(`상태 조회 실패: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('네트워크 오류'))
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Range', `bytes */${fileSize}`)
    xhr.setRequestHeader('Content-Length', '0')
    xhr.send()
  })
}
