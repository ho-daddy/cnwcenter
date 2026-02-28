'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Search, X, SlidersHorizontal,
  AlertTriangle, Loader2, ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// ─── Types ───
interface Workplace { id: string; name: string }

interface ImprovementItem {
  id: string; status: string | null; problem: string; improvement: string
  responsiblePerson: string | null; updateDate: string | null
}

interface Assessment {
  id: string
  year: number
  assessmentType: string
  status: string
  managementLevel: string | null
  workplace: { id: string; name: string }
  organizationUnit: { name: string }
  elementWorks: {
    id: string; name: string
    bodyPartScores: { bodyPart: string; totalScore: number }[]
  }[]
  improvements: ImprovementItem[]
  updatedAt: string
}

// ─── Constants ───
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:       { label: '작성중',   color: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: '조사중',   color: 'bg-orange-100 text-orange-600' },
  COMPLETED:   { label: '완료',     color: 'bg-green-100 text-green-600' },
  REVIEWED:    { label: '검토완료', color: 'bg-blue-100 text-blue-600' },
}

const BODY_PARTS = [
  { id: 'HAND_WRIST',    label: '손' },
  { id: 'ELBOW_FOREARM', label: '팔' },
  { id: 'SHOULDER_ARM',  label: '어깨' },
  { id: 'NECK',          label: '목' },
  { id: 'BACK_HIP',      label: '허리' },
  { id: 'KNEE_ANKLE',    label: '무릎' },
]

const MANAGEMENT_LEVELS = [
  { key: '상',  color: 'bg-red-100 text-red-700 border-red-200' },
  { key: '중상', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: '중',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: '하',  color: 'bg-green-100 text-green-700 border-green-200' },
]

const IMPROVEMENT_STATUSES = [
  { key: 'none',      label: '없음',  color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { key: 'planned',   label: '예정',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'completed', label: '완료',  color: 'bg-green-100 text-green-700 border-green-200' },
]

function getScoreColor(score: number) {
  if (score >= 7) return { text: 'text-red-700', bg: 'bg-red-100' }
  if (score >= 5) return { text: 'text-orange-700', bg: 'bg-orange-100' }
  if (score >= 3) return { text: 'text-yellow-700', bg: 'bg-yellow-100' }
  return { text: 'text-green-700', bg: 'bg-green-100' }
}

function getImprovementStatus(a: Assessment): string {
  if (a.improvements.length === 0) return 'none'
  if (a.improvements.some(i => i.status === 'COMPLETED')) return 'completed'
  if (a.improvements.some(i => i.status === 'PLANNED')) return 'planned'
  return 'none'
}

// ─── Main Page ───
export default function ViewPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [workplaceId, setWorkplaceId] = useState('')
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set())
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set())
  const [selectedImpStatuses, setSelectedImpStatuses] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/workplaces').then(r => r.json()).then(d => setWorkplaces(d.workplaces || []))
  }, [])

  useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams({ year: String(year) })
    if (workplaceId) params.set('workplaceId', workplaceId)
    fetch(`/api/musculoskeletal?${params}`)
      .then(r => r.json())
      .then(d => { setAllAssessments(d.assessments || []); setIsLoading(false) })
  }, [year, workplaceId])

  const toggleSet = (set: Set<string>, key: string): Set<string> => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  }

  // Filtered assessments
  const filteredAssessments = useMemo(() => {
    let result = allAssessments

    if (selectedStatuses.size > 0) {
      result = result.filter(a => selectedStatuses.has(a.status))
    }
    if (selectedLevels.size > 0) {
      result = result.filter(a => a.managementLevel && selectedLevels.has(a.managementLevel))
    }
    if (selectedImpStatuses.size > 0) {
      result = result.filter(a => selectedImpStatuses.has(getImprovementStatus(a)))
    }
    if (searchText.trim()) {
      const t = searchText.toLowerCase()
      result = result.filter(a =>
        a.organizationUnit.name.toLowerCase().includes(t) ||
        a.workplace.name.toLowerCase().includes(t)
      )
    }

    return result
  }, [allAssessments, selectedStatuses, selectedLevels, selectedImpStatuses, searchText])

  // Stats
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {}
    const byLevel: Record<string, number> = {}
    const byImp: Record<string, number> = { none: 0, planned: 0, completed: 0 }

    filteredAssessments.forEach(a => {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
      if (a.managementLevel) byLevel[a.managementLevel] = (byLevel[a.managementLevel] ?? 0) + 1
      byImp[getImprovementStatus(a)]++
    })

    return { total: filteredAssessments.length, byStatus, byLevel, byImp }
  }, [filteredAssessments])

  const isFiltered = selectedStatuses.size > 0 || selectedLevels.size > 0 ||
    selectedImpStatuses.size > 0 || searchText.trim().length > 0

  const clearFilters = () => {
    setSelectedStatuses(new Set())
    setSelectedLevels(new Set())
    setSelectedImpStatuses(new Set())
    setSearchText('')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/musculoskeletal" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">모아 보기</h1>
          <p className="text-sm text-gray-500 mt-0.5">전체 근골조사 결과 필터링·분석</p>
        </div>
      </div>

      {/* Primary Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl p-3">
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y =>
            <option key={y} value={y}>{y}년</option>
          )}
        </select>
        <select value={workplaceId} onChange={e => setWorkplaceId(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">전체 사업장</option>
          {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
        </select>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="평가단위, 사업장 검색..." value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm w-52" />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-4 items-start">
        {/* Status */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-500 font-medium mr-1">상태:</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = stats.byStatus[key] ?? 0
            const isActive = selectedStatuses.has(key)
            return (
              <button key={key}
                onClick={() => setSelectedStatuses(prev => toggleSet(prev, key))}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? cfg.color + ' ring-2 ring-offset-1 ring-current border-current' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                {cfg.label}
                <span className={`text-xs ${isActive ? 'opacity-80' : 'text-gray-400'}`}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Management Level */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-500 font-medium mr-1">관리등급:</span>
          {MANAGEMENT_LEVELS.map(ml => {
            const count = stats.byLevel[ml.key] ?? 0
            const isActive = selectedLevels.has(ml.key)
            return (
              <button key={ml.key}
                onClick={() => setSelectedLevels(prev => toggleSet(prev, ml.key))}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? ml.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                {ml.key}
                <span className={`text-xs ${isActive ? 'opacity-80' : 'text-gray-400'}`}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Improvement Status */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-500 font-medium mr-1">개선:</span>
          {IMPROVEMENT_STATUSES.map(is => {
            const count = stats.byImp[is.key] ?? 0
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

        {isFiltered && (
          <button onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-full hover:border-red-200 transition-colors">
            <X className="w-3 h-3" />필터 초기화
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="전체 조사" value={stats.total} />
        <StatCard label="관리등급 상" value={stats.byLevel['상'] ?? 0} color="text-red-600" />
        <StatCard label="관리등급 중상" value={stats.byLevel['중상'] ?? 0} color="text-orange-600" />
        <StatCard label="관리등급 중" value={stats.byLevel['중'] ?? 0} color="text-yellow-600" />
        <StatCard label="관리등급 하" value={stats.byLevel['하'] ?? 0} color="text-green-600" />
        <StatCard label="개선 완료" value={stats.byImp.completed} color="text-blue-600" />
      </div>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="font-medium text-sm">근골조사 목록</span>
            {isFiltered
              ? <span className="text-sm text-gray-500">{filteredAssessments.length}건 (전체 {allAssessments.length}건 중)</span>
              : <span className="text-sm text-gray-500">{filteredAssessments.length}건</span>
            }
          </div>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <SlidersHorizontal className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm">{allAssessments.length > 0 ? '필터 조건에 맞는 조사가 없습니다.' : '해당 연도·사업장의 조사가 없습니다.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-medium text-gray-500">
                    <th className="text-left px-3 py-2.5 w-5">#</th>
                    <th className="text-left px-3 py-2.5 w-36">평가단위</th>
                    <th className="text-center px-3 py-2.5 w-16">상태</th>
                    <th className="text-center px-3 py-2.5 w-14">등급</th>
                    {BODY_PARTS.map(bp => (
                      <th key={bp.id} className="text-center px-1.5 py-2.5 w-10">{bp.label}</th>
                    ))}
                    <th className="text-center px-3 py-2.5 w-24">개선현황</th>
                    <th className="text-center px-3 py-2.5 w-16">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.map((a, idx) => {
                    const maxScores: Record<string, number> = {}
                    a.elementWorks.forEach(w =>
                      w.bodyPartScores.forEach(s => {
                        if (!maxScores[s.bodyPart] || s.totalScore > maxScores[s.bodyPart])
                          maxScores[s.bodyPart] = s.totalScore
                      })
                    )
                    const statusCfg = STATUS_CONFIG[a.status] || { label: a.status, color: 'bg-gray-100' }
                    const completedImpr = a.improvements.filter(i => i.status === 'COMPLETED')
                    const plannedImpr = a.improvements.filter(i => i.status === 'PLANNED')
                    const levelCfg = MANAGEMENT_LEVELS.find(m => m.key === a.managementLevel)

                    return (
                      <tr key={a.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-xs text-gray-400 leading-tight">{a.workplace.name}</p>
                          <p className="text-sm font-medium text-gray-800">{a.organizationUnit.name}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {a.managementLevel ? (
                            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${levelCfg?.color || 'bg-gray-100'}`}>
                              {a.managementLevel}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                        {BODY_PARTS.map(bp => {
                          const score = maxScores[bp.id]
                          if (score == null) return (
                            <td key={bp.id} className="px-1.5 py-2.5 text-center">
                              <span className="text-xs text-gray-300">-</span>
                            </td>
                          )
                          const sc = getScoreColor(score)
                          return (
                            <td key={bp.id} className="px-1.5 py-2.5 text-center">
                              <span className={`inline-block w-6 h-6 leading-6 rounded text-xs font-bold ${sc.bg} ${sc.text}`}>
                                {score}
                              </span>
                            </td>
                          )
                        })}
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {completedImpr.length > 0 && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">완료 {completedImpr.length}</span>
                            )}
                            {plannedImpr.length > 0 && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">예정 {plannedImpr.length}</span>
                            )}
                            {a.improvements.length === 0 && (
                              <span className="text-xs text-gray-300">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Link href={`/musculoskeletal/survey?assessmentId=${a.id}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline">
                            <ExternalLink className="w-3 h-3" />
                            상세
                          </Link>
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
