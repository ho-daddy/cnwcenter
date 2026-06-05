'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Send, BookOpen, ChevronDown } from 'lucide-react'

interface DiaryEntry {
  id: string
  authorName: string
  authorType: 'AI' | 'HUMAN'
  content: string
  entryDate: string
  createdAt: string
}

const AUTHOR_COLORS: Record<string, string> = {
  '캣': 'bg-purple-100 border-purple-300 text-purple-900',
  '사라': 'bg-sky-100 border-sky-300 text-sky-900',
}

function authorStyle(name: string) {
  return AUTHOR_COLORS[name] ?? 'bg-emerald-100 border-emerald-300 text-emerald-900'
}

function authorEmoji(name: string, type: 'AI' | 'HUMAN') {
  if (name === '캣') return '🐱'
  if (name === '사라') return '🤖'
  return type === 'AI' ? '🤖' : '✍️'
}

const PAGE_SIZE = 30  // 하루 최대 3개 기준 약 10일치

export default function DiaryPage() {
  const { data: session } = useSession()
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [content, setContent] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.user?.name) setAuthorName(session.user.name)
  }, [session])

  const fetchEntries = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setIsLoading(true)
    else setIsLoadingMore(true)
    try {
      const res = await fetch(`/api/diary?page=${pageNum}&limit=${PAGE_SIZE}`)
      const data = await res.json()
      const fetched: DiaryEntry[] = data.entries ?? []
      setEntries(prev => append ? [...prev, ...fetched] : fetched)
      setHasMore(data.total > pageNum * PAGE_SIZE)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  useEffect(() => { fetchEntries(1, false) }, [fetchEntries])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchEntries(next, true)
  }

  const grouped = entries.reduce<Record<string, DiaryEntry[]>>((acc, e) => {
    const day = format(parseISO(e.entryDate), 'yyyy-MM-dd')
    ;(acc[day] ??= []).push(e)
    return acc
  }, {})

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const handleSubmit = async () => {
    if (!content.trim() || !authorName.trim()) return
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: authorName.trim(),
          content: content.trim(),
          entryDate: new Date().toISOString(),
          authorType: 'HUMAN',
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? '오류가 발생했습니다.')
        return
      }
      setContent('')
      setPage(1)
      await fetchEntries(1, false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <BookOpen className="w-6 h-6 text-purple-500" />
        <h1 className="text-2xl font-semibold text-gray-800">교환일기</h1>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-20">불러오는 중...</div>
      ) : sortedDays.length === 0 ? (
        <div className="text-center text-gray-400 py-20">아직 아무도 쓰지 않았어요. 첫 번째 일기를 써보세요 ✍️</div>
      ) : (
        <>
          <div className="space-y-10">
            {sortedDays.map((day) => (
              <div key={day}>
                <div className="text-sm font-medium text-gray-400 mb-4">
                  {format(parseISO(day), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                </div>
                <div className="space-y-4">
                  {grouped[day].map((e) => (
                    <div
                      key={e.id}
                      className={`rounded-xl border p-5 whitespace-pre-wrap leading-relaxed text-sm ${authorStyle(e.authorName)}`}
                    >
                      <div className="flex items-center gap-1.5 mb-3 font-semibold">
                        <span>{authorEmoji(e.authorName, e.authorType)}</span>
                        <span>{e.authorName}</span>
                      </div>
                      {e.content}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
                {isLoadingMore ? '불러오는 중...' : '더 보기'}
              </button>
            </div>
          )}
        </>
      )}

      {/* 작성 폼 */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-sm font-medium text-gray-500 mb-4">오늘의 일기 쓰기</h2>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
          placeholder="이름"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={20}
        />
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          placeholder="오늘 하루 어떠셨나요?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim() || !authorName.trim()}
          className="mt-3 flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? '저장 중...' : '일기 쓰기'}
        </button>
      </div>
    </div>
  )
}
