'use client'

import { useState, useCallback, useRef } from 'react'
import { Scale, Loader2, X, Bot, ToggleLeft, ToggleRight, FileText, BookOpen } from 'lucide-react'

const API_BASE = '/api/law'

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

type Reference = {
  type: 'article' | 'annex'
  lawName: string
  label: string
  articleNo?: number
  subNo?: number
  annexNo?: number
}

export default function LawSearchPage() {
  const [query, setQuery] = useState('')
  const [oshOnly, setOshOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askResult, setAskResult] = useState<AskResponse | null>(null)

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

  const handleSubmit = async () => {
    if (!query.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const references = askResult?.answer ? extractReferences(askResult.answer) : []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-violet-100">
            <Scale className="w-6 h-6 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">법령 AI 검색</h1>
        </div>
        <p className="text-sm text-gray-500">
          궁금한 법령 내용을 자연어로 질문하면 AI가 답변하고, 참고한 조문/별표를 클릭해 전문을 볼 수 있습니다.
        </p>
      </div>

      {/* Question Input */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="법령에 대해 질문하세요... (예: 50인 미만 사업장 안전보건 담당자 선임 의무)"
          rows={3}
          className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          disabled={loading}
        />

        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setOshOnly(v => !v)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              oshOnly ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {oshOnly ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            산업안전보건 법령만
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                질문하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading hint */}
      {loading && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-700">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>법령 검색 및 답변 생성 중... (1~2분 소요될 수 있습니다)</span>
        </div>
      )}

      {/* Result */}
      {askResult?.answer && (
        <div className={`transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {/* AI Answer */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-gray-700">AI 답변</h2>
              {(askResult.search_time_ms || askResult.generate_time_ms) && (
                <span className="ml-auto text-xs text-gray-400">
                  {askResult.search_time_ms ? `검색 ${(askResult.search_time_ms / 1000).toFixed(1)}s` : ''}
                  {askResult.search_time_ms && askResult.generate_time_ms ? ' · ' : ''}
                  {askResult.generate_time_ms ? `생성 ${(askResult.generate_time_ms / 1000).toFixed(1)}s` : ''}
                </span>
              )}
            </div>
            <div
              className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(askResult.answer) }}
            />
          </div>

          {/* References */}
          {references.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-violet-600" />
                <h2 className="text-sm font-semibold text-gray-700">참고 법조항</h2>
                <span className="text-xs text-gray-400">클릭하여 전문 보기</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {references.map((ref, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (ref.type === 'article' && ref.articleNo !== undefined) {
                        fetchArticlePopup(ref.lawName, ref.articleNo, ref.label, ref.subNo ?? 0)
                      } else if (ref.type === 'annex' && ref.annexNo !== undefined) {
                        fetchAnnexPopup(ref.lawName, ref.annexNo)
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      ref.type === 'annex'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>{ref.lawName} {ref.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !askResult && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Bot className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">위 입력창에 법령 관련 질문을 입력해주세요</p>
          <p className="mt-1 text-xs">AI가 법령을 검색하고 답변과 함께 참고 조문을 보여줍니다</p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-10 text-center text-xs text-gray-400">
        ※ 이 서비스는 법령 정보 제공 목적이며, 법률 자문이 아닙니다. 구체적인 사안은 전문가와 상담하시기 바랍니다.
      </p>

      {/* Article popup */}
      {articlePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setArticlePopup(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <div className="text-xs text-gray-500">{articlePopup.lawName}</div>
                <h3 className="text-base font-semibold text-gray-900">{articlePopup.article}</h3>
              </div>
              <button
                type="button"
                onClick={() => setArticlePopup(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {articlePopup.loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  조문을 불러오는 중...
                </div>
              ) : (
                <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {articlePopup.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Annex popup */}
      {annexPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAnnexPopup(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <div className="text-xs text-gray-500">{annexPopup.lawName}</div>
                <h3 className="text-base font-semibold text-gray-900">
                  별표 {annexPopup.annexNo}
                  {annexPopup.title ? ` · ${annexPopup.title}` : ''}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAnnexPopup(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {annexPopup.loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  별표를 불러오는 중...
                </div>
              ) : annexPopup.error ? (
                <div className="text-sm text-red-600">{annexPopup.error}</div>
              ) : (
                <>
                  {annexPopup.content && (
                    <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                      {annexPopup.content}
                    </pre>
                  )}
                  {annexPopup.pdfUrl && (
                    <a
                      href={annexPopup.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100"
                    >
                      <FileText className="w-3 h-3" />
                      PDF 보기
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- helpers ---

function renderMarkdown(text: string): string {
  // 간단한 markdown 렌더링: bold, 줄바꿈
  // 1. HTML escape
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  // 2. **bold** → <strong>
  const bolded = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // 3. 줄바꿈 → <br>
  return bolded.replace(/\n/g, '<br>')
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
  const lawPattern = /(?<=[\s「『」\(\,\.\;\n\*]|^)(?:[가-힣]+(?:법률|법)|[가-힣]+(?:\s+[가-힣]+)*\s+관한\s+(?:법(?:률)?|규칙|규정))(?:\s+(?:시행령|시행규칙))?/g
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
