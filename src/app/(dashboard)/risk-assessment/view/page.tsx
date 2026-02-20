'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Search, X, ChevronDown, ChevronUp, SlidersHorizontal,
  AlertTriangle, Loader2, ExternalLink, Filter, Camera,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PhotoLightbox } from '@/components/ui/photo-lightbox'
import { getRiskLevel, HAZARD_CATEGORY_LABELS, EVALUATION_TYPE_LABELS } from '@/lib/risk-assessment'

// ─── Types ───
interface Workplace { id: string; name: string }

interface PhotoItem { id: string; photoPath: string; thumbnailPath?: string | null }

interface HazardImprovement {
  id: string; status: string; improvementContent: string
  riskScore: number; severityScore: number; likelihoodScore: number
  additionalPoints: number; updateDate: string
  photos: PhotoItem[]
}

interface HazardItem {
  id: string; hazardCategory: string; hazardFactor: string
  severityScore: number; likelihoodScore: number; additionalPoints: number
  riskScore: number; improvementPlan: string | null
  createdAt?: string
  chemicalProduct: { id: string; name: string } | null
  photos: PhotoItem[]
  improvements: HazardImprovement[]
  card: {
    id: string; evaluationNumber: string; year: number; evaluationType: string
    organizationUnit: {
      id: string; name: string
      parent: { id: string; name: string } | null
    }
    workplace: { id: string; name: string }
  }
}

// ─── Constants ───
const CATEGORIES = [
  { key: 'ACCIDENT',        label: '사고성재해',  color: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'MUSCULOSKELETAL', label: '근골격계',    color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'CHEMICAL',        label: '유해화학물질', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'NOISE',           label: '소음',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'ABSOLUTE',        label: '절대기준',    color: 'bg-gray-900 text-white border-gray-700' },
  { key: 'OTHER',           label: '기타위험',    color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

const CATEGORY_BADGE: Record<string, string> = {
  ACCIDENT: 'bg-red-100 text-red-700',
  MUSCULOSKELETAL: 'bg-amber-100 text-amber-700',
  CHEMICAL: 'bg-purple-100 text-purple-700',
  NOISE: 'bg-blue-100 text-blue-700',
  ABSOLUTE: 'bg-gray-800 text-white',
  OTHER: 'bg-gray-100 text-gray-700',
}

const RISK_LEVELS = [
  { key: '매우높음', color: 'bg-red-100 text-red-700 border-red-200' },
  { key: '높음',    color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: '보통',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: '낮음',    color: 'bg-green-100 text-green-700 border-green-200' },
]

const IMPROVEMENT_STATUSES = [
  { key: 'none',      label: '미개선',  color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { key: 'planned',   label: '예정',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'completed', label: '완료',    color: 'bg-green-100 text-green-700 border-green-200' },
]

const SORT_OPTIONS = [
  { value: 'risk_desc',  label: '위험성 높은 순' },
  { value: 'risk_asc',   label: '위험성 낮은 순' },
  { value: 'unit_asc',   label: '평가단위 가나다순' },
  { value: 'unit_desc',  label: '평가단위 역순' },
  { value: 'category',   label: '유해위험분류순' },
  { value: 'recent',     label: '최근 등록순' },
  { value: 'oldest',     label: '오래된 등록순' },
]

// 개선현황 상태 판별
function getImprovementStatus(h: HazardItem): string {
  if (h.improvements.length === 0) return 'none'
  if (h.improvements.some(i => i.status === 'COMPLETED')) return 'completed'
  return 'planned'
}

// 위험요인의 전체 사진 (위험요인 사진 + 개선작업 사진)
function getAllPhotos(h: HazardItem): PhotoItem[] {
  const photos: PhotoItem[] = [...(h.photos || [])]
  h.improvements.forEach(imp => {
    if (imp.photos) photos.push(...imp.photos)
  })
  return photos
}

// ─── Main Page ───
export default function ViewPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [workplaceId, setWorkplaceId] = useState('')
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [allHazards, setAllHazards] = useState<HazardItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Client-side filters
  const [searchText, setSearchText] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<Set<string>>(new Set())
  const [selectedOrgUnits, setSelectedOrgUnits] = useState<Set<string>>(new Set())
  const [selectedImpStatuses, setSelectedImpStatuses] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('risk_desc')
  const [showOrgFilter, setShowOrgFilter] = useState(false)
  const orgFilterRef = useRef<HTMLDivElement>(null)

  // Lightbox state
  const [lightboxPhotos, setLightboxPhotos] = useState<PhotoItem[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/workplaces').then(r => r.json()).then(d => setWorkplaces(d.workplaces || []))
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setSelectedOrgUnits(new Set())
    const params = new URLSearchParams({ year: String(year) })
    if (workplaceId) params.set('workplaceId', workplaceId)
    fetch(`/api/risk-assessment/hazards?${params}`)
      .then(r => r.json())
      .then(d => { setAllHazards(d.hazards || []); setIsLoading(false) })
  }, [year, workplaceId])

  // Close org unit dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (orgFilterRef.current && !orgFilterRef.current.contains(e.target as Node)) {
        setShowOrgFilter(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Unique org units from loaded hazards
  const orgUnits = useMemo(() => {
    const map = new Map<string, { id: string; name: string; parentName: string | null }>()
    allHazards.forEach(h => {
      const u = h.card.organizationUnit
      if (!map.has(u.id)) {
        map.set(u.id, { id: u.id, name: u.name, parentName: u.parent?.name ?? null })
      }
    })
    return Array.from(map.values()).sort((a, b) => {
      const pa = a.parentName ?? ''; const pb = b.parentName ?? ''
      return pa.localeCompare(pb) || a.name.localeCompare(b.name)
    })
  }, [allHazards])

  // Filtered & sorted hazards
  const filteredHazards = useMemo(() => {
    let result = allHazards

    if (selectedCategories.size > 0) {
      result = result.filter(h => selectedCategories.has(h.hazardCategory))
    }
    if (selectedRiskLevels.size > 0) {
      result = result.filter(h => selectedRiskLevels.has(getRiskLevel(h.riskScore).label))
    }
    if (selectedOrgUnits.size > 0) {
      result = result.filter(h => selectedOrgUnits.has(h.card.organizationUnit.id))
    }
    if (selectedImpStatuses.size > 0) {
      result = result.filter(h => selectedImpStatuses.has(getImprovementStatus(h)))
    }
    if (searchText.trim()) {
      const t = searchText.toLowerCase()
      result = result.filter(h =>
        h.hazardFactor.toLowerCase().includes(t) ||
        h.card.organizationUnit.name.toLowerCase().includes(t) ||
        (h.card.organizationUnit.parent?.name.toLowerCase().includes(t)) ||
        (h.improvementPlan?.toLowerCase().includes(t)) ||
        (h.chemicalProduct?.name.toLowerCase().includes(t))
      )
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'risk_asc':  return a.riskScore - b.riskScore
        case 'risk_desc': return b.riskScore - a.riskScore
        case 'unit_asc':  return a.card.organizationUnit.name.localeCompare(b.card.organizationUnit.name)
        case 'unit_desc': return b.card.organizationUnit.name.localeCompare(a.card.organizationUnit.name)
        case 'category':  return a.hazardCategory.localeCompare(b.hazardCategory)
        case 'recent':    return (b as { createdAt?: string }).createdAt?.localeCompare((a as { createdAt?: string }).createdAt ?? '') ?? 0
        case 'oldest':    return (a as { createdAt?: string }).createdAt?.localeCompare((b as { createdAt?: string }).createdAt ?? '') ?? 0
        default:          return b.riskScore - a.riskScore
      }
    })
  }, [allHazards, selectedCategories, selectedRiskLevels, selectedOrgUnits, selectedImpStatuses, searchText, sortBy])

  // Stats from filtered hazards
  const stats = useMemo(() => {
    const byRisk: Record<string, number> = { '매우높음': 0, '높음': 0, '보통': 0, '낮음': 0 }
    const byCategory: Record<string, number> = {}
    const byImpStatus: Record<string, number> = { none: 0, planned: 0, completed: 0 }

    filteredHazards.forEach(h => {
      const lvl = getRiskLevel(h.riskScore).label
      byRisk[lvl] = (byRisk[lvl] ?? 0) + 1
      byCategory[h.hazardCategory] = (byCategory[h.hazardCategory] ?? 0) + 1
      byImpStatus[getImprovementStatus(h)]++
    })

    return { total: filteredHazards.length, byRisk, byCategory, byImpStatus }
  }, [filteredHazards])

  const isFiltered = selectedCategories.size > 0 || selectedRiskLevels.size > 0 ||
    selectedOrgUnits.size > 0 || selectedImpStatuses.size > 0 || searchText.trim().length > 0

  const clearFilters = () => {
    setSelectedCategories(new Set())
    setSelectedRiskLevels(new Set())
    setSelectedOrgUnits(new Set())
    setSelectedImpStatuses(new Set())
    setSearchText('')
  }

  const toggleSet = (set: Set<string>, key: string): Set<string> => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  }

  const openLightbox = (photos: PhotoItem[], startIndex: number) => {
    setLightboxPhotos(photos)
    setLightboxIndex(startIndex)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/risk-assessment" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">모아 보기</h1>
          <p className="text-sm text-gray-500 mt-0.5">전체 유해위험요인 필터링·정렬 분석</p>
        </div>
      </div>

      {/* Primary Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl p-3">
        {/* Year */}
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y =>
            <option key={y} value={y}>{y}년</option>
          )}
        </select>

        {/* Workplace */}
        <select value={workplaceId} onChange={e => setWorkplaceId(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">전체 사업장</option>
          {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
        </select>

        <div className="w-px h-6 bg-gray-200" />

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Org unit filter dropdown */}
        {orgUnits.length > 0 && (
          <div className="relative" ref={orgFilterRef}>
            <button
              onClick={() => setShowOrgFilter(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-colors ${selectedOrgUnits.size > 0 ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}
            >
              <Filter className="w-3.5 h-3.5" />
              평가단위
              {selectedOrgUnits.size > 0 && <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">{selectedOrgUnits.size}</span>}
              {showOrgFilter ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showOrgFilter && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[220px] max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">평가단위 선택</span>
                  {selectedOrgUnits.size > 0 && (
                    <button onClick={() => setSelectedOrgUnits(new Set())} className="text-xs text-blue-500 hover:underline">초기화</button>
                  )}
                </div>
                {orgUnits.map(u => (
                  <label key={u.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedOrgUnits.has(u.id)}
                      onChange={() => setSelectedOrgUnits(prev => toggleSet(prev, u.id))}
                      className="rounded text-blue-600" />
                    <div>
                      <span className="text-sm text-gray-800">{u.name}</span>
                      {u.parentName && <span className="text-xs text-gray-400 ml-1">({u.parentName})</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="유해위험요인, 조직명 검색..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm w-52"
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Category & Risk Level & Improvement Status Filter Chips */}
      <div className="flex flex-wrap gap-4 items-start">
        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-500 font-medium mr-1">분류:</span>
          {CATEGORIES.map(cat => {
            const count = stats.byCategory[cat.key] ?? 0
            const isActive = selectedCategories.has(cat.key)
            return (
              <button key={cat.key}
                onClick={() => setSelectedCategories(prev => toggleSet(prev, cat.key))}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? cat.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                {cat.label}
                <span className={`text-xs ${isActive ? 'opacity-80' : 'text-gray-400'}`}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Risk Levels */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-500 font-medium mr-1">등급:</span>
          {RISK_LEVELS.map(rl => {
            const count = stats.byRisk[rl.key] ?? 0
            const isActive = selectedRiskLevels.has(rl.key)
            return (
              <button key={rl.key}
                onClick={() => setSelectedRiskLevels(prev => toggleSet(prev, rl.key))}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? rl.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                {rl.key}
                <span className={`text-xs ${isActive ? 'opacity-80' : 'text-gray-400'}`}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Improvement Status */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-500 font-medium mr-1">개선:</span>
          {IMPROVEMENT_STATUSES.map(is => {
            const count = stats.byImpStatus[is.key] ?? 0
            const isActive = selectedImpStatuses.has(is.key)
            return (
              <button key={is.key}
                onClick={() => setSelectedImpStatuses(prev => toggleSet(prev, is.key))}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? is.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                {is.label}
                <span className={`text-xs ${isActive ? 'opacity-80' : 'text-gray-400'}`}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Clear filters */}
        {isFiltered && (
          <button onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-full hover:border-red-200 transition-colors">
            <X className="w-3 h-3" />필터 초기화
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="전체 위험요인" value={stats.total} />
        <StatCard label="매우높음 (≥16)" value={stats.byRisk['매우높음']} color="text-red-600" />
        <StatCard label="높음 (9-15)" value={stats.byRisk['높음']} color="text-orange-600" />
        <StatCard label="보통 (5-8)" value={stats.byRisk['보통']} color="text-yellow-600" />
        <StatCard label="낮음 (1-4)" value={stats.byRisk['낮음']} color="text-green-600" />
        <StatCard label="개선 완료" value={stats.byImpStatus.completed} color="text-blue-600" />
      </div>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="font-medium text-sm">
              유해위험요인 목록
            </span>
            {isFiltered
              ? <span className="text-sm text-gray-500">{filteredHazards.length}건 (전체 {allHazards.length}건 중)</span>
              : <span className="text-sm text-gray-500">{filteredHazards.length}건</span>
            }
          </div>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredHazards.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <SlidersHorizontal className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm">{allHazards.length > 0 ? '필터 조건에 맞는 위험요인이 없습니다.' : '해당 연도·사업장의 위험요인이 없습니다.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-medium text-gray-500">
                    <th className="text-left px-3 py-2.5 w-5">#</th>
                    <th className="text-left px-3 py-2.5 w-36">평가단위</th>
                    <th className="text-left px-3 py-2.5 w-24">분류</th>
                    <th className="text-left px-3 py-2.5">유해위험요인</th>
                    <th className="text-center px-3 py-2.5 w-16">사진</th>
                    <th className="text-center px-3 py-2.5 w-28">최초 위험성</th>
                    <th className="text-center px-3 py-2.5 w-28">개선 후</th>
                    <th className="text-left px-3 py-2.5 w-40">개선제안</th>
                    <th className="text-center px-3 py-2.5 w-24">개선현황</th>
                    <th className="text-center px-3 py-2.5 w-24">평가카드</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHazards.map((h, idx) => {
                    const level = getRiskLevel(h.riskScore)
                    const completedImpr = h.improvements.filter(i => i.status === 'COMPLETED')
                    const plannedImpr   = h.improvements.filter(i => i.status === 'PLANNED')
                    const latestCompleted = completedImpr[0]
                    const latestAny = h.improvements[0]
                    const afterRecord = latestCompleted ?? latestAny
                    const afterLevel = afterRecord ? getRiskLevel(afterRecord.riskScore) : null
                    const allPhotos = getAllPhotos(h)

                    return (
                      <tr key={h.id} className="border-b hover:bg-gray-50 transition-colors">
                        {/* # */}
                        <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>

                        {/* 평가단위 */}
                        <td className="px-3 py-2.5">
                          {h.card.organizationUnit.parent && (
                            <p className="text-xs text-gray-400 leading-tight">{h.card.organizationUnit.parent.name}</p>
                          )}
                          <p className="text-sm font-medium text-gray-800">{h.card.organizationUnit.name}</p>
                        </td>

                        {/* 분류 */}
                        <td className="px-3 py-2.5">
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_BADGE[h.hazardCategory]}`}>
                            {HAZARD_CATEGORY_LABELS[h.hazardCategory]}
                          </span>
                        </td>

                        {/* 유해위험요인 */}
                        <td className="px-3 py-2.5">
                          <p className="text-sm text-gray-900">{h.hazardFactor}</p>
                          {h.chemicalProduct && (
                            <p className="text-xs text-purple-600 mt-0.5">{h.chemicalProduct.name}</p>
                          )}
                        </td>

                        {/* 사진 */}
                        <td className="px-3 py-2.5 text-center">
                          {allPhotos.length > 0 ? (
                            <button
                              onClick={() => openLightbox(allPhotos, 0)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {allPhotos.length}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>

                        {/* 최초 위험성 */}
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${level.bg} ${level.color}`}>
                            {h.riskScore}점
                          </span>
                          <p className={`text-xs mt-0.5 ${level.color}`}>{level.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {h.hazardCategory === 'ABSOLUTE'
                              ? '절대기준'
                              : `${h.severityScore}×${h.likelihoodScore}+${h.additionalPoints}`}
                          </p>
                        </td>

                        {/* 개선 후 */}
                        <td className="px-3 py-2.5 text-center">
                          {afterRecord ? (
                            <>
                              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${afterLevel!.bg} ${afterLevel!.color}`}>
                                {afterRecord.riskScore}점
                              </span>
                              <p className={`text-xs mt-0.5 ${afterLevel!.color}`}>{afterLevel!.label}</p>
                              <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${afterRecord.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {afterRecord.status === 'COMPLETED' ? '완료' : '예정'}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>

                        {/* 개선제안 */}
                        <td className="px-3 py-2.5">
                          <p className="text-xs text-gray-600 line-clamp-2">{h.improvementPlan ?? <span className="text-gray-300">-</span>}</p>
                        </td>

                        {/* 개선현황 */}
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col items-center gap-0.5">
                            {completedImpr.length > 0 && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">완료 {completedImpr.length}</span>
                            )}
                            {plannedImpr.length > 0 && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">예정 {plannedImpr.length}</span>
                            )}
                            {h.improvements.length === 0 && (
                              <span className="text-xs text-gray-300">미등록</span>
                            )}
                          </div>
                        </td>

                        {/* 평가카드 */}
                        <td className="px-3 py-2.5 text-center">
                          <Link href={`/risk-assessment/${h.card.id}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline">
                            <ExternalLink className="w-3 h-3" />
                            {h.card.evaluationNumber}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">{EVALUATION_TYPE_LABELS[h.card.evaluationType]}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Lightbox */}
      {lightboxIndex !== null && lightboxPhotos.length > 0 && (
        <PhotoLightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => { setLightboxIndex(null); setLightboxPhotos([]) }}
        />
      )}
    </div>
  )
}

// ─── StatCard ───
function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${color ?? 'text-gray-900'}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
