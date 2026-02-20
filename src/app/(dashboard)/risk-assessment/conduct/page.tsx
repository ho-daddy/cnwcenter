'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2, ChevronRight, ChevronDown, Plus, FolderTree,
  Search, X, AlertTriangle, Loader2, Edit2, Trash2, Check,
  FileText, ChevronLeft, Camera, CheckCircle, Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  EVALUATION_TYPE_LABELS, HAZARD_CATEGORY_LABELS, HAZARD_CATEGORY_COLORS,
  getRiskLevel, calcRiskScore,
  SEVERITY_OPTIONS, LIKELIHOOD_OPTIONS, ADDITIONAL_SCORE_CONFIG,
} from '@/lib/risk-assessment'
import { PhotoUploader } from '@/components/ui/photo-uploader'

// ───────── Types ─────────
interface Workplace { id: string; name: string }
interface OrganizationUnit {
  id: string; name: string; level: number
  isLeaf: boolean; parentId: string | null; children: OrganizationUnit[]
}
interface RiskCard {
  id: string; evaluationNumber: string; evaluationType: string
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
  additionalPoints: number; improvementPlan: string
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
      setWorkplaces(d.workplaces || [])
      setIsLoading(false)
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
      .then(r => r.json()).then(d => setCards(d.cards || []))
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
        setSelectedCard(prev => prev ? { ...prev, _count: { hazards: prev._count.hazards + 1 } } : prev)
        setCards(prev => prev.map(c => c.id === selectedCard.id
          ? { ...c, _count: { hazards: c._count.hazards + 1 } } : c))
      }
    }
    setWizardState({ open: false, category: '', editing: null })
  }, [selectedCard, wizardState])

  const handleDeleteHazard = useCallback(async (hazardId: string) => {
    if (!selectedCard || !confirm('이 유해위험요인을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/risk-assessment/${selectedCard.id}/hazards/${hazardId}`, { method: 'DELETE' })
    if (res.ok) {
      setHazards(prev => prev.filter(h => h.id !== hazardId))
      setSelectedCard(prev => prev ? { ...prev, _count: { hazards: Math.max(0, prev._count.hazards - 1) } } : prev)
      setCards(prev => prev.map(c => c.id === selectedCard.id
        ? { ...c, _count: { hazards: Math.max(0, c._count.hazards - 1) } } : c))
    }
  }, [selectedCard])

  const handleImprovementUpdate = useCallback((hazardId: string, improvements: { id: string; status: string }[]) => {
    setHazards(prev => prev.map(h => h.id === hazardId ? { ...h, improvements } : h))
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">평가 실시</h1>
        <p className="text-sm text-gray-500 mt-1">사업장과 평가단위를 선택하여 위험성평가를 진행하세요.</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Workplace list */}
        <Card className="col-span-12 lg:col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" />사업장</CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-64 overflow-y-auto">
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
        <Card className="col-span-12 lg:col-span-10">
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
          <CardContent className="p-2 max-h-80 overflow-y-auto">
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
                units={orgUnits} cards={cards} selectedUnit={selectedUnit}
                selectedCardId={selectedCard?.id} searchTerm={searchTerm}
                onSelectUnit={setSelectedUnit} onSelectCard={handleSelectCard}
                onCreateCard={handleCreateCard}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom detail panel */}
      {selectedCard && (
        <div ref={bottomRef}>
          <Card>
            <CardHeader className="py-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <div>
                    <CardTitle className="text-base">{selectedCard.evaluationNumber}</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedCard.organizationUnit.name} · {selectedCard.year}년 · {EVALUATION_TYPE_LABELS[selectedCard.evaluationType]}
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
                  { key: 'hazards', label: `유해위험요인 (${selectedCard._count.hazards})` },
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
                <CardOverviewTab card={selectedCard} onUpdate={handleCardUpdated} />
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
          onClose={() => setWizardState({ open: false, category: '', editing: null })}
          onComplete={handleWizardComplete}
        />
      )}

      {/* Improvement Panel */}
      {improvementHazard && selectedCard && (
        <ConductImprovementPanel
          hazard={improvementHazard}
          card={selectedCard}
          onClose={() => setImprovementHazard(null)}
          onUpdate={handleImprovementUpdate}
        />
      )}
    </div>
  )
}

// ───────── OrgTreeView ─────────
function OrgTreeView({
  units, cards, selectedUnit, selectedCardId, searchTerm,
  onSelectUnit, onSelectCard, onCreateCard,
}: {
  units: OrganizationUnit[]; cards: RiskCard[]
  selectedUnit: OrganizationUnit | null; selectedCardId?: string
  searchTerm: string
  onSelectUnit: (u: OrganizationUnit) => void
  onSelectCard: (c: RiskCard) => void
  onCreateCard: (unit: OrganizationUnit, data: {
    year: number; evaluationType: string; evaluationReason: string;
    workerName: string; evaluatorName: string; workDescription: string
  }) => Promise<RiskCard | null>
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  useEffect(() => {
    const ids: string[] = []
    const traverse = (list: OrganizationUnit[]) => {
      list.forEach(u => { if (u.children.length > 0) { ids.push(u.id); traverse(u.children) } })
    }
    traverse(units)
    setExpanded(new Set(ids))
  }, [units])

  const toggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const matchSearch = (u: OrganizationUnit): boolean => {
    if (!searchTerm) return true
    const t = searchTerm.toLowerCase()
    return u.name.toLowerCase().includes(t) || u.children.some(matchSearch)
  }
  const getUnitCards = (unitId: string) => cards.filter(c => c.organizationUnit.id === unitId)

  const renderUnit = (unit: OrganizationUnit, depth = 0): React.ReactNode => {
    if (!matchSearch(unit)) return null
    const isExpanded = expanded.has(unit.id)
    const hasChildren = unit.children.length > 0
    const isSelected = selectedUnit?.id === unit.id
    const unitCards = unit.isLeaf ? getUnitCards(unit.id) : []

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
            unitCards.length > 0
              ? <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{unitCards.length}건</span>
              : <span className="text-xs text-gray-400">평가없음</span>
          )}
        </div>
        {unit.isLeaf && isSelected && (
          <CardPanel unit={unit} unitCards={unitCards} selectedCardId={selectedCardId}
            onSelectCard={onSelectCard} onCreateCard={onCreateCard} />
        )}
        {hasChildren && isExpanded && unit.children.map(child => renderUnit(child, depth + 1))}
      </div>
    )
  }
  return <div className="space-y-0.5">{units.map(u => renderUnit(u))}</div>
}

// ───────── CardPanel (inline in tree) ─────────
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
    <div className="ml-9 mt-1 mb-2 space-y-1">
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
function CardOverviewTab({ card, onUpdate }: { card: RiskCard; onUpdate: (c: RiskCard) => void }) {
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
        <div className="flex justify-end">
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
            <Edit2 className="w-3.5 h-3.5" />수정
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="평가번호" value={card.evaluationNumber} />
          <Field label="평가연도" value={`${card.year}년`} />
          <Field label="조사구분" value={EVALUATION_TYPE_LABELS[card.evaluationType]} />
          <Field label="조직단위" value={card.organizationUnit.name} />
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
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">유해위험요인</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 w-24">위험성</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-48">개선방안</th>
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
                  <tr key={h.id} className="border-b hover:bg-gray-50 group">
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
                      {/* 사진 영역 */}
                      <div className="mt-1.5">
                        <button
                          onClick={() => setExpandedPhotoId(isPhotoExpanded ? null : h.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Camera className="w-3 h-3" />
                          사진 {h.photos.length > 0 ? `(${h.photos.length})` : ''}
                          <ChevronDown className={`w-3 h-3 transition-transform ${isPhotoExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isPhotoExpanded && (
                          <div className="mt-2" onClick={e => e.stopPropagation()}>
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
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${level.bg} ${level.color}`}>
                        {h.riskScore}점
                      </span>
                      <p className={`text-xs mt-0.5 ${level.color}`}>{level.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {h.hazardCategory === 'ABSOLUTE' ? '절대기준' : `${h.severityScore}×${h.likelihoodScore}+${h.additionalPoints}`}
                      </p>
                    </td>
                    <td className="py-2 px-3">
                      <p className="text-xs text-gray-600 line-clamp-2">{h.improvementPlan || <span className="text-gray-300">-</span>}</p>
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
  initialCategory, editingHazard, workplaceId, onClose, onComplete,
}: {
  initialCategory: string; editingHazard: RiskHazard | null
  workplaceId: string
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
      <p className="text-sm font-medium text-gray-700">위험성 점수 계산 결과</p>
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
  const [judgement, setJudgement] = useState(initialData ? (initialData.additionalPoints >= 1 ? 1 : 0) : -1)
  const [experience, setExperience] = useState(initialData ? (initialData.additionalPoints === 2 ? 1 : 0) : -1)
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
  const handleSubmit = () => onComplete({
    hazardFactor, severityScore: severity, likelihoodScore: likelihood,
    additionalPoints: (judgement > 0 ? 1 : 0) + (experience > 0 ? 1 : 0),
    improvementPlan,
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
  const [management, setManagement] = useState(-1)
  const [ventilation, setVentilation] = useState(-1)
  const [complaint, setComplaint] = useState(-1)
  const [improvementPlan, setImprovementPlan] = useState(initialData?.improvementPlan || '')
  const [chemSearch, setChemSearch] = useState('')
  const TOTAL = 6

  useEffect(() => {
    if (initialData) { setManagement(0); setVentilation(0); setComplaint(0) }
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
  const handleSubmit = () => onComplete({
    hazardFactor,
    severityScore: selectedChemical?.severityScore || 1,
    likelihoodScore: likelihood,
    additionalPoints: additional,
    improvementPlan,
    chemicalProductId: (selectedChemical?.id === '미등록물질' || selectedChemical?.id === '미확인물질') ? undefined : selectedChemical?.id,
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
  const [experience, setExperience] = useState(-1)
  const [currentPain, setCurrentPain] = useState(-1)
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
  const handleSubmit = () => onComplete({
    hazardFactor, severityScore: severity, likelihoodScore: likelihood,
    additionalPoints: additional, improvementPlan,
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
const NOISE_COMPLAINT = [
  { v: 0, label: '0점', desc: '자연스럽게 대화 가능 (이상 없음)' },
  { v: 1, label: '1점', desc: '소음으로 인한 스트레스 또는 청각저하 우려' },
  { v: 2, label: '2점', desc: '특수건강검진 결과 난청 소견' },
]

function NoiseWizard({ initialData, isSaving, onBack, onComplete }: {
  initialData: RiskHazard | null; isSaving: boolean
  onBack?: () => void; onComplete: (r: WizardResult) => void
}) {
  const [step, setStep] = useState(0)
  const [hazardFactor, setHazardFactor] = useState(initialData?.hazardFactor || '')
  const [severity, setSeverity] = useState(initialData?.severityScore || 0)
  const [likelihood, setLikelihood] = useState(initialData?.likelihoodScore || 0)
  const [complaint, setComplaint] = useState(initialData?.additionalPoints ?? -1)
  const [improvementPlan, setImprovementPlan] = useState(initialData?.improvementPlan || '')
  const TOTAL = 5

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
      {NOISE_SEVERITY.map(o => (
        <OptionButton key={o.v} label={o.label} desc={o.desc} selected={severity === o.v} onClick={() => setSeverity(o.v)} />
      ))}
    </div>,
    // Step 2: 노출시간
    <div key="2" className="space-y-2">
      <p className="text-sm font-medium text-gray-700">소음에 하루 노출되는 시간은?</p>
      {NOISE_LIKELIHOOD.map(o => (
        <OptionButton key={o.v} label={o.label} desc={o.desc} selected={likelihood === o.v} onClick={() => setLikelihood(o.v)} />
      ))}
    </div>,
    // Step 3: 작업자 호소
    <div key="3" className="space-y-2">
      <p className="text-sm font-medium text-gray-700">작업자의 청력 이상 호소 수준은?</p>
      {NOISE_COMPLAINT.map(o => (
        <OptionButton key={o.v} label={o.label} desc={o.desc} selected={complaint === o.v} onClick={() => setComplaint(o.v)} />
      ))}
    </div>,
    // Step 4: 개선방안 + 결과
    <div key="4" className="space-y-3">
      <ScorePreview severity={severity} likelihood={likelihood} additional={Math.max(0, complaint)} category="NOISE" />
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
    complaint >= 0,
    true,
  ][step]

  const handleBack = step === 0 ? onBack : () => setStep(s => s - 1)
  const handleNext = () => setStep(s => s + 1)
  const handleSubmit = () => onComplete({
    hazardFactor, severityScore: severity, likelihoodScore: likelihood,
    additionalPoints: Math.max(0, complaint), improvementPlan,
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

// ───────── ConductAddImprovementForm ─────────
function ConductAddImprovementForm({
  hazard, cardId, onSaved,
}: {
  hazard: RiskHazard; cardId: string
  onSaved: (rec: ImprovementRecord) => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'PLANNED' | 'COMPLETED'>('PLANNED')
  const [updateDate, setUpdateDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [improvementContent, setImprovementContent] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('')
  // 기존 위험요인 점수를 기본값으로 사용
  const [severityScore, setSeverityScore] = useState(hazard.severityScore)
  const [likelihoodScore, setLikelihoodScore] = useState(hazard.likelihoodScore)
  const [additionalPoints, setAdditionalPoints] = useState(hazard.additionalPoints)
  const [remarks, setRemarks] = useState('')

  const riskScore = calcRiskScore(hazard.hazardCategory, severityScore, likelihoodScore, additionalPoints)

  const reset = () => {
    setStatus('PLANNED'); setUpdateDate(format(new Date(), 'yyyy-MM-dd'))
    setImprovementContent(''); setResponsiblePerson('')
    setSeverityScore(hazard.severityScore); setLikelihoodScore(hazard.likelihoodScore)
    setAdditionalPoints(hazard.additionalPoints); setRemarks('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!improvementContent.trim() || !responsiblePerson.trim()) return
    setSaving(true)
    const res = await fetch(`/api/risk-assessment/${cardId}/hazards/${hazard.id}/improvements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, updateDate, improvementContent, responsiblePerson, severityScore, likelihoodScore, additionalPoints, remarks, riskScore }),
    })
    if (res.ok) {
      const rec = await res.json()
      onSaved({ ...rec, photos: [] })
      reset()
      setOpen(false)
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 flex items-center justify-center gap-1.5 transition-colors mt-2"
      >
        <Plus className="w-4 h-4" /> 개선이력 추가
      </button>
    )
  }

  const isAbsolute = hazard.hazardCategory === 'ABSOLUTE'
  const rl = getRiskLevel(riskScore)
  const additionalConfig = ADDITIONAL_SCORE_CONFIG[hazard.hazardCategory]

  return (
    <form onSubmit={handleSubmit} className="border border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50 mt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-blue-800">새 개선이력 추가</h4>
        <button type="button" onClick={() => { setOpen(false); reset() }} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">상태</label>
          <select value={status} onChange={e => setStatus(e.target.value as 'PLANNED' | 'COMPLETED')}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
            <option value="PLANNED">예정</option>
            <option value="COMPLETED">완료</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">{status === 'PLANNED' ? '예정일' : '완료일'}</label>
          <input type="date" value={updateDate} onChange={e => setUpdateDate(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" required />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">개선 내용 *</label>
        <textarea value={improvementContent} onChange={e => setImprovementContent(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white resize-none"
          rows={2} required placeholder="개선 작업 내용을 입력하세요" />
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">담당자 *</label>
        <input type="text" value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" required placeholder="담당자 이름" />
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">
          {status === 'PLANNED' ? '예상 위험성 점수 (개선 후)' : '실제 위험성 점수 (개선 후)'}
        </label>
        <p className="text-xs text-gray-400 mb-2">최초 위험성: {hazard.severityScore}×{hazard.likelihoodScore}+{hazard.additionalPoints} = {hazard.riskScore}점</p>
        {isAbsolute ? (
          <span className="text-xs text-gray-500">절대기준 — 16점 고정</span>
        ) : (
          <div className="space-y-2">
            {/* 중대성 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 shrink-0">중대성</span>
              <select value={severityScore} onChange={e => setSeverityScore(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white w-16">
                {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}점</option>)}
              </select>
              <span className="text-xs text-gray-400 truncate">{SEVERITY_OPTIONS.find(o => o.value === severityScore)?.desc}</span>
            </div>
            {/* 가능성 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 shrink-0">가능성</span>
              <select value={likelihoodScore} onChange={e => setLikelihoodScore(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white w-16">
                {LIKELIHOOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}점</option>)}
              </select>
              <span className="text-xs text-gray-400 truncate">{LIKELIHOOD_OPTIONS.find(o => o.value === likelihoodScore)?.desc}</span>
            </div>
            {/* 추가점수 */}
            {additionalConfig && additionalConfig.max > 0 && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12 shrink-0">추가</span>
                  <select value={additionalPoints} onChange={e => setAdditionalPoints(parseInt(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm bg-white w-16">
                    {Array.from({ length: additionalConfig.max + 1 }, (_, i) => (
                      <option key={i} value={i}>{i}점</option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400 truncate">{additionalConfig.label}</span>
                </div>
                {additionalConfig.fields.length > 0 && (
                  <div className="ml-14 mt-1 space-y-0.5">
                    {additionalConfig.fields.map(f => (
                      <p key={f.key} className="text-xs text-gray-400">• {f.label}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* 결과 */}
            <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
              <span className="text-xs text-gray-500">결과:</span>
              <span className="text-xs font-mono text-gray-600">{severityScore}×{likelihoodScore}+{additionalPoints}</span>
              <span className="text-xs text-gray-400">=</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${rl.bg} ${rl.color}`}>{riskScore}점 ({rl.label})</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">비고</label>
        <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" placeholder="선택 입력" />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={() => { setOpen(false); reset() }} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">취소</button>
        <button type="submit" disabled={saving}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}

// ───────── ConductImprovementPanel ─────────
function ConductImprovementPanel({
  hazard, card, onClose, onUpdate,
}: {
  hazard: RiskHazard; card: RiskCard
  onClose: () => void
  onUpdate: (hazardId: string, improvements: { id: string; status: string }[]) => void
}) {
  const [improvements, setImprovements] = useState<ImprovementRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      const res = await fetch(`/api/risk-assessment/${card.id}/hazards/${hazard.id}/improvements`)
      if (!cancelled && res.ok) {
        const data = await res.json()
        setImprovements(data.improvements || [])
      }
      if (!cancelled) setIsLoading(false)
    })()
    return () => { cancelled = true }
  }, [card.id, hazard.id])

  const sync = (newList: ImprovementRecord[]) => {
    setImprovements(newList)
    onUpdate(hazard.id, newList.map(r => ({ id: r.id, status: r.status })))
  }

  const handleComplete = async (recordId: string) => {
    const res = await fetch(`/api/risk-assessment/improvements/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    if (res.ok) {
      sync(improvements.map(r => r.id === recordId ? { ...r, status: 'COMPLETED' as const } : r))
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('이 개선이력을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/risk-assessment/improvements/${recordId}`, { method: 'DELETE' })
    if (res.ok) sync(improvements.filter(r => r.id !== recordId))
  }

  const handleSaved = (rec: ImprovementRecord) => {
    sync([...improvements, rec])
  }

  const handlePhotoUploaded = (recordId: string, photo: ImprovementPhoto) => {
    setImprovements(prev => prev.map(r =>
      r.id === recordId ? { ...r, photos: [...r.photos, photo] } : r
    ))
  }

  const handleDeletePhoto = async (recordId: string, photoId: string) => {
    const res = await fetch(`/api/risk-assessment/improvements/${recordId}/photos/${photoId}`, { method: 'DELETE' })
    if (res.ok) {
      setImprovements(prev => prev.map(r =>
        r.id === recordId ? { ...r, photos: r.photos.filter(p => p.id !== photoId) } : r
      ))
    }
  }

  const riskLevel = getRiskLevel(hazard.riskScore)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden border-l border-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium mb-1.5 ${HAZARD_CATEGORY_COLORS[hazard.hazardCategory]}`}>
                {HAZARD_CATEGORY_LABELS[hazard.hazardCategory]}
              </span>
              <h2 className="text-sm font-bold text-gray-900 leading-snug">{hazard.hazardFactor}</h2>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3 shrink-0" />
                {card.workplace.name} · {card.organizationUnit.name} · {card.year}년
              </p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="text-gray-500">최초 위험성:</span>
            {hazard.hazardCategory !== 'ABSOLUTE' && (
              <span className="font-mono text-gray-500">
                {hazard.severityScore}×{hazard.likelihoodScore}+{hazard.additionalPoints}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded font-bold ${riskLevel.bg} ${riskLevel.color}`}>
              {hazard.riskScore}점 ({riskLevel.label})
            </span>
          </div>

          {hazard.improvementPlan && (
            <p className="text-xs text-gray-600 mt-2 bg-white border border-gray-200 rounded px-2 py-1.5">
              <span className="font-medium text-gray-700">개선방안: </span>{hazard.improvementPlan}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            개선이력 {!isLoading && `(${improvements.length}건)`}
          </h3>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
          ) : improvements.length === 0 ? (
            <div className="text-center py-8 text-gray-300 text-sm">등록된 개선이력이 없습니다.</div>
          ) : (
            <div className="space-y-2 mb-2">
              {improvements.map(rec => {
                const rl = getRiskLevel(rec.riskScore)
                const isDone = rec.status === 'COMPLETED'
                const isPhotoExpanded = expandedPhotoId === rec.id
                return (
                  <div key={rec.id}
                    className={`rounded-lg border p-3 ${isDone ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${isDone ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                            {isDone ? '완료' : '예정'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(rec.updateDate), 'yyyy.MM.dd')}
                          </span>
                          <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${rl.bg} ${rl.color}`}>
                            {isDone ? '실제' : '예상'} {rec.riskScore}점
                          </span>
                          {!isDone && (
                            <span className="text-xs text-gray-400 font-mono">
                              ({rec.severityScore}×{rec.likelihoodScore}+{rec.additionalPoints})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 font-medium leading-snug">{rec.improvementContent}</p>
                        <p className="text-xs text-gray-500 mt-0.5">담당: {rec.responsiblePerson}</p>
                        {rec.remarks && <p className="text-xs text-gray-400 mt-0.5">비고: {rec.remarks}</p>}

                        {/* 사진 영역 */}
                        <div className="mt-1.5">
                          <button
                            onClick={() => setExpandedPhotoId(isPhotoExpanded ? null : rec.id)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Camera className="w-3 h-3" />
                            사진 {rec.photos.length > 0 ? `(${rec.photos.length})` : ''}
                            <ChevronDown className={`w-3 h-3 transition-transform ${isPhotoExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          {isPhotoExpanded && (
                            <div className="mt-2" onClick={e => e.stopPropagation()}>
                              <PhotoUploader
                                mode="immediate"
                                uploadUrl={`/api/risk-assessment/improvements/${rec.id}/photos`}
                                existingPhotos={rec.photos}
                                onUploaded={(photo) => handlePhotoUploaded(rec.id, photo)}
                                onDeleteExisting={(photoId) => handleDeletePhoto(rec.id, photoId)}
                                maxPhotos={10}
                                maxFileSize={10 * 1024 * 1024}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        {!isDone && (
                          <button onClick={() => handleComplete(rec.id)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-0.5 whitespace-nowrap">
                            <CheckCircle className="w-3 h-3" /> 완료확인
                          </button>
                        )}
                        <button onClick={() => handleDelete(rec.id)} className="p-1 text-gray-300 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <ConductAddImprovementForm hazard={hazard} cardId={card.id} onSaved={handleSaved} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
