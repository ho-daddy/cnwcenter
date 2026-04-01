'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2, ChevronRight, ChevronDown, Plus, FolderTree,
  Search, X, AlertTriangle, Loader2, Edit2, Trash2, Check,
  FileText, ChevronLeft, Camera, CheckCircle, Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  EVALUATION_TYPE_LABELS, HAZARD_CATEGORY_LABELS, HAZARD_CATEGORY_COLORS,
  getRiskLevel, calcRiskScore, formatAdditionalDetails,
  SEVERITY_OPTIONS, LIKELIHOOD_OPTIONS, ADDITIONAL_SCORE_CONFIG,
} from '@/lib/risk-assessment'
import { PhotoUploader } from '@/components/ui/photo-uploader'
import ImprovementPanel from '@/components/risk-assessment/ImprovementPanel'
import type { ImprovementPanelHazard } from '@/components/risk-assessment/ImprovementPanel'
import { HelpTooltip } from '@/components/ui/help-tooltip'

// ───────── Types ─────────
interface Workplace { id: string; name: string }
interface OrganizationUnit {
  id: string; name: string; level: number
  isLeaf: boolean; parentId: string | null; children: OrganizationUnit[]
}
interface RiskCard {
  id: string; evaluationType: string
  evaluationReason: string | null; year: number
  workerName: string; evaluatorName: string; workDescription: string
  dailyWorkingHours: string | null; dailyProduction: string | null
  annualWorkingDays: string | null; workCycle: string | null
  organizationUnit: { id: string; name: string }
  workplace: { id: string; name: string }
  _count: { hazards: number }; updatedAt: string
}
interface HazardPhoto {
  id: string; photoPath: string; thumbnailPath?: string | null
}
interface RiskHazard {
  id: string; hazardCategory: string; hazardFactor: string
  severityScore: number; likelihoodScore: number; additionalPoints: number
  additionalDetails: Record<string, number> | null
  riskScore: number; improvementPlan: string | null
  chemicalProductId: string | null
  chemicalProduct: { id: string; name: string } | null
  improvements: { id: string; status: string }[]
  photos: HazardPhoto[]
}
interface ImprovementPhoto {
  id: string; photoPath: string; thumbnailPath?: string | null
}
interface ImprovementRecord {
  id: string; status: 'PLANNED' | 'COMPLETED'; updateDate: string
  improvementContent: string; responsiblePerson: string
  severityScore: number; likelihoodScore: number; additionalPoints: number
  riskScore: number; remarks: string | null; createdAt: string
  photos: ImprovementPhoto[]
}

interface WizardResult {
  hazardFactor: string; severityScore: number; likelihoodScore: number
  additionalPoints: number; additionalDetails?: Record<string, number>
  improvementPlan: string
  chemicalProductId?: string
  category?: string
}
interface ChemicalProduct {
  id: string; name: string; severityScore: number; manufacturer?: string | null
}

function buildOrganizationTree(flatUnits: OrganizationUnit[]): OrganizationUnit[] {
  const map = new Map<string, OrganizationUnit>()
  const roots: OrganizationUnit[] = []
  flatUnits.forEach(u => map.set(u.id, { ...u, children: [] }))
  flatUnits.forEach(u => {
    const node = map.get(u.id)!
    if (u.parentId && map.has(u.parentId)) map.get(u.parentId)!.children.push(node)
    else roots.push(node)
  })
  return roots
}

// ───────── Main Page ─────────
export default function ConductPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">로딩중...</div>}>
      <ConductPageInner />
    </Suspense>
  )
}

function ConductPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const deepLinkCardId = searchParams.get('cardId')
  const pendingCardIdRef = useRef<string | null>(deepLinkCardId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWorkplace, setSelectedWorkplace] = useState<Workplace | null>(null)
  const [orgUnits, setOrgUnits] = useState<OrganizationUnit[]>([])
  const [cards, setCards] = useState<RiskCard[]>([])
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnit | null>(null)
  const [selectedCard, setSelectedCard] = useState<RiskCard | null>(null)
  const [hazards, setHazards] = useState<RiskHazard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingHazards, setIsLoadingHazards] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'hazards'>('overview')
  const [wizardState, setWizardState] = useState<{
    open: boolean; category: string; editing: RiskHazard | null
  }>({ open: false, category: '', editing: null })
  const [improvementHazard, setImprovementHazard] = useState<RiskHazard | null>(null)

  useEffect(() => {
    fetch('/api/workplaces').then(r => r.json()).then(d => {
      const wps = d.workplaces || []
      setWorkplaces(wps)
      setIsLoading(false)
      // Deep-link: cardId가 URL에 있으면 해당 카드의 사업장을 자동 선택
      if (pendingCardIdRef.current) {
        fetch(`/api/risk-assessment/${pendingCardIdRef.current}`)
          .then(r => r.ok ? r.json() : null)
          .then(card => {
            if (!card) { pendingCardIdRef.current = null; return }
            const wp = wps.find((w: Workplace) => w.id === card.workplaceId)
            if (wp) {
              setSelectedWorkplace(wp)
            } else {
              pendingCardIdRef.current = null
            }
          })
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedWorkplace) {
      setOrgUnits([]); setCards([]); setSelectedUnit(null); setSelectedCard(null); return
    }
    fetch(`/api/workplaces/${selectedWorkplace.id}/organizations`)
      .then(r => r.json()).then(async d => {
        const org = d.organization
        if (org) {
          const ud = await fetch(`/api/workplaces/${selectedWorkplace.id}/organizations/${org.id}`).then(r => r.json())
          setOrgUnits(buildOrganizationTree(ud.flatUnits || []))
        } else { setOrgUnits([]) }
      })
    fetch(`/api/risk-assessment?workplaceId=${selectedWorkplace.id}`)
      .then(r => r.json()).then(d => {
        const loadedCards = d.cards || []
        setCards(loadedCards)
        // Deep-link: 카드 로드 후 대기 중인 cardId 자동 선택
        if (pendingCardIdRef.current) {
          const target = loadedCards.find((c: RiskCard) => c.id === pendingCardIdRef.current)
          if (target) {
            setSelectedCard(target)
            setActiveTab('hazards')
          }
          pendingCardIdRef.current = null
        }
      })
  }, [selectedWorkplace])

  useEffect(() => {
    if (!selectedCard) { setHazards([]); return }
    setIsLoadingHazards(true)
    fetch(`/api/risk-assessment/${selectedCard.id}/hazards`)
      .then(r => r.json()).then(d => { setHazards(d.hazards || []); setIsLoadingHazards(false) })
  }, [selectedCard?.id])

  useEffect(() => {
    if (selectedCard && bottomRef.current) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [selectedCard?.id])

  const refreshCards = useCallback(async () => {
    if (!selectedWorkplace) return
    const d = await fetch(`/api/risk-assessment?workplaceId=${selectedWorkplace.id}`).then(r => r.json())
    setCards(d.cards || [])
  }, [selectedWorkplace])

  const handleSelectCard = useCallback((card: RiskCard) => {
    setSelectedCard(card); setActiveTab('overview')
  }, [])

  const handleCreateCard = useCallback(async (
    unit: OrganizationUnit,
    data: { year: number; evaluationType: string; evaluationReason: string;
      workerName: string; evaluatorName: string; workDescription: string }
  ): Promise<RiskCard | null> => {
    if (!selectedWorkplace) return null
    const res = await fetch('/api/risk-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workplaceId: selectedWorkplace.id, organizationUnitId: unit.id, ...data }),
    })
    if (res.ok) {
      const newCard = await res.json()
      await refreshCards()
      setSelectedCard(newCard); setActiveTab('overview')
      return newCard
    }
    return null
  }, [selectedWorkplace, refreshCards])

  const handleCardUpdated = useCallback((updated: RiskCard) => {
    setSelectedCard(updated)
    setCards(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
  }, [])

  const handleWizardComplete = useCallback(async (result: WizardResult) => {
    if (!selectedCard) return
    const { editing } = wizardState
    const category = result.category || wizardState.category
    const body = {
      hazardCategory: category,
      hazardFactor: result.hazardFactor,
      severityScore: result.severityScore,
      likelihoodScore: result.likelihoodScore,
      additionalPoints: result.additionalPoints,
      additionalDetails: result.additionalDetails || null,
      improvementPlan: result.improvementPlan || null,
      chemicalProductId: result.chemicalProductId || null,
    }
    if (editing) {
      const res = await fetch(`/api/risk-assessment/${selectedCard.id}/hazards/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setHazards(prev => prev.map(h => h.id === editing.id ? { ...h, ...updated } : h))
      }
    } else {
      const res = await fetch(`/api/risk-assessment/${selectedCard.id}/hazards`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const newHazard = await res.json()
        setHazards(prev => [...prev, { ...newHazard, improvements: [], photos: [] }])
        setSelectedCard(prev => prev ? { ...prev, _count: { hazards: (prev._count?.hazards ?? 0) + 1 } } : prev)
        setCards(prev => prev.map(c => c.id === selectedCard.id
          ? { ...c, _count: { hazards: (c._count?.hazards ?? 0) + 1 } } : c))
      }
    }
    setWizardState({ open: false, category: '', editing: null })
  }, [selectedCard, wizardState])

  const handleDeleteHazard = useCallback(async (hazardId: string) => {
    if (!selectedCard || !confirm('이 유해위험요인을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/risk-assessment/${selectedCard.id}/hazards/${hazardId}`, { method: 'DELETE' })
    if (res.ok) {
      setHazards(prev => prev.filter(h => h.id !== hazardId))
      setSelectedCard(prev => prev ? { ...prev, _count: { hazards: Math.max(0, (prev._count?.hazards ?? 0) - 1) } } : prev)
      setCards(prev => prev.map(c => c.id === selectedCard.id
        ? { ...c, _count: { hazards: Math.max(0, (c._count?.hazards ?? 0) - 1) } } : c))
    }
  }, [selectedCard])

  const handleDeleteCard = useCallback(async () => {
    if (!selectedCard) return
    if (!confirm('이 평가와 포함된 모든 유해위험요인이 삭제됩니다. 계속하시겠습니까?')) return
    try {
      const res = await fetch(`/api/risk-assessment/${selectedCard.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/risk-assessment')
      } else {
        const data = await res.json()
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }, [selectedCard, router])

  const handleImprovementUpdate = useCallback((hazardId: string, improvements: { id: string; status: string }[]) => {
    setHazards(prev => prev.map(h => h.id === hazardId ? { ...h, improvements } : h))
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-1.5">평가 실시 <HelpTooltip content="사업장 → 조직 단위 → 평가카드를 선택하여 위험요인을 등록하고 점수를 산정합니다." /></h1>
        <p className="text-sm text-gray-500 mt-1">사업장과 평가단위를 선택하여 위험성평가를 진행하세요.</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Workplace list */}
        <Card className="col-span-12 lg:col-span-2" data-tutorial="ra-workplace-list">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" />사업장</CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[calc(100vh-220px)] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500 text-sm">로딩중...</div>
            ) : workplaces.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">등록된 사업장이 없습니다.</div>
            ) : (
              <div className="space-y-1">
                {workplaces.map(wp => (
                  <button key={wp.id}
                    onClick={() => { setSelectedWorkplace(wp); setSelectedUnit(null); setSelectedCard(null) }}
                    className={`w-full p-2 rounded text-left text-sm transition-colors ${selectedWorkplace?.id === wp.id ? 'bg-blue-100 border border-blue-400' : 'hover:bg-gray-50 border border-transparent'}`}
                  >
                    <p className="font-medium truncate">{wp.name}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Org tree */}
        <Card className="col-span-12 lg:col-span-3" data-tutorial="ra-org-tree">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderTree className="w-4 h-4" />조직도
                {selectedWorkplace && <span className="text-gray-500 font-normal">- {selectedWorkplace.name}</span>}
              </CardTitle>
            </div>
            {selectedWorkplace && orgUnits.length > 0 && (
              <div className="mt-2">
                <div className="relative max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="조직/공정 검색..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-8 py-1 border rounded text-sm" />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-2 max-h-[calc(100vh-220px)] overflow-y-auto">
            {!selectedWorkplace ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-2" /><p>사업장을 선택하세요.</p>
              </div>
            ) : orgUnits.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <FolderTree className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p>조직도가 없습니다. 사업장 관리에서 조직도를 먼저 등록해 주세요.</p>
              </div>
            ) : (
              <OrgTreeView
                units={orgUnits} cardCounts={cards.reduce<Record<string, number>>((acc, c) => { acc[c.organizationUnit.id] = (acc[c.organizationUnit.id] || 0) + 1; return acc }, {})}
                selectedUnit={selectedUnit} searchTerm={searchTerm}
                onSelectUnit={setSelectedUnit}
              />
            )}
          </CardContent>
        </Card>

        {/* Card list for selected unit */}
        <Card className="col-span-12 lg:col-span-7" data-tutorial="ra-card-section">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />평가 목록
              {selectedUnit?.isLeaf && <span className="text-gray-500 font-normal">- {selectedUnit.name}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[calc(100vh-220px)] overflow-y-auto">
            {!selectedUnit ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <FolderTree className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p>조직도에서 단위를 선택하세요.</p>
              </div>
            ) : !selectedUnit.isLeaf ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <FolderTree className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p>하위 단위를 선택하세요.</p>
              </div>
            ) : (
              <CardPanel unit={selectedUnit}
                unitCards={cards.filter(c => c.organizationUnit.id === selectedUnit.id)}
                selectedCardId={selectedCard?.id}
                onSelectCard={handleSelectCard}
                onCreateCard={handleCreateCard}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom detail panel */}
      {selectedCard && (
        <div ref={bottomRef} data-tutorial="ra-hazard-section">
          <Card>
            <CardHeader className="py-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <div>
                    <CardTitle className="text-base">{selectedCard.organizationUnit.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedCard.year}년 · {EVALUATION_TYPE_LABELS[selectedCard.evaluationType]}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedCard(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex gap-0 mt-3 border-b -mb-3">
                {[
                  { key: 'overview', label: '개요/관리카드' },
                  { key: 'hazards', label: `유해위험요인 (${selectedCard._count?.hazards ?? 0})` },
                ].map(tab => (
                  <button key={tab.key}
                    onClick={() => setActiveTab(tab.key as 'overview' | 'hazards')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >{tab.label}</button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {activeTab === 'overview' ? (
                <CardOverviewTab card={selectedCard} onUpdate={handleCardUpdated} onDeleteCard={handleDeleteCard} />
              ) : (
                <HazardListTab
                  hazards={hazards} isLoading={isLoadingHazards}
                  cardId={selectedCard.id}
                  onAdd={() => setWizardState({ open: true, category: '', editing: null })}
                  onEdit={h => setWizardState({ open: true, category: h.hazardCategory, editing: h })}
                  onDelete={handleDeleteHazard}
                  onHazardsChange={setHazards}
                  onImproveClick={setImprovementHazard}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wizard modal */}
      {wizardState.open && selectedCard && (
        <HazardWizardModal
          initialCategory={wizardState.category}
          editingHazard={wizardState.editing}
          workplaceId={selectedCard.workplace.id}
          organizationUnitId={selectedCard.organizationUnit.id}
          onClose={() => setWizardState({ open: false, category: '', editing: null })}
          onComplete={handleWizardComplete}
        />
      )}

      {/* Improvement Panel */}
      {improvementHazard && selectedCard && (
        <ImprovementPanel
          hazard={{
            id: improvementHazard.id,
            cardId: selectedCard.id,
            hazardCategory: improvementHazard.hazardCategory,
            hazardFactor: improvementHazard.hazardFactor,
            severityScore: improvementHazard.severityScore,
            likelihoodScore: improvementHazard.likelihoodScore,
            additionalPoints: improvementHazard.additionalPoints,
            additionalDetails: improvementHazard.additionalDetails,
            riskScore: improvementHazard.riskScore,
            improvementPlan: improvementHazard.improvementPlan,
            photos: improvementHazard.photos,
            workplaceName: selectedCard.workplace.name,
            unitName: selectedCard.organizationUnit.name,
            year: selectedCard.year,
            evaluationType: selectedCard.evaluationType,
          } satisfies ImprovementPanelHazard}
          onClose={() => setImprovementHazard(null)}
          onUpdate={(hazardId, improvements) => handleImprovementUpdate(hazardId, improvements.map(i => ({ id: i.id, status: i.status })))}
        />
      )}
    </div>
  )
}

// ───────── OrgTreeView ─────────
function OrgTreeView({
  units, cardCounts, selectedUnit, searchTerm,
  onSelectUnit,
}: {
  units: OrganizationUnit[]; cardCounts: Record<string, number>
  selectedUnit: OrganizationUnit | null
  searchTerm: string
  onSelectUnit: (u: OrganizationUnit) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  useEffect(() => {
    const ids: string[] = []
    const traverse = (list: OrganizationUnit[]) => {
      list.forEach(u => { if (u.children.length > 0) { ids.push(u.id); traverse(u.children) } })
    }
    traverse(units)
    setExpanded(new Set())
  }, [units])

  const getAllExpandableIds = (list: OrganizationUnit[]): string[] => {
    const ids: string[] = []
    const walk = (items: OrganizationUnit[]) => {
      items.forEach(u => { if (u.children.length > 0) { ids.push(u.id); walk(u.children) } })
    }
    walk(list)
    return ids
  }
  const expandAll = () => setExpanded(new Set(getAllExpandableIds(units)))
  const collapseAll = () => setExpanded(new Set())
  const hasExpandableUnits = units.some(u => u.children.length > 0)

  const toggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const matchSearch = (u: OrganizationUnit): boolean => {
    if (!searchTerm) return true
    const t = searchTerm.toLowerCase()
    return u.name.toLowerCase().includes(t) || u.children.some(matchSearch)
  }
  const renderUnit = (unit: OrganizationUnit, depth = 0): React.ReactNode => {
    if (!matchSearch(unit)) return null
    const isExpanded = expanded.has(unit.id)
    const hasChildren = unit.children.length > 0
    const isSelected = selectedUnit?.id === unit.id
    const count = unit.isLeaf ? (cardCounts[unit.id] || 0) : 0

    return (
      <div key={unit.id}>
        <div
          className={`flex items-center gap-1 py-1.5 rounded cursor-pointer text-sm transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : unit.isLeaf ? 'hover:bg-green-50' : 'hover:bg-gray-50'}`}
          style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: '8px' }}
          onClick={() => onSelectUnit(unit)}
        >
          {hasChildren ? (
            <button onClick={e => toggle(unit.id, e)} className="p-0.5 hover:bg-gray-200 rounded">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
          ) : <span className="w-5" />}
          <span className={`flex-1 truncate font-medium ${unit.isLeaf ? 'text-green-700' : ''}`}>{unit.name}</span>
          {unit.isLeaf && (
            count > 0
              ? <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{count}건</span>
              : <span className="text-xs text-gray-400">평가없음</span>
          )}
        </div>
        {hasChildren && isExpanded && unit.children.map(child => renderUnit(child, depth + 1))}
      </div>
    )
  }
  return (
    <div>
      {hasExpandableUnits && (
        <div className="flex justify-end gap-1 mb-1">
          <button onClick={expandAll} className="text-xs text-gray-500 hover:text-blue-600 px-1.5 py-0.5">전체 펼치기</button>
          <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-blue-600 px-1.5 py-0.5">전체 접기</button>
        </div>
      )}
      <div className="space-y-0.5">{units.map(u => renderUnit(u))}</div>
    </div>
  )
}

// ───────── CardPanel (3rd column) ─────────
function CardPanel({
  unit, unitCards, selectedCardId, onSelectCard, onCreateCard,
}: {
  unit: OrganizationUnit; unitCards: RiskCard[]; selectedCardId?: string
  onSelectCard: (c: RiskCard) => void
  onCreateCard: (unit: OrganizationUnit, data: {
    year: number; evaluationType: string; evaluationReason: string;
    workerName: string; evaluatorName: string; workDescription: string
  }) => Promise<RiskCard | null>
}) {
  const currentYear = new Date().getFullYear()
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    year: currentYear, evaluationType: 'REGULAR', evaluationReason: '',
    workerName: '', evaluatorName: '', workDescription: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await onCreateCard(unit, form)
    setIsSubmitting(false)
    if (result) { setShowForm(false); setForm({ year: currentYear, evaluationType: 'REGULAR', evaluationReason: '', workerName: '', evaluatorName: '', workDescription: '' }) }
  }

  return (
    <div className="space-y-1">
      {unitCards.map(card => (
        <button key={card.id}
          onClick={() => onSelectCard(card)}
          className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors border ${selectedCardId === card.id ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-200 text-gray-700'}`}
        >
          <span>{card.year}년 {EVALUATION_TYPE_LABELS[card.evaluationType]}</span>
          <span className="text-xs text-gray-500">{card._count.hazards}개 위험요인</span>
        </button>
      ))}
      {!showForm ? (
        <button onClick={() => setShowForm(true)}
          data-tutorial="ra-add-card"
          className="w-full flex items-center justify-center gap-1 p-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">
          <Plus className="w-3.5 h-3.5" />새 평가 추가
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-3 bg-blue-50 rounded border border-blue-200 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}
              className="text-xs px-2 py-1.5 border rounded bg-white">
              {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={form.evaluationType} onChange={e => setForm(f => ({ ...f, evaluationType: e.target.value }))}
              className="text-xs px-2 py-1.5 border rounded bg-white">
              <option value="REGULAR">정기조사</option>
              <option value="OCCASIONAL">수시조사</option>
            </select>
          </div>
          {form.evaluationType === 'OCCASIONAL' && (
            <input type="text" placeholder="수시조사 사유 *" value={form.evaluationReason}
              onChange={e => setForm(f => ({ ...f, evaluationReason: e.target.value }))}
              className="w-full text-xs px-2 py-1.5 border rounded bg-white" required />
          )}
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="작업자 성명 *" value={form.workerName}
              onChange={e => setForm(f => ({ ...f, workerName: e.target.value }))}
              className="text-xs px-2 py-1.5 border rounded bg-white" required />
            <input type="text" placeholder="평가자 성명 *" value={form.evaluatorName}
              onChange={e => setForm(f => ({ ...f, evaluatorName: e.target.value }))}
              className="text-xs px-2 py-1.5 border rounded bg-white" required />
          </div>
          <textarea placeholder="작업 내용 *" value={form.workDescription}
            onChange={e => setForm(f => ({ ...f, workDescription: e.target.value }))}
            rows={2} className="w-full text-xs px-2 py-1.5 border rounded bg-white resize-none" required />
          <div className="flex gap-1">
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? '생성 중...' : '평가카드 생성'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50">취소</button>
          </div>
        </form>
      )}
    </div>
  )
}

// ───────── CardOverviewTab ─────────
function CardOverviewTab({ card, onUpdate, onDeleteCard }: { card: RiskCard; onUpdate: (c: RiskCard) => void; onDeleteCard: () => void }) {
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    evaluationType: card.evaluationType,
    evaluationReason: card.evaluationReason || '',
    workerName: card.workerName,
    evaluatorName: card.evaluatorName,
    dailyWorkingHours: card.dailyWorkingHours || '',
    dailyProduction: card.dailyProduction || '',
    annualWorkingDays: card.annualWorkingDays || '',
    workCycle: card.workCycle || '',
    workDescription: card.workDescription,
  })

  useEffect(() => {
    setForm({
      evaluationType: card.evaluationType,
      evaluationReason: card.evaluationReason || '',
      workerName: card.workerName,
      evaluatorName: card.evaluatorName,
      dailyWorkingHours: card.dailyWorkingHours || '',
      dailyProduction: card.dailyProduction || '',
      annualWorkingDays: card.annualWorkingDays || '',
      workCycle: card.workCycle || '',
      workDescription: card.workDescription,
    })
  }, [card.id])

  const handleSave = async () => {
    setIsSaving(true)
    const res = await fetch(`/api/risk-assessment/${card.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdate({ ...card, ...updated })
      setEditing(false)
    }
    setIsSaving(false)
  }

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value || <span className="text-gray-400">-</span>}</p>
    </div>
  )

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
            <Edit2 className="w-3.5 h-3.5" />수정
          </button>
          <button onClick={onDeleteCard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 rounded text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" />삭제
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="평가연도" value={`${card.year}년`} />
          <Field label="조사구분" value={EVALUATION_TYPE_LABELS[card.evaluationType]} />
          <Field label="평가단위" value={card.organizationUnit.name} />
        </div>
        {card.evaluationReason && (
          <Field label="수시조사 사유" value={card.evaluationReason} />
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="작업자 성명" value={card.workerName} />
          <Field label="평가자 성명" value={card.evaluatorName} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="1일 작업시간" value={card.dailyWorkingHours ? `${card.dailyWorkingHours}시간` : ''} />
          <Field label="1일 생산량" value={card.dailyProduction || ''} />
          <Field label="연간 작업일수" value={card.annualWorkingDays ? `${card.annualWorkingDays}일` : ''} />
          <Field label="작업주기" value={card.workCycle || ''} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">작업 내용</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{card.workDescription}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">조사구분</label>
          <select value={form.evaluationType} onChange={e => setForm(f => ({ ...f, evaluationType: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5">
            <option value="REGULAR">정기조사</option>
            <option value="OCCASIONAL">수시조사</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">작업자 성명</label>
          <input value={form.workerName} onChange={e => setForm(f => ({ ...f, workerName: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">평가자 성명</label>
          <input value={form.evaluatorName} onChange={e => setForm(f => ({ ...f, evaluatorName: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5" />
        </div>
      </div>
      {form.evaluationType === 'OCCASIONAL' && (
        <div>
          <label className="text-xs text-gray-500 block mb-1">수시조사 사유</label>
          <input value={form.evaluationReason} onChange={e => setForm(f => ({ ...f, evaluationReason: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5" />
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">1일 작업시간 (h)</label>
          <input type="number" value={form.dailyWorkingHours} onChange={e => setForm(f => ({ ...f, dailyWorkingHours: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5" placeholder="예: 8" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">1일 생산량</label>
          <input value={form.dailyProduction} onChange={e => setForm(f => ({ ...f, dailyProduction: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5" placeholder="예: 100개" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">연간 작업일수 (일)</label>
          <input type="number" value={form.annualWorkingDays} onChange={e => setForm(f => ({ ...f, annualWorkingDays: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5" placeholder="예: 250" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">작업주기</label>
          <input value={form.workCycle} onChange={e => setForm(f => ({ ...f, workCycle: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5" placeholder="예: 매일, 주3회" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">작업 내용</label>
        <textarea value={form.workDescription} onChange={e => setForm(f => ({ ...f, workDescription: e.target.value }))}
          rows={3} className="w-full text-sm border rounded px-2 py-1.5 resize-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={isSaving}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {isSaving ? '저장 중...' : '저장'}
        </button>
        <button onClick={() => setEditing(false)} className="px-4 py-1.5 text-sm border rounded hover:bg-gray-50">취소</button>
      </div>
    </div>
  )
}

// ───────── HazardListTab ─────────
const CATEGORY_BADGE: Record<string, string> = {
  ACCIDENT: 'bg-red-100 text-red-700',
  MUSCULOSKELETAL: 'bg-amber-100 text-amber-700',
  CHEMICAL: 'bg-purple-100 text-purple-700',
  NOISE: 'bg-blue-100 text-blue-700',
  ABSOLUTE: 'bg-gray-900 text-white',
  OTHER: 'bg-gray-100 text-gray-700',
}

function HazardListTab({
  hazards, isLoading, onAdd, onEdit, onDelete, cardId, onHazardsChange, onImproveClick,
}: {
  hazards: RiskHazard[]; isLoading: boolean; cardId: string
  onAdd: () => void
  onEdit: (h: RiskHazard) => void
  onDelete: (id: string) => void
  onHazardsChange: (updater: (prev: RiskHazard[]) => RiskHazard[]) => void
  onImproveClick: (h: RiskHazard) => void
}) {
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null)

  const handlePhotoUploaded = (hazardId: string, photo: HazardPhoto) => {
    onHazardsChange(prev => prev.map(h =>
      h.id === hazardId ? { ...h, photos: [...h.photos, photo] } : h
    ))
  }

  const handleDeletePhoto = async (hazardId: string, photoId: string) => {
    const res = await fetch(`/api/risk-assessment/${cardId}/hazards/${hazardId}/photos/${photoId}`, { method: 'DELETE' })
    if (res.ok) {
      onHazardsChange(prev => prev.map(h =>
        h.id === hazardId ? { ...h, photos: h.photos.filter(p => p.id !== photoId) } : h
      ))
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">총 {hazards.length}개의 유해위험요인</p>
        <button onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          <Plus className="w-4 h-4" />위험요인 추가
        </button>
      </div>

      {hazards.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm">등록된 유해위험요인이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">위험요인 추가 버튼을 눌러 등록하세요.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-24">분류</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500" style={{width: '45%'}}>유해위험요인</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 w-16">사진</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 w-24">위험성</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500" style={{width: '30%'}}>개선방안</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 w-20">개선현황</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 w-20">관리</th>
              </tr>
            </thead>
            <tbody>
              {hazards.map(h => {
                const level = getRiskLevel(h.riskScore)
                const plannedCnt = h.improvements.filter(i => i.status === 'PLANNED').length
                const completedCnt = h.improvements.filter(i => i.status === 'COMPLETED').length
                const isPhotoExpanded = expandedPhotoId === h.id
                return (
                  <React.Fragment key={h.id}>
                  <tr className="border-b hover:bg-gray-50 group">
                    <td className="py-2 px-3">
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_BADGE[h.hazardCategory]}`}>
                        {HAZARD_CATEGORY_LABELS[h.hazardCategory]}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <p className="text-sm text-gray-900">{h.hazardFactor}</p>
                      {h.chemicalProduct && (
                        <p className="text-xs text-purple-600 mt-0.5">{h.chemicalProduct.name}</p>
                      )}
                    </td>
                    {/* 사진 열 */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => setExpandedPhotoId(isPhotoExpanded ? null : h.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors mx-auto ${isPhotoExpanded ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-100 hover:text-blue-700 text-gray-500'}`}
                        title="사진 관리"
                      >
                        <Camera className="w-5 h-5" />
                        {h.photos.length > 0 && <span className="font-medium">{h.photos.length}</span>}
                      </button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${level.bg} ${level.color}`}>
                        {h.riskScore}점
                      </span>
                      <p className={`text-xs mt-0.5 ${level.color}`}>{level.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {h.hazardCategory === 'ABSOLUTE' ? '절대기준' : `${h.severityScore}×${h.likelihoodScore}+${h.additionalPoints}`}
                      </p>
                      {h.additionalDetails && h.additionalPoints > 0 && (
                        <p className="text-xs text-blue-500 mt-0.5">
                          {formatAdditionalDetails(h.hazardCategory, h.additionalDetails).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <p className="text-sm text-gray-600 line-clamp-2">{h.improvementPlan || <span className="text-gray-300">-</span>}</p>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => onImproveClick(h)}
                        className="inline-flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity cursor-pointer"
                        title="개선관리 패널 열기"
                      >
                        {completedCnt > 0 && (
                          <span className="inline-block text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">완료 {completedCnt}</span>
                        )}
                        {plannedCnt > 0 && (
                          <span className="inline-block text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">예정 {plannedCnt}</span>
                        )}
                        {h.improvements.length === 0 && <span className="text-xs text-gray-400 underline">관리</span>}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onEdit(h)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(h.id)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isPhotoExpanded && (
                    <tr className="border-b bg-gray-50">
                      <td colSpan={7} className="px-3 py-3">
                        <div onClick={e => e.stopPropagation()}>
                          <PhotoUploader
                            mode="immediate"
                            uploadUrl={`/api/risk-assessment/${cardId}/hazards/${h.id}/photos`}
                            existingPhotos={h.photos}
                            onUploaded={(photo) => handlePhotoUploaded(h.id, photo)}
                            onDeleteExisting={(photoId) => handleDeletePhoto(h.id, photoId)}
                            maxPhotos={10}
                            maxFileSize={10 * 1024 * 1024}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ───────── HazardWizardModal ─────────
const CATEGORIES = [
  { key: 'ACCIDENT', label: '사고성재해', color: 'bg-red-100 text-red-700 border-red-200', desc: '기계·설비, 물리적 위험' },
  { key: 'MUSCULOSKELETAL', label: '근골격계', color: 'bg-amber-100 text-amber-700 border-amber-200', desc: '반복작업, 부적절한 자세' },
  { key: 'CHEMICAL', label: '유해화학물질', color: 'bg-purple-100 text-purple-700 border-purple-200', desc: '화학물질 취급·노출' },
  { key: 'NOISE', label: '소음', color: 'bg-blue-100 text-blue-700 border-blue-200', desc: '소음 발생 작업환경' },
  { key: 'ABSOLUTE', label: '절대기준', color: 'bg-gray-900 text-white border-gray-700', desc: '중대한 법령 위반·위험' },
  { key: 'OTHER', label: '기타위험', color: 'bg-gray-100 text-gray-700 border-gray-200', desc: '기타 유해위험요인' },
]

function HazardWizardModal({
  initialCategory, editingHazard, workplaceId, organizationUnitId, onClose, onComplete,
}: {
  initialCategory: string; editingHazard: RiskHazard | null
  workplaceId: string; organizationUnitId: string
  onClose: () => void
  onComplete: (result: WizardResult) => Promise<void>
}) {
  const [category, setCategory] = useState(initialCategory)
  const [isSaving, setIsSaving] = useState(false)

  const handleComplete = async (result: WizardResult) => {
    setIsSaving(true)
    await onComplete({ ...result, category })
    setIsSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">
            {editingHazard ? '유해위험요인 수정' : '유해위험요인 추가'}
            {category && <span className="ml-2 text-sm font-normal text-gray-500">— {HAZARD_CATEGORY_LABELS[category]}</span>}
            {!category && <HelpTooltip content="작업 중 발생할 수 있는 위험요인의 유형을 선택하세요. 유형에 따라 점수 산정 기준이 다릅니다." className="ml-1" />}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-4">
          {!category ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">유해위험요인의 분류를 선택하세요.</p>
              {CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setCategory(cat.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left hover:opacity-90 transition-opacity ${cat.color}`}>
                  <div className="flex-1">
                    <p className="font-medium">{cat.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{cat.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>
          ) : category === 'ACCIDENT' ? (
            <AccidentWizard initialData={editingHazard} isSaving={isSaving}
              onBack={!editingHazard ? () => setCategory('') : undefined}
              onComplete={handleComplete} />
          ) : category === 'CHEMICAL' ? (
            <ChemicalWizard initialData={editingHazard} workplaceId={workplaceId} isSaving={isSaving}
              onBack={!editingHazard ? () => setCategory('') : undefined}
              onComplete={handleComplete} />
          ) : category === 'MUSCULOSKELETAL' ? (
            <MusculoskeletalWizard initialData={editingHazard} isSaving={isSaving}
              onBack={!editingHazard ? () => setCategory('') : undefined}
              onComplete={handleComplete} />
          ) : category === 'NOISE' ? (
            <NoiseWizard initialData={editingHazard} isSaving={isSaving}
              organizationUnitId={organizationUnitId}
              onBack={!editingHazard ? () => setCategory('') : undefined}
              onComplete={handleComplete} />
          ) : category === 'ABSOLUTE' ? (
            <AbsoluteWizard initialData={editingHazard} isSaving={isSaving}
              onBack={!editingHazard ? () => setCategory('') : undefined}
              onComplete={handleComplete} />
          ) : (
            <OtherWizard initialData={editingHazard} isSaving={isSaving}
              onBack={!editingHazard ? () => setCategory('') : undefined}
              onComplete={handleComplete} />
          )}
        </div>
      </div>
    </div>
  )
}

// ───────── Shared wizard components ─────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= current ? 'bg-blue-500' : 'bg-gray-200'}`} />
      ))}
      <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{current + 1}/{total}</span>
    </div>
  )
}

function OptionButton({ label, desc, selected, onClick }: {
  label: string; desc?: string; selected: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
      <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      <div>
        <p className={`text-sm font-medium ${selected ? 'text-blue-700' : 'text-gray-700'}`}>{label}</p>
        {desc && <p className={`text-xs mt-0.5 ${selected ? 'text-blue-600' : 'text-gray-500'}`}>{desc}</p>}
      </div>
    </button>
  )
}

function YesNoButton({ label, value, selected, onClick }: {
  label: string; value: number; selected: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
      {selected && <Check className="w-3.5 h-3.5 inline mr-1" />}{label}
    </button>
  )
}

function WizardNav({ step, total, onBack, onNext, onSubmit, canNext, isSaving }: {
  step: number; total: number
  onBack?: () => void; onNext?: () => void; onSubmit?: () => void
  canNext: boolean; isSaving?: boolean
}) {
  const isLast = step === total - 1
  return (
    <div className="flex justify-between items-center mt-4 pt-4 border-t">
      <button type="button" onClick={onBack} disabled={!onBack}
        className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-30">
        <ChevronLeft className="w-4 h-4" />이전
      </button>
      {isLast ? (
        <button type="button" onClick={onSubmit} disabled={!canNext || isSaving}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {isSaving ? <Loader2 className="w-4 h-4 inline animate-spin mr-1" /> : null}저장
        </button>
      ) : (
        <button type="button" onClick={onNext} disabled={!canNext}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          다음<ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function ScorePreview({ severity, likelihood, additional, category }: {
  severity: number; likelihood: number; additional: number; category: string
}) {
  const score = category === 'ABSOLUTE' ? 16 : severity * likelihood + additional
  const level = getRiskLevel(score)
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
      <p className="text-sm font-medium text-gray-700 flex items-center gap-1">위험성 점수 계산 결과 <HelpTooltip content="16점 이상: 매우높음\n11~15점: 높음\n6~10점: 보통\n5점 이하: 낮음" side="right" /></p>
      {category !== 'ABSOLUTE' ? (
        <p className="text-xs text-gray-500">중대성({severity}) × 가능성({likelihood}) + 추가({additional}) = <strong>{score}점</strong></p>
      ) : (
        <p className="text-xs text-gray-500">절대기준 (항상 <strong>16점</strong>)</p>
      )}
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${level.bg} ${level.color}`}>
        {score}점 — {level.label}
      </div>
    </div>
  )
}

// ───────── AccidentWizard ─────────
const ACCIDENT_SEVERITY = [
  { v: 1, label: '1점 — 경미한 부상', desc: '휴업 또는 치료 불필요' },
  { v: 2, label: '2점 — 경상', desc: '14일 이내의 휴업 발생' },
  { v: 3, label: '3점 — 중상', desc: '15일 ~ 30일의 휴업 발생' },
  { v: 4, label: '4점 — 중상 이상', desc: '한달 이상의 휴업 발생' },
  { v: 5, label: '5점 — 중대재해 / 사망', desc: '사망 또는 영구 장해' },
]
const ACCIDENT_LIKELIHOOD = [
  { v: 1, label: '1점', desc: '발생 가능성 낮고, 해당 작업에 월 10일 미만 종사' },
  { v: 2, label: '2점', desc: '발생 가능성 낮고, 해당 작업에 월 10일 이상 종사' },
  { v: 3, label: '3점', desc: '발생 가능성 보통이고, 해당 작업에 월 10일 미만 종사' },
  { v: 4, label: '4점', desc: '발생 가능성 보통이고, 해당 작업에 월 10일 이상 종사' },
  { v: 5, label: '5점', desc: '발생 가능성 높음' },
]

function AccidentWizard({ initialData, isSaving, onBack, onComplete }: {
  initialData: RiskHazard | null; isSaving: boolean
  onBack?: () => void; onComplete: (r: WizardResult) => void
}) {
  const [step, setStep] = useState(0)
  const [hazardFactor, setHazardFactor] = useState(initialData?.hazardFactor || '')
  const [severity, setSeverity] = useState(initialData?.severityScore || 0)
  const [likelihood, setLikelihood] = useState(initialData?.likelihoodScore || 0)
  const [judgement, setJudgement] = useState(initialData?.additionalDetails?.accidentJudgement ?? (initialData ? 0 : -1))
  const [experience, setExperience] = useState(initialData?.additionalDetails?.accidentExperience ?? (initialData ? 0 : -1))
  const [improvementPlan, setImprovementPlan] = useState(initialData?.improvementPlan || '')
  const TOTAL = 6

  const steps = [
    // Step 0: 유해위험요인
    <div key="0" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">어떤 유해위험요인이 있나요?</p>
      <textarea value={hazardFactor} onChange={e => setHazardFactor(e.target.value)}
        placeholder="예: 프레스 작업 중 손 끼임 위험" rows={3}
        className="w-full text-sm border rounded px-3 py-2 resize-none" />
    </div>,
    // Step 1: 중대성
    <div key="1" className="space-y-2">
      <p className="text-sm font-medium text-gray-700">사고 발생 시 중대성(피해 규모)은?</p>
      {ACCIDENT_SEVERITY.map(o => (
        <OptionButton key={o.v} label={o.label} desc={o.desc} selected={severity === o.v} onClick={() => setSeverity(o.v)} />
      ))}
    </div>,
    // Step 2: 가능성
    <div key="2" className="space-y-2">
      <p className="text-sm font-medium text-gray-700">사고 발생 가능성은?</p>
      {ACCIDENT_LIKELIHOOD.map(o => (
        <OptionButton key={o.v} label={o.label} desc={o.desc} selected={likelihood === o.v} onClick={() => setLikelihood(o.v)} />
      ))}
    </div>,
    // Step 3: 재해 유발 가능성
    <div key="3" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">작업자 판단: 이 위험요인이 재해를 유발할 가능성이 있다고 생각합니까?</p>
      <p className="text-xs text-gray-500">있다고 판단되면 +1점이 추가됩니다.</p>
      <div className="flex gap-3">
        <YesNoButton label="예 (+1점)" value={1} selected={judgement === 1} onClick={() => setJudgement(1)} />
        <YesNoButton label="아니오" value={0} selected={judgement === 0} onClick={() => setJudgement(0)} />
      </div>
    </div>,
    // Step 4: 재해 경험
    <div key="4" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">이 작업에서 과거에 재해가 발생한 이력이 있습니까?</p>
      <p className="text-xs text-gray-500">있다면 +1점이 추가됩니다.</p>
      <div className="flex gap-3">
        <YesNoButton label="예 (+1점)" value={1} selected={experience === 1} onClick={() => setExperience(1)} />
        <YesNoButton label="아니오" value={0} selected={experience === 0} onClick={() => setExperience(0)} />
      </div>
    </div>,
    // Step 5: 개선방안 + 결과
    <div key="5" className="space-y-3">
      <ScorePreview severity={severity} likelihood={likelihood} additional={(judgement > 0 ? 1 : 0) + (experience > 0 ? 1 : 0)} category="ACCIDENT" />
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">개선방안 (선택)</p>
        <textarea value={improvementPlan} onChange={e => setImprovementPlan(e.target.value)}
          placeholder="개선방안을 입력하세요..." rows={3}
          className="w-full text-sm border rounded px-3 py-2 resize-none" />
      </div>
    </div>,
  ]

  const canNext = [
    hazardFactor.trim().length > 0,
    severity > 0,
    likelihood > 0,
    judgement >= 0,
    experience >= 0,
    true,
  ][step]

  const handleBack = step === 0 ? onBack : () => setStep(s => s - 1)
  const handleNext = () => setStep(s => s + 1)
  const handleSubmit = () => {
    const accExp = experience > 0 ? 1 : 0
    const accJdg = judgement > 0 ? 1 : 0
    onComplete({
      hazardFactor, severityScore: severity, likelihoodScore: likelihood,
      additionalPoints: accExp + accJdg,
      additionalDetails: { accidentExperience: accExp, accidentJudgement: accJdg },
      improvementPlan,
    })
  }

  return (
    <>
      <StepIndicator current={step} total={TOTAL} />
      {steps[step]}
      <WizardNav step={step} total={TOTAL} onBack={handleBack} onNext={handleNext}
        onSubmit={handleSubmit} canNext={!!canNext} isSaving={isSaving} />
    </>
  )
}

// ───────── ChemicalWizard ─────────
const CHEMICAL_LIKELIHOOD = [
  { v: 1, label: '1점', desc: '연 2-3회 취급' },
  { v: 2, label: '2점', desc: '월 2-3회 취급' },
  { v: 3, label: '3점', desc: '주 2-3회 취급' },
  { v: 4, label: '4점', desc: '매일 4시간 이하 취급' },
  { v: 5, label: '5점', desc: '매일 4시간 초과 취급' },
]

function ChemicalWizard({ initialData, workplaceId, isSaving, onBack, onComplete }: {
  initialData: RiskHazard | null; workplaceId: string; isSaving: boolean
  onBack?: () => void; onComplete: (r: WizardResult) => void
}) {
  const [step, setStep] = useState(0)
  const [chemicals, setChemicals] = useState<ChemicalProduct[]>([])
  const [isLoadingChemicals, setIsLoadingChemicals] = useState(true)
  const [selectedChemical, setSelectedChemical] = useState<ChemicalProduct | null>(
    initialData?.chemicalProduct ? { id: initialData.chemicalProduct.id, name: initialData.chemicalProduct.name, severityScore: initialData.severityScore } : null
  )
  const [problemDesc, setProblemDesc] = useState(() => {
    // 수정 시 hazardFactor에서 문제점 추출 ("제품명: 문제점" 형식)
    if (initialData?.hazardFactor && initialData.hazardFactor.includes(': ')) {
      return initialData.hazardFactor.split(': ').slice(1).join(': ')
    }
    return initialData?.hazardFactor || ''
  })
  const [componentInfo, setComponentInfo] = useState<Array<{ name: string; concentration: string | null; hazards: string | null; severityScore: number | null }>>([])
  const [likelihood, setLikelihood] = useState(initialData?.likelihoodScore || 0)
  const [management, setManagement] = useState(initialData?.additionalDetails?.managementStatus ?? -1)
  const [ventilation, setVentilation] = useState(initialData?.additionalDetails?.ventilationStatus ?? -1)
  const [complaint, setComplaint] = useState(initialData?.additionalDetails?.workerComplaint ?? -1)
  const [improvementPlan, setImprovementPlan] = useState(initialData?.improvementPlan || '')
  const [chemSearch, setChemSearch] = useState('')
  const TOTAL = 6

  useEffect(() => {
    if (initialData && !initialData.additionalDetails) { setManagement(0); setVentilation(0); setComplaint(0) }
  }, [])

  useEffect(() => {
    fetch(`/api/risk-assessment/chemicals?workplaceId=${workplaceId}`)
      .then(r => r.json()).then(d => {
        setChemicals(d.chemicals || [])
        setIsLoadingChemicals(false)
      })
  }, [workplaceId])

  // 선택 시 구성성분 정보 로드
  const loadComponents = async (chemId: string) => {
    try {
      const res = await fetch(`/api/risk-assessment/chemicals/${chemId}`)
      if (res.ok) {
        const data = await res.json()
        setComponentInfo((data.components || []).map((pc: { component: { name: string; hazards: string | null }; concentration: string | null; severityScore: number | null }) => ({
          name: pc.component.name,
          concentration: pc.concentration,
          hazards: pc.component.hazards,
          severityScore: pc.severityScore,
        })))
      }
    } catch { setComponentInfo([]) }
  }

  const handleSelectChemical = (c: ChemicalProduct) => {
    setSelectedChemical(c)
    if (c.id !== '미등록물질' && c.id !== '미확인물질') loadComponents(c.id)
    else setComponentInfo([])
  }

  const addSpecialChemical = (type: '미등록물질' | '미확인물질') => {
    const special: ChemicalProduct = { id: type, name: type, severityScore: 5 }
    setSelectedChemical(special)
    setComponentInfo([])
  }

  const filteredChemicals = chemicals.filter(c => !chemSearch || c.name.toLowerCase().includes(chemSearch.toLowerCase()))
  const additional = (management > 0 ? 1 : 0) + (ventilation > 0 ? 1 : 0) + (complaint > 0 ? 1 : 0)

  const steps = [
    // Step 0: 화학물질 선택 + 문제점
    <div key="0" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">취급하는 화학물질을 선택하세요.</p>
      {isLoadingChemicals ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : (
        <>
          <input type="text" placeholder="화학물질 검색..." value={chemSearch}
            onChange={e => setChemSearch(e.target.value)}
            className="w-full text-sm border rounded px-3 py-2" />
          {chemicals.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              <p>등록된 화학물질이 없습니다.</p>
              <a href="/risk-assessment/chemicals/new" target="_blank" className="text-blue-600 hover:underline text-xs mt-1 inline-block">화학물질 등록하기</a>
            </div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredChemicals.map(c => (
                <button key={c.id} onClick={() => handleSelectChemical(c)}
                  className={`w-full flex items-center justify-between p-2.5 rounded border text-left text-sm transition-colors ${selectedChemical?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-gray-500">중대성 {c.severityScore ?? '—'}점</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => addSpecialChemical('미등록물질')}
              className={`px-3 py-1.5 text-xs rounded border ${selectedChemical?.id === '미등록물질' ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              미등록물질 (5점)
            </button>
            <button type="button" onClick={() => addSpecialChemical('미확인물질')}
              className={`px-3 py-1.5 text-xs rounded border ${selectedChemical?.id === '미확인물질' ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              미확인물질 (5점)
            </button>
          </div>
          {selectedChemical && (
            <div className="bg-purple-50 rounded-lg p-3 space-y-1.5">
              <p className="text-sm font-medium text-purple-800">{selectedChemical.name} — 중대성 {selectedChemical.severityScore}점</p>
              {(selectedChemical.id === '미등록물질' || selectedChemical.id === '미확인물질') && (
                <p className="text-xs text-amber-600">미확인 물질은 5점으로 자동 처리됩니다.</p>
              )}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">화학물질로 인한 문제점 *</p>
            <textarea value={problemDesc} onChange={e => setProblemDesc(e.target.value)}
              placeholder="이 화학물질로 인한 위험 요인을 구체적으로 입력하세요..." rows={3}
              className="w-full text-sm border rounded px-3 py-2 resize-none" />
          </div>
        </>
      )}
    </div>,
    // Step 1: 화학물질 구성성분 정보
    <div key="1" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">화학물질 구성성분 정보</p>
      {selectedChemical && (
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="font-medium text-purple-900">{selectedChemical.name}</p>
          <p className="text-xs text-purple-600 mt-0.5">중대성 점수: {selectedChemical.severityScore}점</p>
        </div>
      )}
      {componentInfo.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500">성분명</th>
                <th className="px-3 py-2 text-center text-gray-500">함유량</th>
                <th className="px-3 py-2 text-left text-gray-500">유해성</th>
                <th className="px-3 py-2 text-center text-gray-500">중대성</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {componentInfo.map((comp, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-medium">{comp.name}</td>
                  <td className="px-3 py-2 text-center">{comp.concentration === '모름' ? '모름' : comp.concentration === '영업비밀' ? '영업비밀' : comp.concentration ? `${comp.concentration}%` : '—'}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{comp.hazards || '—'}</td>
                  <td className="px-3 py-2 text-center font-bold">{comp.severityScore ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-gray-400">구성성분 정보가 없습니다.</p>
      )}
      <p className="text-xs text-gray-500">다음 단계에서 노출 빈도(가능성)와 관리 현황을 입력합니다.</p>
    </div>,
    // Step 2: 가능성
    <div key="2" className="space-y-2">
      <p className="text-sm font-medium text-gray-700">화학물질 취급 빈도(가능성)는?</p>
      {CHEMICAL_LIKELIHOOD.map(o => (
        <OptionButton key={o.v} label={o.label} desc={o.desc} selected={likelihood === o.v} onClick={() => setLikelihood(o.v)} />
      ))}
    </div>,
    // Step 3: 관리상태
    <div key="3" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">취급물질 관리실태가 불량합니까?</p>
      <p className="text-xs text-gray-500">교육, MSDS비치, 경고표지 부착 및 정기적 관리가 미흡하면 +1점 추가됩니다.</p>
      <div className="flex gap-3">
        <YesNoButton label="예 (+1점)" value={1} selected={management === 1} onClick={() => setManagement(1)} />
        <YesNoButton label="아니오" value={0} selected={management === 0} onClick={() => setManagement(0)} />
      </div>
    </div>,
    // Step 4: 국소배기장치
    <div key="4" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">실효성 있는 국소배기장치가 가동되고 있습니까?</p>
      <p className="text-xs text-gray-500">국소배기장치가 필요하지만 미설치 또는 실효성 없으면 +1점 추가됩니다.</p>
      <div className="flex gap-3">
        <YesNoButton label="미흡 (+1점)" value={1} selected={ventilation === 1} onClick={() => setVentilation(1)} />
        <YesNoButton label="양호 / 불필요" value={0} selected={ventilation === 0} onClick={() => setVentilation(0)} />
      </div>
    </div>,
    // Step 5: 작업자 호소 + 개선방안
    <div key="5" className="space-y-3">
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">취급 물질로 인한 불편이나 불안감이 있습니까?</p>
        <p className="text-xs text-gray-500">작업자 호소 시 +1점 추가됩니다.</p>
        <div className="flex gap-3">
          <YesNoButton label="예 (+1점)" value={1} selected={complaint === 1} onClick={() => setComplaint(1)} />
          <YesNoButton label="아니오" value={0} selected={complaint === 0} onClick={() => setComplaint(0)} />
        </div>
      </div>
      {complaint >= 0 && (
        <>
          <ScorePreview severity={selectedChemical?.severityScore || 0} likelihood={likelihood} additional={additional} category="CHEMICAL" />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">개선방안 (선택)</p>
            <textarea value={improvementPlan} onChange={e => setImprovementPlan(e.target.value)}
              placeholder="개선방안을 입력하세요..." rows={2}
              className="w-full text-sm border rounded px-3 py-2 resize-none" />
          </div>
        </>
      )}
    </div>,
  ]

  const canNext = [
    selectedChemical !== null && problemDesc.trim().length > 0,
    true,
    likelihood > 0,
    management >= 0,
    ventilation >= 0,
    complaint >= 0,
  ][step]

  const handleBack = step === 0 ? onBack : () => setStep(s => s - 1)
  const handleNext = () => setStep(s => s + 1)
  const hazardFactor = selectedChemical ? `${selectedChemical.name}: ${problemDesc.trim()}` : problemDesc.trim()
  const handleSubmit = () => {
    const mgmt = management > 0 ? 1 : 0
    const vent = ventilation > 0 ? 1 : 0
    const comp = complaint > 0 ? 1 : 0
    onComplete({
      hazardFactor,
      severityScore: selectedChemical?.severityScore || 1,
      likelihoodScore: likelihood,
      additionalPoints: mgmt + vent + comp,
      additionalDetails: { managementStatus: mgmt, ventilationStatus: vent, workerComplaint: comp },
      improvementPlan,
      chemicalProductId: (selectedChemical?.id === '미등록물질' || selectedChemical?.id === '미확인물질') ? undefined : selectedChemical?.id,
    })
  }

  return (
    <>
      <StepIndicator current={step} total={TOTAL} />
      {steps[step]}
      <WizardNav step={step} total={TOTAL} onBack={handleBack} onNext={handleNext}
        onSubmit={handleSubmit} canNext={!!canNext} isSaving={isSaving} />
    </>
  )
}

// ───────── MusculoskeletalWizard ─────────
const MUSC_LIKELIHOOD_REGULAR = [
  { v: 1, label: '1점', desc: '연 2-3회 (작업 빈도 낮음)' },
  { v: 2, label: '2점', desc: '주 1-3일, 1일 2시간 이내' },
  { v: 3, label: '3점', desc: '1일 4시간 이하' },
  { v: 4, label: '4점', desc: '1일 4-8시간' },
  { v: 5, label: '5점', desc: '1일 8시간 초과' },
]
const MUSC_LIKELIHOOD_IRREGULAR = [
  { v: 1, label: '1점', desc: '월 20시간 미만' },
  { v: 2, label: '2점', desc: '월 20-50시간' },
  { v: 3, label: '3점', desc: '월 50-75시간' },
  { v: 4, label: '4점', desc: '월 75-100시간' },
  { v: 5, label: '5점', desc: '월 100시간 초과' },
]

function borgToSeverity(borg: number): number {
  if (borg <= 9) return 1
  if (borg <= 11) return 2
  if (borg <= 13) return 3
  if (borg <= 15) return 4
  return 5
}

function MusculoskeletalWizard({ initialData, isSaving, onBack, onComplete }: {
  initialData: RiskHazard | null; isSaving: boolean
  onBack?: () => void; onComplete: (r: WizardResult) => void
}) {
  const [step, setStep] = useState(0)
  const [hazardFactor, setHazardFactor] = useState(initialData?.hazardFactor || '')
  const [borg, setBorg] = useState(12)
  const [workType, setWorkType] = useState<'REGULAR' | 'IRREGULAR'>('REGULAR')
  const [likelihood, setLikelihood] = useState(initialData?.likelihoodScore || 0)
  const [experience, setExperience] = useState(initialData?.additionalDetails?.experience ?? -1)
  const [currentPain, setCurrentPain] = useState(initialData?.additionalDetails?.currentPain ?? -1)
  const [improvementPlan, setImprovementPlan] = useState(initialData?.improvementPlan || '')
  const TOTAL = 6

  const severity = borgToSeverity(borg)
  const additional = (experience > 0 ? 1 : 0) + (currentPain > 0 ? 1 : 0)

  const borgLabel = (v: number) => {
    if (v <= 9) return `${v} — 아주 가벼운 작업`
    if (v <= 11) return `${v} — 가벼운 작업`
    if (v <= 13) return `${v} — 약간 힘든 작업`
    if (v <= 15) return `${v} — 힘든 작업`
    return `${v} — 아주 힘든 작업`
  }

  const likelihoodOptions = workType === 'REGULAR' ? MUSC_LIKELIHOOD_REGULAR : MUSC_LIKELIHOOD_IRREGULAR

  const steps = [
    // Step 0: 유해위험요인
    <div key="0" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">어떤 근골격계 유해위험요인이 있나요?</p>
      <textarea value={hazardFactor} onChange={e => setHazardFactor(e.target.value)}
        placeholder="예: 중량물 반복 들기 작업, 부적절한 자세 작업" rows={3}
        className="w-full text-sm border rounded px-3 py-2 resize-none" />
    </div>,
    // Step 1: Borg scale
    <div key="1" className="space-y-4">
      <p className="text-sm font-medium text-gray-700">작업 세기를 Borg 척도(6-20)로 표시하세요.</p>
      <div className="bg-amber-50 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-amber-700">{borg}</p>
        <p className="text-sm text-amber-600 mt-1">{borgLabel(borg)}</p>
        <p className="text-xs text-amber-500 mt-1">→ 중대성 {severity}점으로 변환</p>
      </div>
      <input type="range" min={6} max={20} value={borg} onChange={e => setBorg(parseInt(e.target.value))}
        className="w-full accent-amber-500" />
      <div className="flex justify-between text-xs text-gray-400">
        <span>6 (매우 가벼움)</span><span>13 (보통)</span><span>20 (매우 힘듦)</span>
      </div>
      <div className="grid grid-cols-5 gap-1 text-xs text-center">
        {[
          { range: '6-9', label: '1점', color: 'bg-green-100 text-green-700' },
          { range: '10-11', label: '2점', color: 'bg-yellow-100 text-yellow-700' },
          { range: '12-13', label: '3점', color: 'bg-orange-100 text-orange-700' },
          { range: '14-15', label: '4점', color: 'bg-red-100 text-red-700' },
          { range: '16-20', label: '5점', color: 'bg-red-900 text-white' },
        ].map(b => (
          <div key={b.range} className={`py-1 rounded ${b.color}`}>
            <div>{b.range}</div><div className="font-bold">{b.label}</div>
          </div>
        ))}
      </div>
    </div>,
    // Step 2: 작업 유형 + 가능성
    <div key="2" className="space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">작업 유형을 선택하세요.</p>
        <div className="flex gap-2">
          {[
            { key: 'REGULAR', label: '정형 작업', desc: '반복적·규칙적 작업' },
            { key: 'IRREGULAR', label: '비정형 작업', desc: '불규칙적·다양한 작업' },
          ].map(t => (
            <button key={t.key} onClick={() => { setWorkType(t.key as 'REGULAR' | 'IRREGULAR'); setLikelihood(0) }}
              className={`flex-1 p-3 rounded-lg border-2 text-sm text-left transition-colors ${workType === t.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <p className="font-medium">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-700">작업 빈도(가능성)는?</p>
      {likelihoodOptions.map(o => (
        <OptionButton key={o.v} label={o.label} desc={o.desc} selected={likelihood === o.v} onClick={() => setLikelihood(o.v)} />
      ))}
    </div>,
    // Step 3: 치료경험
    <div key="3" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">해당 작업과 관련하여 치료를 받거나 치료를 권고받은 경험이 있습니까?</p>
      <p className="text-xs text-gray-500">치료 경험이 있으면 +1점 추가됩니다.</p>
      <div className="flex gap-3">
        <YesNoButton label="예 (+1점)" value={1} selected={experience === 1} onClick={() => setExperience(1)} />
        <YesNoButton label="아니오" value={0} selected={experience === 0} onClick={() => setExperience(0)} />
      </div>
    </div>,
    // Step 4: 현재 통증
    <div key="4" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">현재 근골격계 통증이나 불편감을 호소하고 있습니까?</p>
      <p className="text-xs text-gray-500">현재 통증 호소 시 +1점 추가됩니다.</p>
      <div className="flex gap-3">
        <YesNoButton label="예 (+1점)" value={1} selected={currentPain === 1} onClick={() => setCurrentPain(1)} />
        <YesNoButton label="아니오" value={0} selected={currentPain === 0} onClick={() => setCurrentPain(0)} />
      </div>
    </div>,
    // Step 5: 개선방안 + 결과
    <div key="5" className="space-y-3">
      <ScorePreview severity={severity} likelihood={likelihood} additional={additional} category="MUSCULOSKELETAL" />
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">개선방안 (선택)</p>
        <textarea value={improvementPlan} onChange={e => setImprovementPlan(e.target.value)}
          placeholder="개선방안을 입력하세요..." rows={3}
          className="w-full text-sm border rounded px-3 py-2 resize-none" />
      </div>
    </div>,
  ]

  const canNext = [
    hazardFactor.trim().length > 0,
    true,
    likelihood > 0,
    experience >= 0,
    currentPain >= 0,
    true,
  ][step]

  const handleBack = step === 0 ? onBack : () => setStep(s => s - 1)
  const handleNext = () => setStep(s => s + 1)
  const handleSubmit = () => {
    const exp = experience > 0 ? 1 : 0
    const pain = currentPain > 0 ? 1 : 0
    onComplete({
      hazardFactor, severityScore: severity, likelihoodScore: likelihood,
      additionalPoints: exp + pain,
      additionalDetails: { experience: exp, currentPain: pain },
      improvementPlan,
    })
  }

  return (
    <>
      <StepIndicator current={step} total={TOTAL} />
      {steps[step]}
      <WizardNav step={step} total={TOTAL} onBack={handleBack} onNext={handleNext}
        onSubmit={handleSubmit} canNext={!!canNext} isSaving={isSaving} />
    </>
  )
}

// ───────── NoiseWizard ─────────
const NOISE_SEVERITY = [
  { v: 1, label: '1점', desc: '60dB 미만' },
  { v: 2, label: '2점', desc: '60 ~ 70dB' },
  { v: 3, label: '3점', desc: '70 ~ 80dB' },
  { v: 4, label: '4점', desc: '80 ~ 90dB' },
  { v: 5, label: '5점', desc: '90dB 이상' },
]
const NOISE_LIKELIHOOD = [
  { v: 1, label: '1점', desc: '하루 2시간 이하 노출' },
  { v: 2, label: '2점', desc: '하루 4시간 이하 노출' },
  { v: 3, label: '3점', desc: '하루 8시간 이하 노출' },
  { v: 4, label: '4점', desc: '하루 8-10시간 노출' },
  { v: 5, label: '5점', desc: '하루 10시간 이상 노출' },
]

function dbToSeverity(db: number): number {
  if (db >= 90) return 5
  if (db >= 80) return 4
  if (db >= 70) return 3
  if (db >= 60) return 2
  return 1
}

interface NoiseMeasurementInfo {
  year: number; period: string; measurementValue: number
}

function NoiseWizard({ initialData, isSaving, organizationUnitId, onBack, onComplete }: {
  initialData: RiskHazard | null; isSaving: boolean
  organizationUnitId: string
  onBack?: () => void; onComplete: (r: WizardResult) => void
}) {
  const [step, setStep] = useState(0)
  const [hazardFactor, setHazardFactor] = useState(initialData?.hazardFactor || '')
  const [severity, setSeverity] = useState(initialData?.severityScore || 0)
  const [likelihood, setLikelihood] = useState(initialData?.likelihoodScore || 0)
  const [noiseStress, setNoiseStress] = useState(initialData?.additionalDetails?.noiseStress ?? -1)
  const [hearingLoss, setHearingLoss] = useState(initialData?.additionalDetails?.hearingLoss != null ? (initialData.additionalDetails.hearingLoss > 0 ? 1 : 0) : -1)
  const [improvementPlan, setImprovementPlan] = useState(initialData?.improvementPlan || '')
  const [noiseMeasurements, setNoiseMeasurements] = useState<NoiseMeasurementInfo[]>([])
  const [severityAutoSet, setSeverityAutoSet] = useState(false)
  const TOTAL = 6

  // 소음 측정값 조회
  useEffect(() => {
    fetch(`/api/risk-assessment/noise?unitId=${organizationUnitId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.measurements?.length) return
        // 최근 2개 측정값 (year desc 정렬되어 있음)
        const recent: NoiseMeasurementInfo[] = data.measurements
          .slice(0, 2)
          .map((m: { year: number; period: string; measurementValue: string }) => ({
            year: m.year,
            period: m.period,
            measurementValue: parseFloat(m.measurementValue),
          }))
        setNoiseMeasurements(recent)
        // 편집이 아닌 신규 입력 시에만 자동 설정
        if (!initialData?.severityScore && recent.length > 0) {
          const maxDb = Math.max(...recent.map(m => m.measurementValue))
          setSeverity(dbToSeverity(maxDb))
          setSeverityAutoSet(true)
        }
      })
      .catch(() => {})
  }, [organizationUnitId, initialData?.severityScore])

  const additional = (noiseStress > 0 ? 1 : 0) + (hearingLoss > 0 ? 2 : 0)

  const periodLabel = (p: string) => p === 'recent' ? '최근' : '전회'

  const steps = [
    // Step 0: 소음원
    <div key="0" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">소음원 및 특이사항을 입력하세요.</p>
      <textarea value={hazardFactor} onChange={e => setHazardFactor(e.target.value)}
        placeholder="예: 프레스 기계 작동 소음, 분쇄기 소음" rows={3}
        className="w-full text-sm border rounded px-3 py-2 resize-none" />
    </div>,
    // Step 1: 소음 수준
    <div key="1" className="space-y-2">
      <p className="text-sm font-medium text-gray-700">소음 수준(dB)은?</p>
      {noiseMeasurements.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-1">
          <p className="text-xs font-medium text-blue-700 mb-1.5">등록된 소음 측정값</p>
          <div className="space-y-1">
            {noiseMeasurements.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-blue-600">{m.year}년 {periodLabel(m.period)}</span>
                <span className="font-bold text-blue-800">{m.measurementValue} dB</span>
              </div>
            ))}
          </div>
          {severityAutoSet && (
            <p className="text-xs text-blue-500 mt-1.5 border-t border-blue-200 pt-1.5">
              높은 측정값 기준으로 점수가 자동 설정되었습니다. 변경 가능합니다.
            </p>
          )}
        </div>
      )}
      {NOISE_SEVERITY.map(o => (
        <OptionButton key={o.v} label={o.label} desc={o.desc} selected={severity === o.v}
          onClick={() => { setSeverity(o.v); setSeverityAutoSet(false) }} />
      ))}
    </div>,
    // Step 2: 노출시간
    <div key="2" className="space-y-2">
      <p className="text-sm font-medium text-gray-700">소음에 하루 노출되는 시간은?</p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-1">
        <p className="text-xs text-amber-700">
          작업환경측정에 의한 측정값을 사용하는 경우 실제 노출시간과 무관하게 <strong>8시간(3점)</strong>을 입력하세요.
          작업환경측정값은 8시간을 기준으로 환산한 값이기 때문입니다.
        </p>
      </div>
      {NOISE_LIKELIHOOD.map(o => (
        <OptionButton key={o.v} label={o.label} desc={o.desc} selected={likelihood === o.v} onClick={() => setLikelihood(o.v)} />
      ))}
    </div>,
    // Step 3: 소음 스트레스
    <div key="3" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">소음으로 인한 스트레스나 청각저하 우려가 있습니까?</p>
      <p className="text-xs text-gray-500">스트레스 호소 시 +1점 추가됩니다.</p>
      <div className="flex gap-3">
        <YesNoButton label="예 (+1점)" value={1} selected={noiseStress === 1} onClick={() => setNoiseStress(1)} />
        <YesNoButton label="아니오" value={0} selected={noiseStress === 0} onClick={() => setNoiseStress(0)} />
      </div>
    </div>,
    // Step 4: 난청 소견
    <div key="4" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">특수건강검진 결과 난청 소견이 있습니까?</p>
      <p className="text-xs text-gray-500">난청 소견이 있으면 +2점 추가됩니다.</p>
      <div className="flex gap-3">
        <YesNoButton label="예 (+2점)" value={1} selected={hearingLoss === 1} onClick={() => setHearingLoss(1)} />
        <YesNoButton label="아니오" value={0} selected={hearingLoss === 0} onClick={() => setHearingLoss(0)} />
      </div>
    </div>,
    // Step 5: 개선방안 + 결과
    <div key="5" className="space-y-3">
      <ScorePreview severity={severity} likelihood={likelihood} additional={additional} category="NOISE" />
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">개선방안 (선택)</p>
        <textarea value={improvementPlan} onChange={e => setImprovementPlan(e.target.value)}
          placeholder="개선방안을 입력하세요..." rows={3}
          className="w-full text-sm border rounded px-3 py-2 resize-none" />
      </div>
    </div>,
  ]

  const canNext = [
    hazardFactor.trim().length > 0,
    severity > 0,
    likelihood > 0,
    noiseStress >= 0,
    hearingLoss >= 0,
    true,
  ][step]

  const handleBack = step === 0 ? onBack : () => setStep(s => s - 1)
  const handleNext = () => setStep(s => s + 1)
  const handleSubmit = () => {
    const stress = noiseStress > 0 ? 1 : 0
    const hearing = hearingLoss > 0 ? 2 : 0
    onComplete({
      hazardFactor, severityScore: severity, likelihoodScore: likelihood,
      additionalPoints: stress + hearing,
      additionalDetails: { noiseStress: stress, hearingLoss: hearing },
      improvementPlan,
    })
  }

  return (
    <>
      <StepIndicator current={step} total={TOTAL} />
      {steps[step]}
      <WizardNav step={step} total={TOTAL} onBack={handleBack} onNext={handleNext}
        onSubmit={handleSubmit} canNext={!!canNext} isSaving={isSaving} />
    </>
  )
}

// ───────── AbsoluteWizard ─────────
function AbsoluteWizard({ initialData, isSaving, onBack, onComplete }: {
  initialData: RiskHazard | null; isSaving: boolean
  onBack?: () => void; onComplete: (r: WizardResult) => void
}) {
  const [step, setStep] = useState(0)
  const [hazardFactor, setHazardFactor] = useState(initialData?.hazardFactor || '')
  const [improvementPlan, setImprovementPlan] = useState(initialData?.improvementPlan || '')
  const TOTAL = 3

  const steps = [
    // Step 0: 내용 입력
    <div key="0" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">중대한 법 위반 또는 중대재해 내용을 입력하세요.</p>
      <p className="text-xs text-gray-500">예: 안전장치 임의 제거, 안전작업 허가 미취득 등</p>
      <textarea value={hazardFactor} onChange={e => setHazardFactor(e.target.value)}
        placeholder="위반 내용 또는 중대재해 내용을 입력하세요..." rows={4}
        className="w-full text-sm border rounded px-3 py-2 resize-none" />
    </div>,
    // Step 1: 점수 안내
    <div key="1" className="space-y-3">
      <div className="bg-gray-900 text-white rounded-lg p-4 text-center space-y-2">
        <p className="text-sm opacity-70">절대기준 위험성 점수</p>
        <p className="text-4xl font-bold">16점</p>
        <p className="text-xs opacity-60">중대성 4점 × 가능성 4점 = 16점 (고정)</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
        절대기준에 해당하는 위험요인은 위험성 등급 <strong>매우높음(16점)</strong>으로 고정됩니다.
        즉시 개선이 필요합니다.
      </div>
    </div>,
    // Step 2: 개선방안
    <div key="2" className="space-y-3">
      <ScorePreview severity={4} likelihood={4} additional={0} category="ABSOLUTE" />
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">개선방안 (선택)</p>
        <textarea value={improvementPlan} onChange={e => setImprovementPlan(e.target.value)}
          placeholder="즉시 개선이 필요한 조치사항을 입력하세요..." rows={3}
          className="w-full text-sm border rounded px-3 py-2 resize-none" />
      </div>
    </div>,
  ]

  const canNext = [hazardFactor.trim().length > 0, true, true][step]
  const handleBack = step === 0 ? onBack : () => setStep(s => s - 1)
  const handleNext = () => setStep(s => s + 1)
  const handleSubmit = () => onComplete({
    hazardFactor, severityScore: 4, likelihoodScore: 4, additionalPoints: 0, improvementPlan,
  })

  return (
    <>
      <StepIndicator current={step} total={TOTAL} />
      {steps[step]}
      <WizardNav step={step} total={TOTAL} onBack={handleBack} onNext={handleNext}
        onSubmit={handleSubmit} canNext={!!canNext} isSaving={isSaving} />
    </>
  )
}

// ───────── OtherWizard ─────────
const SCORE_OPTIONS = [1, 2, 3, 4, 5]
const SEVERITY_LABELS: Record<number, string> = {
  1: '1점 — 경미 (부상 없음 / 건강영향 없음)',
  2: '2점 — 경상 (경미한 부상, 치료 불필요)',
  3: '3점 — 중상 (직업병, 치료 필요)',
  4: '4점 — 중대 (만성 질환, 입원 필요)',
  5: '5점 — 사망 / 영구 장해',
}
const LIKELIHOOD_LABELS: Record<number, string> = {
  1: '1점 — 거의 없음 (연 1회 미만)',
  2: '2점 — 가끔 (연 1~수회)',
  3: '3점 — 자주 (월 1회 이상)',
  4: '4점 — 빈번 (주 1회 이상)',
  5: '5점 — 항상 (매일)',
}

function OtherWizard({ initialData, isSaving, onBack, onComplete }: {
  initialData: RiskHazard | null; isSaving: boolean
  onBack?: () => void; onComplete: (r: WizardResult) => void
}) {
  const [step, setStep] = useState(0)
  const [hazardFactor, setHazardFactor] = useState(initialData?.hazardFactor || '')
  const [severity, setSeverity] = useState(initialData?.severityScore || 0)
  const [likelihood, setLikelihood] = useState(initialData?.likelihoodScore || 0)
  const [improvementPlan, setImprovementPlan] = useState(initialData?.improvementPlan || '')
  const TOTAL = 3

  const steps = [
    // Step 0: 유해위험요인
    <div key="0" className="space-y-3">
      <p className="text-sm font-medium text-gray-700">유해위험요인을 입력하세요.</p>
      <textarea value={hazardFactor} onChange={e => setHazardFactor(e.target.value)}
        placeholder="유해위험요인을 입력하세요..." rows={3}
        className="w-full text-sm border rounded px-3 py-2 resize-none" />
    </div>,
    // Step 1: 점수 직접 입력
    <div key="1" className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">중대성 점수를 선택하세요.</p>
        {SCORE_OPTIONS.map(v => (
          <OptionButton key={v} label={SEVERITY_LABELS[v]} selected={severity === v} onClick={() => setSeverity(v)} />
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">가능성 점수를 선택하세요.</p>
        {SCORE_OPTIONS.map(v => (
          <OptionButton key={v} label={LIKELIHOOD_LABELS[v]} selected={likelihood === v} onClick={() => setLikelihood(v)} />
        ))}
      </div>
    </div>,
    // Step 2: 개선방안 + 결과
    <div key="2" className="space-y-3">
      <ScorePreview severity={severity} likelihood={likelihood} additional={0} category="OTHER" />
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">개선방안 (선택)</p>
        <textarea value={improvementPlan} onChange={e => setImprovementPlan(e.target.value)}
          placeholder="개선방안을 입력하세요..." rows={3}
          className="w-full text-sm border rounded px-3 py-2 resize-none" />
      </div>
    </div>,
  ]

  const canNext = [
    hazardFactor.trim().length > 0,
    severity > 0 && likelihood > 0,
    true,
  ][step]

  const handleBack = step === 0 ? onBack : () => setStep(s => s - 1)
  const handleNext = () => setStep(s => s + 1)
  const handleSubmit = () => onComplete({
    hazardFactor, severityScore: severity, likelihoodScore: likelihood,
    additionalPoints: 0, improvementPlan,
  })

  return (
    <>
      <StepIndicator current={step} total={TOTAL} />
      {steps[step]}
      <WizardNav step={step} total={TOTAL} onBack={handleBack} onNext={handleNext}
        onSubmit={handleSubmit} canNext={!!canNext} isSaving={isSaving} />
    </>
  )
}

// ───────── 카테고리별 점수 기준 설명 ─────────
function getSeverityDesc(category: string, score: number): string {
  switch (category) {
    case 'ACCIDENT':
      return ACCIDENT_SEVERITY.find(o => o.v === score)?.desc || ''
    case 'NOISE':
      return NOISE_SEVERITY.find(o => o.v === score)?.desc || ''
    case 'CHEMICAL': {
      const labels: Record<number, string> = { 1: 'GHS 비위험', 2: 'GHS 경고', 3: 'GHS 위험 (경고 이상)', 4: 'GHS 위험 (높음)', 5: 'GHS 위험 (매우 높음)' }
      return labels[score] || ''
    }
    case 'MUSCULOSKELETAL': {
      const labels: Record<number, string> = { 1: 'Borg 6~9 (매우 가벼움)', 2: 'Borg 10~11 (가벼움)', 3: 'Borg 12~13 (약간 힘듦)', 4: 'Borg 14~15 (힘듦)', 5: 'Borg 16~20 (매우 힘듦)' }
      return labels[score] || ''
    }
    default: // OTHER
      return SEVERITY_LABELS[score]?.replace(/^\d점 — /, '') || ''
  }
}
function getLikelihoodDesc(category: string, evaluationType: string, score: number): string {
  switch (category) {
    case 'ACCIDENT':
      return ACCIDENT_LIKELIHOOD.find(o => o.v === score)?.desc || ''
    case 'NOISE':
      return NOISE_LIKELIHOOD.find(o => o.v === score)?.desc || ''
    case 'CHEMICAL':
      return CHEMICAL_LIKELIHOOD.find(o => o.v === score)?.desc || ''
    case 'MUSCULOSKELETAL': {
      const opts = evaluationType === 'OCCASIONAL' ? MUSC_LIKELIHOOD_IRREGULAR : MUSC_LIKELIHOOD_REGULAR
      return opts.find(o => o.v === score)?.desc || ''
    }
    default: // OTHER
      return LIKELIHOOD_LABELS[score]?.replace(/^\d점 — /, '') || ''
  }
}

