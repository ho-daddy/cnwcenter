'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Paperclip, X, FileText } from 'lucide-react'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

interface AttachedFile {
  file: File
  preview?: string
}

export default function NewBoardPostPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const newFiles: AttachedFile[] = selected.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))
    setFiles((prev) => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index]
      if (removed.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
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
      files.forEach((f) => formData.append('files', f.file))

      const res = await fetch('/api/board', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const post = await res.json()
        router.push(`/board/${post.id}`)
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/board" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">글쓰기</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {error && (
          <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="px-6 pt-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full text-lg font-medium text-gray-900 placeholder-gray-400 border-0 border-b border-gray-200 pb-3 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="px-6 pt-4 pb-2">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="내용을 입력하세요"
            className="min-h-[280px]"
          />
        </div>

        {/* 파일 첨부 */}
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
            <span className="text-xs text-gray-400">문서, PDF, HWP 등 (최대 20MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt,.zip"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{f.file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(f.file.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <Link href="/board" className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '저장 중...' : '게시'}
          </button>
        </div>
      </form>
    </div>
  )
}
