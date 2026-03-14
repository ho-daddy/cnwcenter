'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  HAZARD_CATEGORY_LABELS, HAZARD_CATEGORY_COLORS, getRiskLevel,
} from '@/lib/risk-assessment'
import ImprovementPanel from '@/components/risk-assessment/ImprovementPanel'
import { HelpTooltip } from '@/components/ui/help-tooltip'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhotoItem {
  id: string; photoPath: string; thumbnailPath?: string | null
}

interface HazardImprovement {
  id: string
  status: string
  riskScore: number
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  updateDate: string
}

interface Hazard {
  id: string
  cardId: string
  hazardCategory: string
  hazardFactor: string
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  additionalDetails: Record<string, number> | null
  riskScore: number
  improvementPlan: string | null
  improvements: HazardImprovement[]
  photos: PhotoItem[]
  card: {
    id: string
    year: number
    evaluationType: string
    organizationUnit: {
      id: string
      name: string
      parent: { id: string; name: string } | null
    }
    workplace: { id: string; name: string }
  }
}

interface Workplace { id: string; name: string }

type HazardStatus = 'none' | 'planned' | 'completed'
type FilterStatus = '' | HazardStatus

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHazardStatus(improvements: HazardImprovement[]): HazardStatus {
  if (improvements.length === 0) return 'none'
  if (improvements.some(i => i.status === 'COMPLETED')) return 'completed'
  return 'planned'
}

function getCurrentRiskScore(hazard: Pick<Hazard, 'riskScore' | 'improvements'>): { score: number; isPlan: boolean } {
  const completed = hazard.improvements.filter(i => i.status === 'COMPLETED')
  if (completed.length > 0) return { score: completed[0].riskScore, isPlan: false }
  const planned = hazard.improvements.filter(i => i.status === 'PLANNED')
  if (planned.length > 0) return { score: planned[0].riskScore, isPlan: true }
  return { score: hazard.riskScore, isPlan: false }
}

const STATUS_LABELS: Record<HazardStatus, string> = { none: '미실시', planned: '예정있음', completed: '완료됨' }
const STATUS_BADGE: Record<HazardStatus, string> = {
  none: 'bg-gray-100 text-gray-500',
  planned: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImprovementPage() {
  const currentYear = new Date().getFullYear()
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(String(currentYear))
  const [filterWorkplace, setFilterWorkplace] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('')
  const [searchText, setSearchText] = useState('')
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null)

  useEffect(() => {
    fetch('/api/workplaces').then(r => r.json()).then(d => setWorkplaces(d.workplaces || []))
  }, [])

  const fetchHazards = useCallback(() => {
    setIsLoading(true)
    const params = new URLSearchParams({ year: filterYear })
    if (filterWorkplace) params.set('workplaceId', filterWorkplace)
    fetch(`/api/risk-assessment/hazards?${params}`)
      .then(r => r.json())
      .then(d => { setHazards(d.hazards || []); setIsLoading(false) })
  }, [filterYear, filterWorkplace])

  useEffect(() => { fetchHazards() }, [fetchHazards])

  const handleHazardUpdate = useCallback((hazardId: string, improvements: { id: string; status: string }[]) => {
    setHazards(prev => prev.map(h => h.id === hazardId ? { ...h, improvements: improvements as HazardImprovement[] } : h))
  }, [])

  const filteredHazards = useMemo(() => {
    return hazards.filter(h => {
      if (filterStatus) {
        if (getHazardStatus(h.improvements) !== filterStatus) return false
      }
      if (searchText) {
        const q = searchText.toLowerCase()
        const unit = h.card.organizationUnit
        if (
          !h.hazardFactor.toLowerCase().includes(q) &&
          !unit.name.toLowerCase().includes(q) &&
          !(unit.parent?.name.toLowerCase().includes(q) ?? false)
        ) return false
      }
      return true
    })
  }, [hazards, filterStatus, searchText])

  const stats = useMemo(() => ({
    total: hazards.length,
    none: hazards.filter(h => getHazardStatus(h.improvements) === 'none').length,
    planned: hazards.filter(h => getHazardStatus(h.improvements) === 'planned').length,
    completed: hazards.filter(h => getHazardStatus(h.improvements) === 'completed').length,
  }), [hazards])

  const statCards: Array<{ label: string; value: number; key: FilterStatus; icon: React.ReactNode; color: string; ring: string }> = [
    { label: '전체 위험요인', value: stats.total, key: '', icon: null, color: 'text-gray-800', ring: '' },
    { label: '미실시', value: stats.none, key: 'none', icon: <AlertCircle className="w-4 h-4 text-gray-400" />, color: 'text-gray-600', ring: 'ring-gray-400' },
    { label: '예정있음', value: stats.planned, key: 'planned', icon: <Clock className="w-4 h-4 text-amber-500" />, color: 'text-amber-600', ring: 'ring-amber-400' },
    { label: '완료됨', value: stats.completed, key: 'completed', icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: 'text-green-600', ring: 'ring-green-400' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-1.5">개선관리 <HelpTooltip content="위험요인에 대한 개선계획을 수립하고 이행 현황을 관리합니다. 개선 완료 시 위험성 점수가 재산정됩니다." /></h1>
        <p className="text-sm text-gray-500 mt-0.5">유해위험요인 개선작업 현황 및 이력 관리</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(stat => (
          <Card
            key={stat.label}
            className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === stat.key && stat.key !== '' ? `ring-2 ${stat.ring}` : ''}`}
            onClick={() => setFilterStatus(filterStatus === stat.key ? '' : stat.key)}
          >
            <CardContent className="pt-4 pb-4">
              {stat.icon
                ? <div className="flex items-center gap-1.5 mb-1">{stat.icon}<p className="text-xs text-gray-500">{stat.label}</p></div>
                : <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              }
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          {[currentYear - 1, currentYear, currentYear + 1].map(y =>
            <option key={y} value={String(y)}>{y}년</option>
          )}
        </select>
        <select value={filterWorkplace} onChange={e => setFilterWorkplace(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">전체 사업장</option>
          {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
        </select>
        <input
          type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
          placeholder="위험요인 또는 평가단위 검색..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-56"
        />
        <span className="text-xs text-gray-400 ml-auto">{filteredHazards.length}건</span>
      </div>

      {/* Hazard Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
          ) : filteredHazards.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {hazards.length === 0 ? '등록된 유해위험요인이 없습니다.' : '필터 조건에 맞는 항목이 없습니다.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">평가단위</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">분류</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">유해위험요인</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">최초 위험성</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">개선 후</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">개선 상태</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">개선이력</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHazards.map((hazard, idx) => {
                  const status = getHazardStatus(hazard.improvements)
                  const { score, isPlan } = getCurrentRiskScore(hazard)
                  const initLevel = getRiskLevel(hazard.riskScore)
                  const currLevel = getRiskLevel(score)
                  const unit = hazard.card.organizationUnit
                  return (
                    <tr key={hazard.id} className={`hover:bg-gray-50 ${
                      status === 'completed' ? 'bg-green-50/40' :
                      status === 'planned' ? 'bg-amber-50/40' : ''
                    }`}>
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        {unit.parent && <p className="text-xs text-gray-400">{unit.parent.name}</p>}
                        <p className="text-gray-700 font-medium">{unit.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${HAZARD_CATEGORY_COLORS[hazard.hazardCategory]}`}>
                          {HAZARD_CATEGORY_LABELS[hazard.hazardCategory]}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-800 line-clamp-2">{hazard.hazardFactor}</p>
                        {hazard.improvementPlan && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">방안: {hazard.improvementPlan}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${initLevel.bg} ${initLevel.color}`}>
                          {hazard.riskScore}점
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {status === 'none' ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${currLevel.bg} ${currLevel.color}`}>
                              {score}점
                            </span>
                            {isPlan && <p className="text-xs text-amber-500 mt-0.5">예상</p>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[status]}`}>
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedHazard(hazard)}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          관리
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Slide-over Panel */}
      {selectedHazard && (
        <ImprovementPanel
          hazard={{
            id: selectedHazard.id,
            cardId: selectedHazard.cardId,
            hazardCategory: selectedHazard.hazardCategory,
            hazardFactor: selectedHazard.hazardFactor,
            severityScore: selectedHazard.severityScore,
            likelihoodScore: selectedHazard.likelihoodScore,
            additionalPoints: selectedHazard.additionalPoints,
            additionalDetails: selectedHazard.additionalDetails,
            riskScore: selectedHazard.riskScore,
            improvementPlan: selectedHazard.improvementPlan,
            photos: selectedHazard.photos,
            workplaceName: selectedHazard.card.workplace.name,
            unitName: selectedHazard.card.organizationUnit.name,
            parentUnitName: selectedHazard.card.organizationUnit.parent?.name,
            year: selectedHazard.card.year,
            evaluationType: selectedHazard.card.evaluationType,
          }}
          onClose={() => setSelectedHazard(null)}
          onUpdate={handleHazardUpdate}
          onDataChanged={fetchHazards}
          footerLink={{ href: '/risk-assessment/conduct', label: '평가 실시' }}
        />
      )}
    </div>
  )
}
