'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  MessageCircle,
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Paperclip,
} from 'lucide-react'

interface PostAuthor {
  id: string
  name: string | null
}

interface Post {
  id: string
  title: string
  viewCount: number
  createdAt: string
  author: PostAuthor
  _count: { comments: number; attachments: number }
}

const PAGE_SIZE = 20

export default function BoardPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchPosts = async (p: number, q: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (q) params.set('search', q)
      const res = await fetch(`/api/board?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts)
        setTotal(data.total)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts(page, search)
  }, [page, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <MessageCircle className="w-6 h-6 text-emerald-600" />
          사용자 게시판
        </h1>
        {session?.user && (
          <Link
            href="/board/new"
            className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            글쓰기
          </Link>
        )}
      </div>

      {/* 안내문구 */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
        saeum.space 사용자들을 위한 게시판입니다. 사용하시면서 발생하는 문제나 문의사항, 개선할 점이나 건의사항을 올려주시면 최대한 빠르게 조치하도록 하겠습니다.
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목 또는 내용으로 검색"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          검색
        </button>
      </form>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>제목</span>
          <span className="text-center w-14">댓글</span>
          <span className="text-center w-14">조회</span>
          <span className="text-right w-28">작성일</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {search ? '검색 결과가 없습니다.' : '등록된 게시글이 없습니다.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/board/${post.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 hover:bg-emerald-50 transition-colors items-center"
                >
                  {/* 제목 */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {post.title}
                    </span>
                    {post._count.attachments > 0 && (
                      <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                    <span className="text-xs text-gray-400 shrink-0">{post.author.name}</span>
                  </div>

                  {/* 댓글 수 */}
                  <div className="flex items-center justify-center gap-1 w-14 text-xs text-gray-400">
                    {post._count.comments > 0 && (
                      <>
                        <MessageSquare className="w-3.5 h-3.5" />
                        {post._count.comments}
                      </>
                    )}
                  </div>

                  {/* 조회수 */}
                  <div className="flex items-center justify-center gap-1 w-14 text-xs text-gray-400">
                    <Eye className="w-3.5 h-3.5" />
                    {post.viewCount}
                  </div>

                  {/* 작성일 */}
                  <div className="text-xs text-gray-400 text-right w-28">
                    {format(new Date(post.createdAt), 'yyyy.MM.dd', { locale: ko })}
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
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
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
