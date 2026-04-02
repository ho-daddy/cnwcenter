'use client'

import { useState, useEffect, useCallback } from 'react'
import { Scale, Search, Sparkles, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

const API_BASE = 'https://hodaddy-b650m-gaming-wifi.tail2460a3.ts.net/law'

interface ArticleResult {
  rank?: number
  law_name?: string
  article_num?: string
  title?: string
  chapter?: string
  type?: string
  text?: string
  score?: number
  enforcement_date?: string
}

interface SearchResponse {
  query?: string
  results?: ArticleResult[]
  total?: number
  search_time_ms?: number
}

interface AskResponse {
  question?: string
  answer?: string
  sources?: ArticleResult[]
  search_time_ms?: number
  generate_time_ms?: number
}

export default function LawSearchPage() {
  const [query, setQuery] = useState('')
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'search' | 'ask' | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [askResult, setAskResult] = useState<AskResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSources, setExpandedSources] = useState(false)

  // Health check every 5 seconds
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET' })
      setIsOnline(res.ok)
    } catch {
      setIsOnline(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 5000)
    return () => clearInterval(interval)
  }, [checkHealth])

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setMode('search')
    setError(null)
    setSearchResults(null)
    setAskResult(null)
    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), top_k: 5, type_filter: 'article' }),
      })
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
      const data: SearchResponse = await res.json()
      setSearchResults(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '검색 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAsk = async () => {
    if (!query.trim()) return
    setLoading(true)
    setMode('ask')
    setError(null)
    setSearchResults(null)
    setAskResult(null)
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query.trim(), top_k: 5 }),
      })
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
      const data: AskResponse = await res.json()
      setAskResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 질문 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Scale className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">법령 검색</h1>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-lg px-4 py-3 mb-6 text-sm font-medium ${
          isOnline === null
            ? 'bg-gray-100 text-gray-500'
            : isOnline
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
        }`}
      >
        {isOnline === null
          ? '연결 확인 중...'
          : isOnline
            ? '🟢 캐서린 팀장 출근중! 🐱 무엇이든 물어보세요~'
            : '🔴 캐서린 팀장이 퇴근했어요 😴 나중에 다시 찾아주세요~'}
      </div>

      {/* Search Area */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="법령에 대해 궁금한 것을 물어보세요..."
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="w-4 h-4" />
            검색
          </button>
          <button
            onClick={handleAsk}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            AI에게 질문
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-500">
            {mode === 'ask' ? 'AI가 답변을 생성하고 있습니다...' : '검색 중...'}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Search Results */}
      {mode === 'search' && searchResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              검색 결과 ({searchResults.results?.length ?? 0}건)
            </h2>
            {searchResults.search_time_ms != null && (
              <span className="text-xs text-gray-400">
                검색 시간: {searchResults.search_time_ms}ms
              </span>
            )}
          </div>
          {searchResults.results?.map((item, i) => (
            <ArticleCard key={i} item={item} />
          ))}
          {searchResults.results?.length === 0 && (
            <p className="text-gray-500 text-center py-8">검색 결과가 없습니다.</p>
          )}
        </div>
      )}

      {/* AI Answer */}
      {mode === 'ask' && askResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">AI 답변</h2>
            {(askResult.search_time_ms != null || askResult.generate_time_ms != null) && (
              <span className="text-xs text-gray-400">
                검색 {askResult.search_time_ms ?? 0}ms / 생성 {((askResult.generate_time_ms ?? 0) / 1000).toFixed(1)}초
              </span>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {askResult.answer}
            </p>
          </div>

          {/* Sources */}
          {askResult.sources && askResult.sources.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSources(!expandedSources)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
              >
                {expandedSources ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                참조 조문 ({askResult.sources.length}건)
              </button>
              {expandedSources && (
                <div className="p-4 space-y-3 bg-white">
                  {askResult.sources.map((item, i) => (
                    <ArticleCard key={i} item={item} compact />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-10 text-center text-xs text-gray-400">
        ※ 이 서비스는 법령 정보 제공 목적이며, 법률 자문이 아닙니다. 구체적인 사안은 전문가와 상담하시기 바랍니다.
      </p>
    </div>
  )
}

function ArticleCard({ item, compact }: { item: ArticleResult; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const textPreviewLen = compact ? 150 : 300
  const fullText = item.text ?? ''
  const needsTruncate = fullText.length > textPreviewLen
  const displayText = expanded || !needsTruncate ? fullText : fullText.slice(0, textPreviewLen) + '...'

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg ${compact ? 'p-3' : 'p-5 shadow-sm'} hover:border-blue-300 transition-colors`}
    >
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span className="text-sm font-semibold text-blue-700">{item.law_name}</span>
        {item.article_num && (
          <span className="text-sm font-medium text-gray-700">{item.article_num}</span>
        )}
        {item.chapter && (
          <span className="text-xs text-gray-400">({item.chapter})</span>
        )}
      </div>
      {item.title && (
        <h3 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'} mb-2`}>
          {item.title}
        </h3>
      )}
      {fullText && (
        <div>
          <p className={`text-gray-600 whitespace-pre-wrap leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
            {displayText}
          </p>
          {needsTruncate && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-blue-500 hover:text-blue-700"
            >
              {expanded ? '접기' : '전체 보기'}
            </button>
          )}
        </div>
      )}
      {item.score != null && (
        <div className="mt-2 text-xs text-gray-400">
          유사도: {(item.score * 100).toFixed(1)}%
        </div>
      )}
    </div>
  )
}
