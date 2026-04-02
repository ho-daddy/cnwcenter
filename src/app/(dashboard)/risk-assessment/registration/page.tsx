'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Volume2, Plus, Trash2, Building2, ChevronRight, ChevronDown, FolderTree } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Workplace { id: string; name: string }
interface OrganizationUnit {
  id: string; name: string; level: number
  isLeaf: boolean; parentId: string | null; children: OrganizationUnit[]
}
interface NoiseMeasurement {
  id: string
  year: number
  period: string
  measurementValue: string | number
  notes: string | null
  organizationUnit: { id: string; name: string }
}

const PERIOD_LABEL: Record<string, string> = {
  first_half: '상반기',
  second_half: '하반기',
}

function buildTree(flat: OrganizationUnit[]): OrganizationUnit[] {
  const map = new Map<string, OrganizationUnit>()
  const roots: OrganizationUnit[] = []
  flat.forEach(u => map.set(u.id, { ...u, children: [] }))
  flat.forEach(u => {
    const node = map.get(u.id)!
    if (u.parentId && map.has(u.parentId)) map.get(u.parentId)!.children.push(node)
    else roots.push(node)
  })
  return roots
}

export default function RegistrationPage() {
  const currentYear = new Date().getFullYear()
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWorkplace, setSelectedWorkplace] = useState<Workplace | null>(null)
  const [orgUnits, setOrgUnits] = useState<OrganizationUnit[]>([])
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnit | null>(null)
  const [measurements, setMeasurements] = useState<NoiseMeasurement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formYear, setFormYear] = useState(currentYear)
  const [firstHalf, setFirstHalf] = useState({ measurementValue: '', notes: '' })
  const [secondHalf, setSecondHalf] = useState({ measurementValue: '', notes: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/workplaces').then(r => r.json()).then(d => { setWorkplaces(d.workplaces || []); setIsLoading(false) })
  }, [])

  useEffect(() => {
    if (!selectedWorkplace) { setOrgUnits([]); setMeasurements([]); return }
    fetch(`/api/workplaces/${selectedWorkplace.id}/organizations`).then(r => r.json()).then(async d => {
      const org = d.organization
      if (org) {
        const ud = await fetch(`/api/workplaces/${selectedWorkplace.id}/organizations/${org.id}`).then(r => r.json())
        const tree = buildTree(ud.flatUnits || [])
        setOrgUnits(tree)
        const ids: string[] = []
        const traverse = (list: OrganizationUnit[]) => list.forEach(u => { if (u.children.length > 0) { ids.push(u.id); traverse(u.children) } })
        traverse(tree)
        setExpanded(new Set(ids))
      }
    })
    fetch(`/api/risk-assessment/noise?workplaceId=${selectedWorkplace.id}`)
      .then(r => r.json()).then(d => setMeasurements(d.measurements || []))
  }, [selectedWorkplace])

  const handleAdd = async () => {
    if (!selectedUnit) return
    if (!firstHalf.measurementValue && !secondHalf.measurementValue) {
      alert('상반기 또는 하반기 중 하나 이상의 측정값을 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/risk-assessment/noise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationUnitId: selectedUnit.id,
          year: formYear,
          firstHalf: firstHalf.measurementValue ? firstHalf : null,
          secondHalf: secondHalf.measurementValue ? secondHalf : null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const newMeasurements: NoiseMeasurement[] = data.measurements || []
        setMeasurements(prev => {
          let updated = [...prev]
          for (const nm of newMeasurements) {
            updated = updated.filter(x =>
              !(x.organizationUnit.id === selectedUnit.id && x.year === formYear && x.period === nm.period)
            )
            updated.push(nm)
          }
          return updated
        })
        setShowForm(false)
        setFirstHalf({ measurementValue: '', notes: '' })
        setSecondHalf({ measurementValue: '', notes: '' })
      } else {
        const err = await res.json().catch(() => null)
        alert(err?.error || '저장에 실패했습니다.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch(`/api/risk-assessment/noise/${id}`, { method: 'DELETE' })
    setMeasurements(prev => prev.filter(m => m.id !== id))
  }

  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const renderUnit = (unit: OrganizationUnit, depth = 0): React.ReactNode => {
    const isSelected = selectedUnit?.id === unit.id
    const hasChildren = unit.children.length > 0
    const unitMeasurements = measurements.filter(m => m.organizationUnit.id === unit.id)
    return (
      <div key={unit.id}>
        <div
          className={`flex items-center gap-1 py-1.5 rounded cursor-pointer text-sm transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
          style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: '8px' }}
          onClick={() => { if (hasChildren) toggle(unit.id); setSelectedUnit(unit); setShowForm(false) }}
        >
          {hasChildren ? (
            <button onClick={e => { e.stopPropagation(); toggle(unit.id) }} className="p-0.5">
              {expanded.has(unit.id) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
          ) : <span className="w-5" />}
          <span className={`flex-1 truncate ${unit.isLeaf ? 'text-green-700 font-medium' : ''}`}>{unit.name}</span>
          {unit.isLeaf && unitMeasurements.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{unitMeasurements.length}</span>
          )}
        </div>
        {hasChildren && expanded.has(unit.id) && unit.children.map(c => renderUnit(c, depth + 1))}
      </div>
    )
  }

  const unitMeasurements = selectedUnit ? measurements.filter(m => m.organizationUnit.id === selectedUnit.id) : []

  // 연도별 그룹화하여 표시
  const groupedByYear = unitMeasurements.reduce<Record<number, NoiseMeasurement[]>>((acc, m) => {
    if (!acc[m.year]) acc[m.year] = []
    acc[m.year].push(m)
    return acc
  }, {})
  const sortedYears = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/risk-assessment" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-1.5">소음 등록 <HelpTooltip content="작업환경측정 결과의 소음 측정값(dB)을 평가단위별로 등록합니다. 연도별 상반기/하반기로 구분하여 관리됩니다." /></h1>
          <p className="text-sm text-gray-500 mt-0.5">평가단위별 소음 측정값 등록 관리</p>
        </div>
        <Volume2 className="w-6 h-6 text-teal-600 ml-auto" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 사업장 */}
        <Card className="col-span-12 lg:col-span-2">
          <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" />사업장</CardTitle></CardHeader>
          <CardContent className="p-2 max-h-96 overflow-y-auto">
            {isLoading ? <div className="text-center py-4 text-sm text-gray-500">로딩중...</div> :
             workplaces.length === 0 ? <div className="text-center py-4 text-sm text-gray-500">사업장 없음</div> :
             <div className="space-y-1">
               {workplaces.map(wp => (
                 <button key={wp.id} onClick={() => { setSelectedWorkplace(wp); setSelectedUnit(null) }}
                   className={`w-full p-2 rounded text-left text-sm transition-colors ${selectedWorkplace?.id === wp.id ? 'bg-blue-100 border border-blue-400' : 'hover:bg-gray-50 border border-transparent'}`}>
                   <p className="font-medium truncate">{wp.name}</p>
                 </button>
               ))}
             </div>
            }
          </CardContent>
        </Card>

        {/* 조직도 */}
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><FolderTree className="w-4 h-4" />조직도</CardTitle></CardHeader>
          <CardContent className="p-2 max-h-96 overflow-y-auto">
            {!selectedWorkplace ? <div className="text-center py-8 text-sm text-gray-500">사업장을 선택하세요.</div> :
             orgUnits.length === 0 ? <div className="text-center py-8 text-sm text-gray-500">조직도가 없습니다.</div> :
             <div>{orgUnits.map(u => renderUnit(u))}</div>
            }
          </CardContent>
        </Card>

        {/* 소음 측정 */}
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                소음 측정값
                {selectedUnit && <span className="text-gray-500 font-normal ml-2">- {selectedUnit.name}</span>}
              </CardTitle>
              {selectedUnit && (
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                  <Plus className="w-3 h-3" />추가
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUnit ? (
              <div className="text-center py-8 text-sm text-gray-500">조직도에서 단위를 선택하세요.</div>
            ) : (
              <div className="space-y-3">
                {/* 입력 폼: 연도 + 상반기/하반기 동시 입력 */}
                {showForm && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">연도</label>
                      <select value={formYear} onChange={e => setFormYear(parseInt(e.target.value))}
                        className="w-full text-sm px-2 py-1.5 border rounded bg-white">
                        {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}년</option>)}
                      </select>
                    </div>

                    {/* 상반기 */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">상반기</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">측정값 (dB)</label>
                          <input type="number" step="0.1" value={firstHalf.measurementValue}
                            onChange={e => setFirstHalf(f => ({ ...f, measurementValue: e.target.value }))}
                            className="w-full text-sm px-2 py-1.5 border rounded bg-white" placeholder="예: 85.5" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">비고</label>
                          <input type="text" value={firstHalf.notes}
                            onChange={e => setFirstHalf(f => ({ ...f, notes: e.target.value }))}
                            className="w-full text-sm px-2 py-1.5 border rounded bg-white" placeholder="선택" />
                        </div>
                      </div>
                    </div>

                    {/* 하반기 */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">하반기</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">측정값 (dB)</label>
                          <input type="number" step="0.1" value={secondHalf.measurementValue}
                            onChange={e => setSecondHalf(f => ({ ...f, measurementValue: e.target.value }))}
                            className="w-full text-sm px-2 py-1.5 border rounded bg-white" placeholder="예: 85.5" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">비고</label>
                          <input type="text" value={secondHalf.notes}
                            onChange={e => setSecondHalf(f => ({ ...f, notes: e.target.value }))}
                            className="w-full text-sm px-2 py-1.5 border rounded bg-white" placeholder="선택" />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">* 상반기, 하반기 중 값이 있는 항목만 저장됩니다.</p>
                    <div className="flex gap-1">
                      <button onClick={handleAdd} disabled={isSaving}
                        className="flex-1 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                        {isSaving ? '저장 중...' : '저장'}
                      </button>
                      <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">취소</button>
                    </div>
                  </div>
                )}

                {/* 기존 데이터 연도별 표시 */}
                {sortedYears.length === 0 && !showForm ? (
                  <div className="text-center py-6 text-sm text-gray-500">등록된 소음 측정값이 없습니다.</div>
                ) : (
                  sortedYears.map(year => {
                    const yearItems = groupedByYear[year].sort((a, b) => {
                      const order = { second_half: 0, first_half: 1 }
                      return (order[a.period as keyof typeof order] ?? 2) - (order[b.period as keyof typeof order] ?? 2)
                    })
                    return (
                      <div key={year} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 border-b">{year}년</div>
                        <div className="divide-y divide-gray-100">
                          {yearItems.map(m => (
                            <div key={m.id} className="flex items-center justify-between px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  m.period === 'second_half' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                                }`}>
                                  {PERIOD_LABEL[m.period] || m.period}
                                </span>
                                <span className="text-sm font-bold text-gray-900">{Number(m.measurementValue).toFixed(1)} dB</span>
                                {Number(m.measurementValue) >= 85 && (
                                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">기준초과</span>
                                )}
                                {m.notes && <span className="text-xs text-gray-400">({m.notes})</span>}
                              </div>
                              <button onClick={() => handleDelete(m.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
