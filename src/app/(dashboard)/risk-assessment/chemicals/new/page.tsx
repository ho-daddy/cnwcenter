'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Loader2, Copy, X } from 'lucide-react'
import ChemicalForm, { type ProductData, type ComponentData } from '../_components/ChemicalForm'
import type { SeverityStandard } from '@/lib/msds-rules'

interface Workplace { id: string; name: string }

interface ChemicalSearchResult {
  id: string
  name: string
  manufacturer: string | null
  severityScore: number | null
  workplace: { id: string; name: string }
  _count: { components: number }
}

interface ChemicalDetail {
  id: string
  name: string
  manufacturer: string | null
  description: string | null
  managementMethod: string | null
  severityStandard: SeverityStandard
  productHazards: string | null
  productRegulations: string | null
  productSeverityScore: number | null
  components: Array<{
    concentration: string | null
    severityScore: number | null
    component: {
      casNumber: string
      name: string
      hazards: string | null
      regulations: string | null
    }
  }>
}

export default function NewChemicalProductPage() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWp, setSelectedWp] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // 기존 제품 검색
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<ChemicalSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [prefillData, setPrefillData] = useState<ProductData | null>(null)
  const [prefillSource, setPrefillSource] = useState<{ name: string; workplace: string } | null>(null)
  const [formKey, setFormKey] = useState(0)
  const searchAbortRef = useRef<AbortController | null>(null)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch('/api/workplaces')
      .then(r => r.json())
      .then(d => {
        const list: Workplace[] = d.workplaces || []
        setWorkplaces(list)
        if (list.length === 1) setSelectedWp(list[0].id)
        setIsLoading(false)
      })
  }, [])

  // 검색어 디바운스
  useEffect(() => {
    const q = searchText.trim()
    if (!q) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(() => {
      searchAbortRef.current?.abort()
      const ctrl = new AbortController()
      searchAbortRef.current = ctrl
      fetch(`/api/risk-assessment/chemicals?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => {
          setSearchResults(d.chemicals || [])
          setShowResults(true)
        })
        .catch(() => { /* aborted or error — 무시 */ })
        .finally(() => setIsSearching(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [searchText])

  // 결과 영역 외부 클릭 시 닫기
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!searchContainerRef.current) return
      if (!searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const wpName = workplaces.find(w => w.id === selectedWp)?.name || ''

  const handlePickExisting = async (id: string) => {
    setIsLoadingDetail(true)
    setShowResults(false)
    try {
      const res = await fetch(`/api/risk-assessment/chemicals/${id}`)
      if (!res.ok) { alert('제품 정보를 불러오지 못했습니다.'); return }
      const data: ChemicalDetail = await res.json()

      const components: ComponentData[] = data.components.map(pc => ({
        key: crypto.randomUUID(),
        casNumber: pc.component.casNumber || '',
        name: pc.component.name || '',
        concentration: pc.concentration || '',
        hazards: pc.component.hazards || '',
        regulations: pc.component.regulations || '',
        severityScore: pc.severityScore ?? 1,
        isTradeSecret: pc.component.casNumber === '영업비밀',
        isConcentrationUnknown: (pc.concentration || '').toLowerCase() === '모름',
      }))

      const prefill: ProductData = {
        name: data.name || '',
        manufacturer: data.manufacturer || '',
        description: data.description || '',
        managementMethod: data.managementMethod || '',
        severityStandard: data.severityStandard || 'SAEUMTER',
        productHazards: data.productHazards || '',
        productRegulations: data.productRegulations || '',
        productSeverityScore: data.productSeverityScore ?? null,
        components: components.length > 0 ? components : [],
      }

      setPrefillData(prefill)
      setPrefillSource({ name: data.name, workplace: workplaces.find(w => w.id === selectedWp)?.name || '' })
      setFormKey(k => k + 1)
      setSearchText('')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const clearPrefill = () => {
    setPrefillData(null)
    setPrefillSource(null)
    setFormKey(k => k + 1)
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/risk-assessment/chemicals" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">새 화학제품 등록</h1>
          <p className="text-sm text-gray-500 mt-0.5">구성성분 정보와 함께 화학제품을 등록합니다.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
      ) : (
        <>
          {/* 기존 제품 불러오기 패널 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Copy className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-amber-900">기존 등록 제품 불러오기</h2>
                <p className="text-xs text-amber-800 mt-0.5">
                  이미 등록된 화학제품의 정보(성분·유해성·점수 등)를 가져와서 그대로 또는 수정하여 새로 등록할 수 있습니다.
                  다른 사업장에 같은 제품을 등록할 때 사용하세요.
                </p>
              </div>
            </div>

            <div ref={searchContainerRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="등록된 제품명 또는 제조사로 검색..."
                className="w-full pl-9 pr-9 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />
              )}

              {/* 검색 결과 드롭다운 */}
              {showResults && searchText.trim() && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {searchResults.length === 0 && !isSearching ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">검색 결과가 없습니다.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {searchResults.map(r => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => handlePickExisting(r.id)}
                            disabled={isLoadingDetail}
                            className="w-full px-4 py-2.5 text-left hover:bg-amber-50 flex items-center gap-3 disabled:opacity-50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {r.manufacturer ? `${r.manufacturer} · ` : ''}
                                {r.workplace.name} · 성분 {r._count.components}종
                              </p>
                            </div>
                            {typeof r.severityScore === 'number' && r.severityScore > 0 && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 shrink-0">
                                {r.severityScore}점
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {prefillSource && (
              <div className="flex items-center gap-2 bg-white border border-amber-300 rounded px-3 py-2">
                <Copy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-900 flex-1 truncate">
                  <span className="font-semibold">{prefillSource.name}</span>의 정보를 불러와서 아래 폼에 채웠습니다. 필요한 부분을 수정 후 등록하세요.
                </p>
                <button
                  type="button"
                  onClick={clearPrefill}
                  className="text-amber-700 hover:text-amber-900 text-xs flex items-center gap-1"
                  title="불러온 정보 초기화"
                >
                  <X className="w-3.5 h-3.5" /> 초기화
                </button>
              </div>
            )}

            {isLoadingDetail && (
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 제품 정보 불러오는 중...
              </div>
            )}
          </div>

          {workplaces.length > 1 && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">사업장 선택 *</label>
              <select value={selectedWp} onChange={e => setSelectedWp(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-64">
                <option value="">사업장을 선택하세요</option>
                {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
              </select>
            </div>
          )}

          {selectedWp ? (
            <ChemicalForm
              key={formKey}
              mode="new"
              workplaceId={selectedWp}
              workplaceName={wpName}
              initial={prefillData || undefined}
            />
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">사업장을 선택해주세요.</div>
          )}
        </>
      )}
    </div>
  )
}
