'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  MessageSquare,
  Send,
  Paperclip,
  Download,
  FileText,
  Eye,
} from 'lucide-react'

interface Author {
  id: string
  name: string | null
}

interface Comment {
  id: string
  content: string
  author: Author
  createdAt: string
}

interface Attachment {
  id: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
}

interface Post {
  id: string
  title: string
  content: string | null
  viewCount: number
  author: Author
  createdAt: string
  updatedAt: string
  comments: Comment[]
  attachments: Attachment[]
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function BoardPostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  const isStaff =
    session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'STAFF'
  const isAuthor = post?.author.id === session?.user?.id

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/board/${id}`)
      if (res.ok) {
        setPost(await res.json())
      } else if (res.status === 404) {
        router.replace('/board')
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPost()
  }, [id])

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/board/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/board')
    } catch {
      // ignore
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setIsSubmittingComment(true)
    try {
      const res = await fetch(`/api/board/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      })
      if (res.ok) {
        const newComment = await res.json()
        setPost((prev) =>
          prev ? { ...prev, comments: [...prev.comments, newComment] } : prev
        )
        setCommentText('')
      }
    } catch {
      // ignore
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/board/${id}/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPost((prev) =>
          prev
            ? { ...prev, comments: prev.comments.filter((c) => c.id !== commentId) }
            : prev
        )
      }
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center text-sm text-gray-400">
        로딩 중...
      </div>
    )
  }

  if (!post) return null

  const canDeleteComment = (comment: Comment) =>
    isStaff || comment.author.id === session?.user?.id

  const imageAttachments = post.attachments.filter((a) => a.fileType.startsWith('image/'))
  const fileAttachments = post.attachments.filter((a) => !a.fileType.startsWith('image/'))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 뒤로가기 */}
      <div className="flex items-center gap-3">
        <Link
          href="/board"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-sm text-gray-500">게시판 목록</span>
      </div>

      {/* 본문 카드 */}
      <article className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 타이틀 영역 */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 break-words">{post.title}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{post.author.name}</span>
                <span>·</span>
                <span>
                  {format(new Date(post.createdAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
                </span>
                {post.updatedAt !== post.createdAt && (
                  <>
                    <span>·</span>
                    <span className="text-gray-300">
                      수정됨 {format(new Date(post.updatedAt), 'yyyy.MM.dd', { locale: ko })}
                    </span>
                  </>
                )}
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />
                  {post.viewCount}
                </span>
              </div>
            </div>
            {/* 관리 버튼 */}
            {(isAuthor || isStaff) && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/board/${post.id}/edit`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  수정
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 py-6 min-h-[120px]">
          {post.content ? (
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">내용이 없습니다.</p>
          )}
        </div>

        {/* 이미지 첨부파일 (본문 하단 인라인 표시) */}
        {imageAttachments.length > 0 && (
          <div className="px-6 pb-4 space-y-3">
            {imageAttachments.map((att) => (
              <div key={att.id}>
                <img
                  src={att.filePath}
                  alt={att.fileName}
                  className="max-w-full rounded-lg border border-gray-200"
                />
              </div>
            ))}
          </div>
        )}

        {/* 파일 첨부파일 */}
        {fileAttachments.length > 0 && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600">
              <Paperclip className="w-4 h-4" />
              첨부파일 {fileAttachments.length}개
            </div>
            <div className="space-y-2">
              {fileAttachments.map((att) => (
                <a
                  key={att.id}
                  href={att.filePath}
                  download={att.fileName}
                  className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{att.fileName}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(att.fileSize)}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* 댓글 섹션 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            댓글 {post.comments.length}개
          </span>
        </div>

        {/* 댓글 목록 */}
        {post.comments.length > 0 ? (
          <ul className="divide-y divide-gray-50">
            {post.comments.map((comment) => (
              <li key={comment.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {comment.author.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(comment.createdAt), 'yyyy.MM.dd HH:mm', {
                          locale: ko,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                  {canDeleteComment(comment) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="댓글 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">첫 댓글을 남겨보세요.</p>
        )}

        {/* 댓글 입력 */}
        {session?.user && (
          <form
            onSubmit={handleAddComment}
            className="px-5 py-4 border-t border-gray-100 flex items-end gap-3"
          >
            <textarea
              ref={commentRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddComment(e as unknown as React.FormEvent)
                }
              }}
              rows={2}
              placeholder="댓글을 입력하세요 (Enter: 전송, Shift+Enter: 줄바꿈)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !commentText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
              전송
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
