'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Paperclip, X, FileText } from 'lucide-react'

interface ExistingAttachment {
  id: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
}

interface NewFile {
  file: File
  preview?: string
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function EditBoardPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>([])
  const [deleteAttachmentIds, setDeleteAttachmentIds] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<NewFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/board/${id}`)
        if (res.ok) {
          const data = await res.json()
          setTitle(data.title)
          setContent(data.content ?? '')
          setExistingAttachments(data.attachments || [])
        } else {
          router.replace('/board')
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, router])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const files: NewFile[] = selected.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))
    setNewFiles((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => {
      const removed = prev[index]
      if (removed.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const markDeleteAttachment = (attId: string) => {
    setDeleteAttachmentIds((prev) => [...prev, attId])
  }

  const undoDeleteAttachment = (attId: string) => {
    setDeleteAttachmentIds((prev) => prev.filter((id) => id !== attId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }
    setIsSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('content', content)
      deleteAttachmentIds.forEach((id) => formData.append('deleteAttachments', id))
      newFiles.forEach((f) => formData.append('files', f.file))

      const res = await fetch(`/api/board/${id}`, {
        method: 'PUT',
        body: formData,
      })

      if (res.ok) {
        router.push(`/board/${id}`)
      } else {
        const data = await res.json()
        setError(data.error ?? '저장 중 오류가 발생했습니다.')
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center text-sm text-gray-400">
        로딩 중...
      </div>
    )
  }

  const visibleExisting = existingAttachments.filter(
    (a) => !deleteAttachmentIds.includes(a.id)
  )
  const deletedExisting = existingAttachments.filter((a) =>
    deleteAttachmentIds.includes(a.id)
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href={`/board/${id}`}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">글 수정</h1>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {error && (
          <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 제목 */}
        <div className="px-6 pt-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full text-lg font-medium text-gray-900 placeholder-gray-400 border-0 border-b border-gray-200 pb-3 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* 내용 */}
        <div className="px-6 pt-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            placeholder="내용을 입력하세요"
            className="w-full text-sm text-gray-800 placeholder-gray-400 border-0 resize-y focus:outline-none leading-relaxed"
          />
        </div>

        {/* 첨부파일 영역 */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              파일 첨부
            </button>
            <span className="text-xs text-gray-400">이미지, 문서, PDF 등 (최대 20MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.txt,.zip"
            />
          </div>

          {/* 기존 첨부파일 */}
          {visibleExisting.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-gray-500">기존 첨부파일</p>
              {visibleExisting.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  {att.fileType.startsWith('image/') ? (
                    <img
                      src={att.filePath}
                      alt={att.fileName}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{att.fileName}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(att.fileSize)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markDeleteAttachment(att.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 삭제 예정 파일 (복원 가능) */}
          {deletedExisting.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-red-500">삭제 예정</p>
              {deletedExisting.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 px-3 py-2 bg-red-50 rounded-lg opacity-60"
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-red-100 rounded">
                    <FileText className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 truncate line-through">{att.fileName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => undoDeleteAttachment(att.id)}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    복원
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 새 첨부파일 */}
          {newFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-emerald-600">새로 추가</p>
              {newFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 bg-emerald-50 rounded-lg"
                >
                  {f.preview ? (
                    <img
                      src={f.preview}
                      alt={f.file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-emerald-100 rounded">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{f.file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(f.file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <Link
            href={`/board/${id}`}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
