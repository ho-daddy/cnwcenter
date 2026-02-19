'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Bell, Pin, MessageSquare, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NoticeAuthor {
  id: string
  name: string | null
}

interface Notice {
  id: string
  title: string
  content: string | null
  isPinned: boolean
  createdAt: string
  author: NoticeAuthor
  _count: { comments: number }
}

const PAGE_SIZE = 20

export default function NoticesPage() {
  const { data: session } = useSession()
  const [notices, setNotices] = useState<Notice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const canWrite =
    session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'STAFF'

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchNotices = async (p: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/notices?page=${p}&limit=${PAGE_SIZE}`)
      if (res.ok) {
        const data = await res.json()
        setNotices(data.notices)
        setTotal(data.total)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotices(page)
  }, [page])

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Bell className="w-6 h-6 text-blue-600" />
          공지사항
        </h1>
        {canWrite && (
          <Link
            href="/notices/new"
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            공지 작성
          </Link>
        )}
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>제목</span>
          <span className="text-center w-16">댓글</span>
          <span className="text-right w-28">작성일</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">로딩 중...</div>
        ) : notices.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">등록된 공지사항이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/notices/${notice.id}`}
                  className={cn(
                    'grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-4 hover:bg-blue-50 transition-colors items-center',
                    notice.isPinned && 'bg-amber-50 hover:bg-amber-100'
                  )}
                >
                  {/* 제목 */}
                  <div className="flex items-center gap-2 min-w-0">
                    {notice.isPinned && (
                      <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {notice.title}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{notice.author.name}</span>
                  </div>

                  {/* 댓글 수 */}
                  <div className="flex items-center justify-center gap-1 w-16 text-xs text-gray-400">
                    {notice._count.comments > 0 && (
                      <>
                        <MessageSquare className="w-3.5 h-3.5" />
                        {notice._count.comments}
                      </>
                    )}
                  </div>

                  {/* 작성일 */}
                  <div className="text-xs text-gray-400 text-right w-28">
                    {format(new Date(notice.createdAt), 'yyyy.MM.dd', { locale: ko })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                'w-8 h-8 rounded text-sm font-medium transition-colors',
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
