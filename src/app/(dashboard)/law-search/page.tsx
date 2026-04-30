'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Scale, Search, Loader2, ChevronDown, ChevronRight, Gavel, MessageSquare, Paperclip, Bot, ToggleLeft, ToggleRight, Landmark, History, X, GitBranch, ArrowLeftRight } from 'lucide-react'

const API_BASE = '/api/law'

type TabType = 'search' | 'precedents' | 'interpretations' | 'annexes' | 'nlrc' | 'system' | 'amendment' | 'ask'

interface HistoryItem {
  query: string
  tab: TabType
  timestamp: number
}

const HISTORY_KEY = 'law-search-history'
const MAX_HISTORY = 20

interface SearchResult {
  source?: string
  law_name?: string
  data: string
}

interface SearchResponse {
  query?: string
  preset?: string
  results?: SearchResult[]
  search_time_ms?: number
}

interface AskSource {
  type: 'law' | 'precedent' | 'interpretation'
  title: string
  text?: string
  detail?: string
}

interface AskResponse {
  question?: string
  answer?: string
  sources?: AskSource[]
  search_time_ms?: number
  generate_time_ms?: number
}

interface TextResult {
  result: string
}

// --- CLI text parsers ---

interface ParsedLawItem {
  id: string
  title: string
  fields: { label: string; value: string }[]
  rawText?: string
}

function parseLawSearchResults(results: SearchResult[]): ParsedLawItem[] {
  return results.map((r, idx) => {
    const lines = r.data.split('\n')
    const title = r.law_name || r.source || `결과 ${idx + 1}`
    const fields: { label: string; value: string }[] = []
    const textLines: string[] = []

    for (const line of lines) {
      const fieldMatch = line.match(/^\s*-\s*(.+?):\s*(.+)$/)
      if (fieldMatch) {
        fields.push({ label: fieldMatch[1].trim(), value: fieldMatch[2].trim() })
      } else if (line.trim()) {
        textLines.push(line)
      }
    }

    return {
      id: `law-${idx}`,
      title,
      fields,
      rawText: textLines.length > 0 ? textLines.join('\n') : undefined,
    }
  })
}

interface ParsedPrecedentItem {
  id: string
  caseId?: string
  court?: string
  date?: string
  title: string
  rawId?: string
  rawText: string
}

function parsePrecedentsText(text: string): ParsedPrecedentItem[] {
  const items: ParsedPrecedentItem[] = []
  // Split by item pattern: [id] title or numbered items
  const blocks = text.split(/\n(?=\[[\d]+\]|\d+\.\s)/).filter(b => b.trim())

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim()
    if (!block) continue

    const headerMatch = block.match(/^\[(\d+)\]\s*(.+?)(?:\n|$)/)
    const numberedMatch = !headerMatch ? block.match(/^(\d+)\.\s*(.+?)(?:\n|$)/) : null

    if (headerMatch || numberedMatch) {
      const rawId = headerMatch ? headerMatch[1] : numberedMatch![1]
      const titleLine = headerMatch ? headerMatch[2] : numberedMatch![2]
      const rest = block.slice(block.indexOf('\n') + 1)

      const caseMatch = rest.match(/사건번호:\s*(.+)/)
      const courtMatch = rest.match(/법원:\s*(.+)/)
      const dateMatch = rest.match(/선고일:\s*(.+)/)

      items.push({
        id: `prec-${rawId}-${i}`,
        rawId,
        title: titleLine.trim(),
        caseId: caseMatch?.[1]?.trim(),
        court: courtMatch?.[1]?.trim(),
        date: dateMatch?.[1]?.trim(),
        rawText: rest.trim(),
      })
    } else if (block.length > 20) {
      // Fallback: treat as a single block if it doesn't match patterns
      items.push({
        id: `prec-fallback-${i}`,
        title: block.slice(0, 80) + (block.length > 80 ? '...' : ''),
        rawText: block,
      })
    }
  }

  return items
}

// --- Tab config ---

const TABS: { key: TabType; label: string; icon: React.ReactNode; color: string; activeColor: string; borderColor: string }[] = [
  { key: 'search', label: '검색', icon: <Search className="w-4 h-4" />, color: 'text-blue-600', activeColor: 'bg-blue-50 text-blue-700', borderColor: 'border-blue-600' },
  { key: 'precedents', label: '판례', icon: <Gavel className="w-4 h-4" />, color: 'text-amber-600', activeColor: 'bg-amber-50 text-amber-700', borderColor: 'border-amber-600' },
  { key: 'interpretations', label: '해석례', icon: <MessageSquare className="w-4 h-4" />, color: 'text-emerald-600', activeColor: 'bg-emerald-50 text-emerald-700', borderColor: 'border-emerald-600' },
  { key: 'annexes', label: '별표/서식', icon: <Paperclip className="w-4 h-4" />, color: 'text-purple-600', activeColor: 'bg-purple-50 text-purple-700', borderColor: 'border-purple-600' },
  { key: 'nlrc', label: '노동위', icon: <Landmark className="w-4 h-4" />, color: 'text-rose-600', activeColor: 'bg-rose-50 text-rose-700', borderColor: 'border-rose-600' },
  { key: 'system', label: '체계도', icon: <GitBranch className="w-4 h-4" />, color: 'text-cyan-600', activeColor: 'bg-cyan-50 text-cyan-700', borderColor: 'border-cyan-600' },
  { key: 'amendment', label: '개정추적', icon: <ArrowLeftRight className="w-4 h-4" />, color: 'text-orange-600', activeColor: 'bg-orange-50 text-orange-700', borderColor: 'border-orange-600' },
  { key: 'ask', label: 'AI에게 질문', icon: <Bot className="w-4 h-4" />, color: 'text-violet-600', activeColor: 'bg-violet-50 text-violet-700', borderColor: 'border-violet-600' },
]

export default function LawSearchPage() {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('search')
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oshOnly, setOshOnly] = useState(false)
  const [displayCount, setDisplayCount] = useState(10)

  // Results per tab
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [precedentsText, setPrecedentsText] = useState<string | null>(null)
  const [interpretationsText, setInterpretationsText] = useState<string | null>(null)
  const [annexesText, setAnnexesText] = useState<string | null>(null)
  const [nlrcText, setNlrcText] = useState<string | null>(null)
  const [systemText, setSystemText] = useState<string | null>(null)
  const [amendmentText, setAmendmentText] = useState<string | null>(null)
  const [askResult, setAskResult] = useState<AskResponse | null>(null)

  // Detail views
  const [precedentDetail, setPrecedentDetail] = useState<{ id: string; text: string } | null>(null)
  const [interpretationDetail, setInterpretationDetail] = useState<{ id: string; text: string } | null>(null)
  const [nlrcDetail, setNlrcDetail] = useState<{ id: string; text: string } | null>(null)

  // Search history
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [expandedSources, setExpandedSources] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [articlePopup, setArticlePopup] = useState<{
    lawName: string
    article: string
    content: string | null
    loading: boolean
  } | null>(null)
  const [annexPopup, setAnnexPopup] = useState<{
    lawName: string
    annexNo: number
    title: string | null
    content: string | null
    pdfUrl: string | null
    loading: boolean
    error: string | null
  } | null>(null)
  const mstCache = useRef<Record<string, string>>({})

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      if (saved) setSearchHistory(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const saveToHistory = useCallback((q: string, tab: TabType) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(h => !(h.query === q && h.tab === tab))
      const next = [{ query: q, tab, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setSearchHistory([])
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* ignore */ }
  }, [])

  // Health check every 10 seconds
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
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [checkHealth])

  const fetchAnnexPopup = useCallback(async (lawName: string, annexNo: number) => {
    setAnnexPopup({ lawName, annexNo, title: null, content: null, pdfUrl: null, loading: true, error: null })
    try {
      let mst = mstCache.current[lawName]
      if (!mst) {
        const res = await fetch(`${API_BASE}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: lawName }),
        })
        const data = await res.json()
        for (const r of (data.results ?? []) as { source?: string; data: string }[]) {
          if (r.source === 'search_law') {
            const m = r.data.match(/MST:\s*(\d+)/)
            if (m) { mst = m[1]; break }
          }
        }
      }
      if (!mst) throw new Error('법령을 찾을 수 없습니다')
      mstCache.current[lawName] = mst

      const res = await fetch(`${API_BASE}/annex-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mst, annex_no: String(annexNo) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `별표 조회 실패 (${res.status})`)
      }
      const data = await res.json()
      setAnnexPopup(prev => prev ? {
        ...prev,
        title: data.title,
        content: data.content,
        pdfUrl: data.pdf_url,
        loading: false,
      } : null)
    } catch (e) {
      setAnnexPopup(prev => prev ? {
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : '알 수 없는 오류',
      } : null)
    }
  }, [])

  const fetchArticlePopup = useCallback(async (lawName: string, articleNo: number, articleLabel: string, subNo: number = 0) => {
    setArticlePopup({ lawName, article: articleLabel, content: null, loading: true })
    try {
      let mst = mstCache.current[lawName]
      if (!mst) {
        const res = await fetch(`${API_BASE}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: lawName }),
        })
        const data = await res.json()
        for (const r of (data.results ?? []) as { source?: string; data: string }[]) {
          if (r.source === 'search_law') {
            const m = r.data.match(/MST:\s*(\d+)/)
            if (m) { mst = m[1]; break }
          }
        }
      }
      if (!mst) throw new Error('법령을 찾을 수 없습니다')
      mstCache.current[lawName] = mst

      // 법제처 jo 형식: 6자리 (앞 4자리=조번호, 뒤 2자리=가지조번호)
      const jo = String(articleNo).padStart(4, '0') + String(subNo).padStart(2, '0')
      const artRes = await fetch(`${API_BASE}/article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mst, jo }),
      })
      const artData = await artRes.json()
      setArticlePopup(prev => prev ? { ...prev, content: artData.result, loading: false } : null)
    } catch (e) {
      setArticlePopup(prev => prev ? {
        ...prev,
        content: `조문을 불러오지 못했습니다.\n${e instanceof Error ? e.message : '알 수 없는 오류'}`,
        loading: false,
      } : null)
    }
  }, [])

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'search': return '법령에 대해 검색하세요... (예: 산업안전보건법 안전관리자)'
      case 'precedents': return '판례를 검색하세요... (예: 산업재해 사업주 책임)'
      case 'interpretations': return '해석례를 검색하세요... (예: 안전보건관리체제)'
      case 'annexes': return '법령명 + 별표번호 (예: 산업안전보건법 시행령 별표1)'
      case 'nlrc': return '노동위원회 결정례를 검색하세요... (예: 부당해고 원직복직)'
      case 'system': return '법령 체계도를 조회할 법령명 (예: 산업안전보건법)'
      case 'amendment': return '개정 이력을 추적할 법령명 (예: 산업안전보건법)'
      case 'ask': return 'AI에게 법령에 대해 질문하세요... (예: 50인 미만 사업장에서 선임해야 하는 안전보건 담당자는?)'
    }
  }

  const handleSubmit = async () => {
    if (!query.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      switch (activeTab) {
        case 'search': {
          setSearchResults(null)
          const res = await fetch(`${API_BASE}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: query.trim(),
              preset: oshOnly ? 'osh' : null,
              display: displayCount,
            }),
          })
          if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
          const data: SearchResponse = await res.json()
          setSearchResults(data)
          break
        }
        case 'precedents': {
          setPrecedentsText(null)
          setPrecedentDetail(null)
          const res = await fetch(`${API_BASE}/precedents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query.trim(), display: displayCount }),
          })
          if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
          const data: TextResult = await res.json()
          setPrecedentsText(data.result)
          break
        }
        case 'interpretations': {
          setInterpretationsText(null)
          setInterpretationDetail(null)
          const res = await fetch(`${API_BASE}/interpretations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query.trim(), display: displayCount }),
          })
          if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
          const data: TextResult = await res.json()
          setInterpretationsText(data.result)
          break
        }
        case 'annexes': {
          setAnnexesText(null)
          const res = await fetch(`${API_BASE}/annexes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ law_name: query.trim() }),
          })
          if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
          const data: TextResult = await res.json()
          setAnnexesText(data.result)
          break
        }
        case 'nlrc': {
          setNlrcText(null)
          setNlrcDetail(null)
          const res = await fetch(`${API_BASE}/nlrc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query.trim(), display: displayCount }),
          })
          if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
          const data: TextResult = await res.json()
          setNlrcText(data.result)
          break
        }
        case 'system': {
          setSystemText(null)
          const res = await fetch(`${API_BASE}/system`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ law_name: query.trim() }),
          })
          if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
          const data: TextResult = await res.json()
          setSystemText(data.result)
          break
        }
        case 'amendment': {
          setAmendmentText(null)
          const res = await fetch(`${API_BASE}/amendment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query.trim() }),
          })
          if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
          const data: TextResult = await res.json()
          setAmendmentText(data.result)
          break
        }
        case 'ask': {
          setAskResult(null)
          const res = await fetch(`${API_BASE}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: query.trim(),
              preset: oshOnly ? 'osh' : null,
            }),
          })
          if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
          const data: AskResponse = await res.json()
          setAskResult(data)
          break
        }
      }
      saveToHistory(query.trim(), activeTab)
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadNlrcDetail = async (id: string) => {
    if (nlrcDetail?.id === id) {
      setNlrcDetail(null)
      return
    }
    setDetailLoading(true)
    try {
      const res = await fetch(`${API_BASE}/nlrc/detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
      const data: TextResult = await res.json()
      setNlrcDetail({ id, text: data.result })
    } catch {
      setError('노동위 결정례 전문을 불러오는데 실패했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }

  const loadPrecedentDetail = async (id: string) => {
    if (precedentDetail?.id === id) {
      setPrecedentDetail(null)
      return
    }
    setDetailLoading(true)
    try {
      const res = await fetch(`${API_BASE}/precedents/detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
      const data: TextResult = await res.json()
      setPrecedentDetail({ id, text: data.result })
    } catch {
      setError('판례 전문을 불러오는데 실패했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }

  const loadInterpretationDetail = async (id: string) => {
    if (interpretationDetail?.id === id) {
      setInterpretationDetail(null)
      return
    }
    setDetailLoading(true)
    try {
      const res = await fetch(`${API_BASE}/interpretations/detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
      const data: TextResult = await res.json()
      setInterpretationDetail({ id, text: data.result })
    } catch {
      setError('해석례 전문을 불러오는데 실패했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const currentTabConfig = TABS.find(t => t.key === activeTab)!

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Scale className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">법령 검색</h1>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-xl mb-6 overflow-hidden border ${
          isOnline === null
            ? 'bg-gray-50 border-gray-200'
            : isOnline
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
              : 'bg-gradient-to-r from-gray-50 to-slate-100 border-gray-200'
        }`}
      >
        {isOnline === null ? (
          <div className="flex items-center justify-center py-6 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            연결 확인 중...
          </div>
        ) : (
          <div className="flex items-center gap-5 p-5">
            <div className="relative flex-shrink-0">
              <Image
                src={isOnline ? '/images/catherine-working.png' : '/images/catherine-away.png'}
                alt={isOnline ? '캐서린팀장 출근중' : '캐서린팀장 자리비움'}
                width={120}
                height={120}
                className="rounded-xl object-cover shadow-md"
              />
              <span
                className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isOnline
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  {isOnline ? '출근중' : '자리비움'}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${isOnline ? 'text-gray-700' : 'text-gray-500'}`}>
                {isOnline ? (
                  <>
                    <strong className="text-green-700">캐서린팀장</strong>이 출근중입니다.{' '}
                    법령 검색, 판례, 해석례, 별표/서식, 노동위 결정례, 체계도, 개정추적, AI 질문을 이용하실 수 있습니다.
                  </>
                ) : (
                  <>
                    <strong className="text-gray-600">캐서린팀장</strong>이 자리를 비운 상태입니다.{' '}
                    아쉽게도 법령검색시스템은 캐서린팀장 출근중에만 작동합니다.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-0 rounded-b-none border-b-0">
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            className={`flex items-center gap-2 px-5 py-3 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap ${
              activeTab === 'search' ? 'bg-blue-600 hover:bg-blue-700' :
              activeTab === 'precedents' ? 'bg-amber-600 hover:bg-amber-700' :
              activeTab === 'interpretations' ? 'bg-emerald-600 hover:bg-emerald-700' :
              activeTab === 'annexes' ? 'bg-purple-600 hover:bg-purple-700' :
              activeTab === 'nlrc' ? 'bg-rose-600 hover:bg-rose-700' :
              activeTab === 'system' ? 'bg-cyan-600 hover:bg-cyan-700' :
              activeTab === 'amendment' ? 'bg-orange-600 hover:bg-orange-700' :
              'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : currentTabConfig.icon}
            {activeTab === 'ask' ? '질문하기' : '검색'}
          </button>
        </div>
        {/* OSH Toggle + Display Count - not shown for annexes */}
        <div className="flex items-center gap-4 mt-3">
          {activeTab !== 'annexes' && (
            <button
              onClick={() => setOshOnly(!oshOnly)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                oshOnly ? 'text-blue-700' : 'text-gray-400'
              }`}
            >
              {oshOnly ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              산업안전보건 법령만
            </button>
          )}
          {(activeTab === 'search' || activeTab === 'precedents' || activeTab === 'interpretations' || activeTab === 'nlrc') && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 ml-auto">
              <span>결과 수:</span>
              {[5, 10, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setDisplayCount(n)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    displayCount === n
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                최근 검색 ({searchHistory.length})
                {showHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {showHistory && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  전체 삭제
                </button>
              )}
            </div>
            {showHistory && (
              <div className="flex flex-wrap gap-1.5">
                {searchHistory.map((h, i) => {
                  const tabConfig = TABS.find(t => t.key === h.tab)
                  return (
                    <button
                      key={`${h.query}-${h.tab}-${i}`}
                      onClick={() => {
                        setQuery(h.query)
                        setActiveTab(h.tab)
                      }}
                      className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors"
                    >
                      {tabConfig && <span className={`${tabConfig.color} opacity-70`}>{tabConfig.icon}</span>}
                      <span className="max-w-[150px] truncate">{h.query}</span>
                      <X
                        className="w-3 h-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSearchHistory(prev => {
                            const next = prev.filter((_, idx) => idx !== i)
                            try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* ignore */ }
                            return next
                          })
                        }}
                      />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-b-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? `${tab.activeColor} ${tab.borderColor}`
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5 min-h-[200px]">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-500">
                {activeTab === 'ask'
                  ? 'AI가 법령, 판례, 해석례를 종합하여 답변을 생성하고 있습니다...'
                  : '검색 중...'}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Tab 1: Law Search */}
          {!loading && activeTab === 'search' && (
            <>
              {searchResults ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-semibold text-gray-900">
                      검색 결과 ({searchResults.results?.length ?? 0}건)
                    </h2>
                    {searchResults.search_time_ms != null && (
                      <span className="text-xs text-gray-400">
                        {searchResults.search_time_ms}ms
                      </span>
                    )}
                  </div>
                  {searchResults.results && searchResults.results.length > 0 ? (
                    parseLawSearchResults(searchResults.results).map(item => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                        onClick={() => toggleCard(item.id)}
                      >
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="font-medium text-blue-700 text-sm">{item.title}</span>
                          <div className="flex items-center gap-2">
                            {item.fields.slice(0, 2).map((f, i) => (
                              <span key={i} className="text-xs text-gray-400">{f.label}: {f.value}</span>
                            ))}
                            {expandedCards.has(item.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {expandedCards.has(item.id) && (
                          <div className="px-4 pb-3 border-t border-gray-100">
                            {item.fields.length > 0 && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-xs text-gray-500">
                                {item.fields.map((f, i) => (
                                  <span key={i}><span className="font-medium text-gray-600">{f.label}:</span> {f.value}</span>
                                ))}
                              </div>
                            )}
                            {item.rawText && (
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-2 bg-gray-50 rounded p-3">
                                {item.rawText}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">검색 결과가 없습니다.</p>
                  )}
                </div>
              ) : (
                <EmptyState icon={<Search className="w-8 h-8 text-blue-300" />} message="법령을 검색하세요" />
              )}
            </>
          )}

          {/* Tab 2: Precedents */}
          {!loading && activeTab === 'precedents' && (
            <>
              {precedentsText ? (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold text-gray-900 mb-2">판례 검색 결과</h2>
                  {(() => {
                    const items = parsePrecedentsText(precedentsText)
                    if (items.length === 0) {
                      return (
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-4">
                          {precedentsText}
                        </pre>
                      )
                    }
                    return items.map(item => (
                      <div key={item.id} className="border border-gray-200 rounded-lg hover:border-amber-300 transition-colors">
                        <div
                          className="flex items-start justify-between px-4 py-3 cursor-pointer"
                          onClick={() => {
                            if (item.rawId) loadPrecedentDetail(item.rawId)
                            else toggleCard(item.id)
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-amber-700 text-sm truncate">{item.title}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                              {item.caseId && <span>사건번호: {item.caseId}</span>}
                              {item.court && <span>법원: {item.court}</span>}
                              {item.date && <span>선고일: {item.date}</span>}
                            </div>
                          </div>
                          <div className="flex items-center ml-2">
                            {detailLoading && precedentDetail?.id !== item.rawId ? null : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {precedentDetail && precedentDetail.id === item.rawId && (
                          <div className="px-4 pb-3 border-t border-gray-100">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-2 bg-amber-50 rounded p-3 max-h-96 overflow-y-auto">
                              {precedentDetail.text}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              ) : (
                <EmptyState icon={<Gavel className="w-8 h-8 text-amber-300" />} message="판례를 검색하세요" />
              )}
            </>
          )}

          {/* Tab 3: Interpretations */}
          {!loading && activeTab === 'interpretations' && (
            <>
              {interpretationsText ? (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold text-gray-900 mb-2">해석례 검색 결과</h2>
                  {(() => {
                    const items = parsePrecedentsText(interpretationsText)
                    if (items.length === 0) {
                      return (
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-4">
                          {interpretationsText}
                        </pre>
                      )
                    }
                    return items.map(item => (
                      <div key={item.id} className="border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors">
                        <div
                          className="flex items-start justify-between px-4 py-3 cursor-pointer"
                          onClick={() => {
                            if (item.rawId) loadInterpretationDetail(item.rawId)
                            else toggleCard(item.id)
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-emerald-700 text-sm truncate">{item.title}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                              {item.caseId && <span>{item.caseId}</span>}
                              {item.date && <span>{item.date}</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                        {interpretationDetail && interpretationDetail.id === item.rawId && (
                          <div className="px-4 pb-3 border-t border-gray-100">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-2 bg-emerald-50 rounded p-3 max-h-96 overflow-y-auto">
                              {interpretationDetail.text}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              ) : (
                <EmptyState icon={<MessageSquare className="w-8 h-8 text-emerald-300" />} message="해석례를 검색하세요" />
              )}
            </>
          )}

          {/* Tab 4: Annexes */}
          {!loading && activeTab === 'annexes' && (
            <>
              {annexesText ? (
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-3">별표/서식 조회 결과</h2>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-purple-50 rounded-lg p-4 max-h-[600px] overflow-y-auto border border-purple-100">
                    {annexesText}
                  </pre>
                </div>
              ) : (
                <EmptyState icon={<Paperclip className="w-8 h-8 text-purple-300" />} message="법령명과 별표번호를 입력하세요" sub="예: 산업안전보건법 시행령 별표1" />
              )}
            </>
          )}

          {/* Tab 5: NLRC (노동위 결정례) */}
          {!loading && activeTab === 'nlrc' && (
            <>
              {nlrcText ? (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold text-gray-900 mb-2">노동위원회 결정례 검색 결과</h2>
                  {(() => {
                    const items = parsePrecedentsText(nlrcText)
                    if (items.length === 0) {
                      return (
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-4">
                          {nlrcText}
                        </pre>
                      )
                    }
                    return items.map(item => (
                      <div key={item.id} className="border border-gray-200 rounded-lg hover:border-rose-300 transition-colors">
                        <div
                          className="flex items-start justify-between px-4 py-3 cursor-pointer"
                          onClick={() => {
                            if (item.rawId) loadNlrcDetail(item.rawId)
                            else toggleCard(item.id)
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-rose-700 text-sm truncate">{item.title}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                              {item.caseId && <span>사건번호: {item.caseId}</span>}
                              {item.court && <span>{item.court}</span>}
                              {item.date && <span>{item.date}</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                        {nlrcDetail && nlrcDetail.id === item.rawId && (
                          <div className="px-4 pb-3 border-t border-gray-100">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-2 bg-rose-50 rounded p-3 max-h-96 overflow-y-auto">
                              {nlrcDetail.text}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              ) : (
                <EmptyState icon={<Landmark className="w-8 h-8 text-rose-300" />} message="노동위원회 결정례를 검색하세요" sub="부당해고, 부당노동행위 등 노동위 결정례 검색" />
              )}
            </>
          )}

          {/* Tab 6: Law System (체계도) */}
          {!loading && activeTab === 'system' && (
            <>
              {systemText ? (
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-3">법령 체계도</h2>
                  <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-5 max-h-[600px] overflow-y-auto">
                    {systemText.split('\n').map((line, i) => {
                      const indent = line.search(/\S/)
                      const level = Math.floor(Math.max(0, indent) / 2)
                      const trimmed = line.trim()
                      if (!trimmed) return <div key={i} className="h-2" />

                      const isHeader = trimmed.startsWith('#') || trimmed.startsWith('=') || trimmed.startsWith('■') || trimmed.startsWith('●')
                      const isSub = trimmed.startsWith('-') || trimmed.startsWith('└') || trimmed.startsWith('├') || trimmed.startsWith('│')

                      return (
                        <div
                          key={i}
                          className={`py-0.5 ${isHeader ? 'font-bold text-cyan-800 text-sm mt-2' : isSub ? 'text-gray-600 text-xs' : 'text-gray-700 text-sm'}`}
                          style={{ paddingLeft: `${level * 20}px` }}
                        >
                          {isSub && <span className="text-cyan-400 mr-1">{trimmed.charAt(0)}</span>}
                          {isSub ? trimmed.slice(1).trim() : trimmed}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <EmptyState icon={<GitBranch className="w-8 h-8 text-cyan-300" />} message="법령 체계도를 조회하세요" sub="법령명을 입력하면 상위법-하위법 체계를 보여줍니다" />
              )}
            </>
          )}

          {/* Tab 7: Amendment Tracking (개정추적) */}
          {!loading && activeTab === 'amendment' && (
            <>
              {amendmentText ? (
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-3">개정 이력</h2>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {(() => {
                      const sections = amendmentText.split(/\n(?=#{1,3}\s|■|●|\d{4}[.-])/).filter(s => s.trim())
                      if (sections.length <= 1) {
                        return (
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-orange-50 rounded-lg p-4 border border-orange-100">
                            {amendmentText}
                          </pre>
                        )
                      }
                      return sections.map((section, i) => {
                        const lines = section.trim().split('\n')
                        const title = lines[0].replace(/^[#■●\s]+/, '').trim()
                        const body = lines.slice(1).join('\n').trim()
                        return (
                          <div key={i} className="border border-orange-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleCard(`amend-${i}`)}
                              className="w-full flex items-center gap-2 px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
                            >
                              <span className="text-orange-500 text-xs font-mono">{String(i + 1).padStart(2, '0')}</span>
                              <span className="text-sm font-medium text-orange-800 flex-1">{title}</span>
                              {expandedCards.has(`amend-${i}`) ? (
                                <ChevronDown className="w-4 h-4 text-orange-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-orange-400" />
                              )}
                            </button>
                            {expandedCards.has(`amend-${i}`) && body && (
                              <div className="px-4 pb-3 border-t border-orange-100 bg-white">
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-3">
                                  {body}
                                </pre>
                              </div>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              ) : (
                <EmptyState icon={<ArrowLeftRight className="w-8 h-8 text-orange-300" />} message="법령 개정 이력을 추적하세요" sub="법령명을 입력하면 개정 연혁과 변경사항을 보여줍니다" />
              )}
            </>
          )}

          {/* Tab 8: AI Ask */}
          {!loading && activeTab === 'ask' && (
            <>
              {askResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">AI 답변</h2>
                    <div className="flex gap-3 text-xs text-gray-400">
                      {askResult.search_time_ms != null && (
                        <span>검색 {askResult.search_time_ms}ms</span>
                      )}
                      {askResult.generate_time_ms != null && (
                        <span>생성 {(askResult.generate_time_ms / 1000).toFixed(1)}초</span>
                      )}
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="bg-violet-50 border border-violet-100 rounded-lg p-5">
                    <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                      {askResult.answer}
                    </div>
                  </div>

                  {/* References - 답변에 언급된 조항/별표 링크 */}
                  {(() => {
                    const refs = extractReferences(askResult.answer)
                    if (refs.length === 0) return null
                    return (
                      <div className="bg-white border border-violet-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Scale className="w-4 h-4 text-violet-600" />
                          <h3 className="text-sm font-semibold text-gray-800">관련 조항·별표 ({refs.length}건)</h3>
                        </div>
                        <ul className="space-y-1.5">
                          {refs.map((ref, i) => (
                            <li key={i} className="text-sm">
                              {ref.type === 'article' ? (
                                <button
                                  onClick={() => fetchArticlePopup(ref.lawName, ref.articleNo!, ref.label, ref.subNo)}
                                  className="text-violet-700 hover:text-violet-900 hover:underline transition-colors text-left"
                                >
                                  📖 {ref.lawName} {ref.label}
                                </button>
                              ) : (
                                <button
                                  onClick={() => fetchAnnexPopup(ref.lawName, ref.annexNo!)}
                                  className="text-violet-700 hover:text-violet-900 hover:underline transition-colors text-left"
                                >
                                  📋 {ref.lawName} 별표 {ref.annexNo}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })()}

                  {/* Sources */}
                  {askResult.sources && askResult.sources.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSources(!expandedSources)}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                      >
                        {expandedSources ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        관련 근거 ({askResult.sources.length}건)
                      </button>
                      {expandedSources && (
                        <div className="p-4 space-y-2 bg-white">
                          {askResult.sources.map((source, i) => {
                            const sourceId = `source-${i}`
                            const icon = source.type === 'law' ? '📖' : source.type === 'precedent' ? '⚖️' : '💬'
                            const typeLabel = source.type === 'law' ? '법령' : source.type === 'precedent' ? '판례' : '해석례'
                            return (
                              <div key={sourceId} className="border border-gray-100 rounded-lg">
                                <button
                                  onClick={() => toggleCard(sourceId)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                >
                                  <span>{icon}</span>
                                  <span className="text-xs text-gray-400 font-medium">[{typeLabel}]</span>
                                  <span className="text-sm text-gray-700 flex-1 truncate">{source.title}</span>
                                  {expandedCards.has(sourceId) ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                </button>
                                {expandedCards.has(sourceId) && (source.text || source.detail) && (
                                  <div className="px-3 pb-3 border-t border-gray-50">
                                    <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed mt-2 bg-gray-50 rounded p-2.5">
                                      {source.detail || source.text}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState icon={<Bot className="w-8 h-8 text-violet-300" />} message="AI에게 법령에 대해 질문하세요" sub="법령, 판례, 해석례를 종합하여 답변합니다" />
              )}
            </>
          )}

          {/* Detail Loading Overlay */}
          {detailLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
              <span className="text-sm text-gray-400">전문 불러오는 중...</span>
            </div>
          )}
        </div>
      </div>

      {/* Article Popup */}
      {articlePopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setArticlePopup(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-violet-600 font-medium">{articlePopup.lawName}</p>
                <h3 className="text-base font-semibold text-gray-900">{articlePopup.article}</h3>
              </div>
              <button
                onClick={() => setArticlePopup(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {articlePopup.loading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">조문 불러오는 중...</span>
                </div>
              ) : (
                <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {articlePopup.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Annex Popup */}
      {annexPopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setAnnexPopup(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-violet-600 font-medium">{annexPopup.lawName}</p>
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  별표 {annexPopup.annexNo}{annexPopup.title ? ` — ${annexPopup.title}` : ''}
                </h3>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {annexPopup.pdfUrl && (
                  <a
                    href={annexPopup.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors font-medium"
                  >
                    PDF 다운로드
                  </a>
                )}
                <button
                  onClick={() => setAnnexPopup(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {annexPopup.loading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">별표 불러오는 중...</span>
                </div>
              ) : annexPopup.error ? (
                <div className="text-sm text-red-600">
                  {annexPopup.error}
                </div>
              ) : (
                <pre className="text-xs text-gray-700 whitespace-pre font-mono leading-relaxed overflow-x-auto">
                  {annexPopup.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-10 text-center text-xs text-gray-400">
        ※ 이 서비스는 법령 정보 제공 목적이며, 법률 자문이 아닙니다. 구체적인 사안은 전문가와 상담하시기 바랍니다.
      </p>
    </div>
  )
}

type Reference = {
  type: 'article' | 'annex'
  lawName: string
  label: string
  articleNo?: number
  subNo?: number
  annexNo?: number
}

function extractReferences(text: string): Reference[] {
  const refs: Reference[] = []
  const seen = new Set<string>()

  // 1단계: 법령명 위치 모두 인덱싱
  // 두 가지 패턴 OR:
  //   A. 한 단어 법령: 공백 없는 한글 시퀀스 + (법|법률)  예: "산업안전보건법", "근로기준법"
  //   B. ~에 관한 법률: 한글단어들 + "관한 법률"  예: "중대재해 처벌 등에 관한 법률"
  // + 옵션 (시행령|시행규칙)
  // 임의 단어 조합 ("제공된 자료에서 산업안전보건법 ...") 매칭 방지
  const lawMatches: { start: number; end: number; name: string }[] = []
  const lawPattern = /(?<=[\s「『」\(\,\.\;\n]|^)(?:[가-힣]+(?:법률|법)|[가-힣]+(?:\s+[가-힣]+)+\s+관한\s+법(?:률)?)(?:\s+(?:시행령|시행규칙))?/g
  let lm
  while ((lm = lawPattern.exec(text)) !== null) {
    const name = lm[0].trim()
    if (name.length < 3) continue
    if (/^(이|그|동|당|위|아래|해당|본)\s/.test(name)) continue
    lawMatches.push({ start: lm.index, end: lm.index + lm[0].length, name })
  }

  // 2단계: 조문/별표 매칭하면서 직전 법령명 컨텍스트 사용
  const itemPattern = /제(\d+)조(?:의(\d+))?|별표\s*(\d+)/g
  let im
  while ((im = itemPattern.exec(text)) !== null) {
    const pos = im.index
    // 이 매치 직전 100자 이내의 법령명 찾기
    let lawName: string | null = null
    for (let i = lawMatches.length - 1; i >= 0; i--) {
      if (lawMatches[i].end <= pos && pos - lawMatches[i].end < 100) {
        lawName = lawMatches[i].name
        break
      }
    }
    if (!lawName) continue

    if (im[1]) {
      // 제X조[의Y]?
      const articleNo = parseInt(im[1])
      const subNo = im[2] ? parseInt(im[2]) : 0
      if (articleNo === 0) continue
      const label = subNo > 0 ? `제${articleNo}조의${subNo}` : `제${articleNo}조`
      const key = `${lawName}|art|${articleNo}|${subNo}`
      if (!seen.has(key)) {
        seen.add(key)
        refs.push({ type: 'article', lawName, label, articleNo, subNo })
      }
    } else if (im[3]) {
      // 별표 N
      const annexNo = parseInt(im[3])
      if (annexNo === 0) continue
      const label = `별표 ${annexNo}`
      const key = `${lawName}|annex|${annexNo}`
      if (!seen.has(key)) {
        seen.add(key)
        refs.push({ type: 'annex', lawName, label, annexNo })
      }
    }
  }

  return refs
}

function EmptyState({ icon, message, sub }: { icon: React.ReactNode; message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      {icon}
      <p className="mt-3 text-sm font-medium">{message}</p>
      {sub && <p className="mt-1 text-xs">{sub}</p>}
    </div>
  )
}
