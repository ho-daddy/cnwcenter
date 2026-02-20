'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Search, Loader2 } from 'lucide-react'
import { calculateComponentSeverity, calculateProductSeverity } from '@/lib/msds-rules'
import MsdsUploadSection, { type MsdsParseResult } from './MsdsUploadSection'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ComponentData {
  key: string // client-side key for React list
  casNumber: string
  name: string
  concentration: string
  hazards: string
  regulations: string
  severityScore: number
  isTradeSecret: boolean
  isConcentrationUnknown: boolean
}

export interface ProductData {
  name: string
  manufacturer: string
  description: string
  components: ComponentData[]
}

interface Props {
  mode: 'new' | 'edit'
  workplaceId: string
  workplaceName: string
  productId?: string
  initial?: ProductData
}

function emptyComponent(): ComponentData {
  return {
    key: crypto.randomUUID(),
    casNumber: '', name: '', concentration: '', hazards: '', regulations: '',
    severityScore: 1, isTradeSecret: false, isConcentrationUnknown: false,
  }
}

// ─── Component Entry ─────────────────────────────────────────────────────────

function ComponentEntry({
  comp, index, onChange, onRemove, canRemove, isAutoSearching,
}: {
  comp: ComponentData
  index: number
  onChange: (index: number, data: Partial<ComponentData>) => void
  onRemove: (index: number) => void
  canRemove: boolean
  isAutoSearching?: boolean
}) {
  const [isSearching, setIsSearching] = useState(false)

  const handleCasSearch = async () => {
    if (!comp.casNumber.trim()) { alert('CAS 번호를 입력해주세요.'); return }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/risk-assessment/kosha?cas=${encodeURIComponent(comp.casNumber.trim())}`)
      if (res.ok) {
        const data = await res.json()
        if (data.error) { alert(data.error); return }
        const hazards = data.hazards || ''
        const severity = hazards ? calculateComponentSeverity(hazards) : 1
        onChange(index, {
          name: data.name || comp.name,
          hazards,
          regulations: data.regulations || '',
          severityScore: severity,
        })
      } else { alert('KOSHA API 호출에 실패했습니다.') }
    } catch { alert('검색 중 오류가 발생했습니다.') }
    finally { setIsSearching(false) }
  }

  const handleTradeSecretChange = (checked: boolean) => {
    if (checked) {
      onChange(index, {
        isTradeSecret: true,
        casNumber: '영업비밀', name: '영업비밀', hazards: '영업비밀', regulations: '영업비밀',
        severityScore: 5,
      })
    } else {
      onChange(index, {
        isTradeSecret: false,
        casNumber: '', name: '', hazards: '', regulations: '', severityScore: 1,
      })
    }
  }

  const handleConcentrationUnknown = (checked: boolean) => {
    onChange(index, { isConcentrationUnknown: checked, concentration: checked ? '모름' : '' })
  }

  const handleHazardsChange = (text: string) => {
    const severity = text.trim() ? calculateComponentSeverity(text) : 1
    onChange(index, { hazards: text, severityScore: severity })
  }

  const severityColors: Record<number, string> = {
    5: 'bg-red-100 text-red-700 border-red-300', 4: 'bg-orange-100 text-orange-700 border-orange-300',
    3: 'bg-yellow-100 text-yellow-700 border-yellow-300', 2: 'bg-blue-100 text-blue-700 border-blue-300',
    1: 'bg-gray-100 text-gray-600 border-gray-300',
  }

  const searching = isSearching || isAutoSearching

  return (
    <div className={`border rounded-lg p-4 bg-white space-y-3 ${isAutoSearching ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          구성성분 #{index + 1}
          {isAutoSearching && (
            <span className="ml-2 text-xs font-normal text-blue-500 inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              KOSHA 조회 중...
            </span>
          )}
        </span>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Row 1: CAS + Name + Concentration + Score */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-3">
          <label className="text-xs text-gray-500 mb-1 block">CAS 번호</label>
          <div className="flex gap-1">
            <input type="text" value={comp.casNumber}
              onChange={e => onChange(index, { casNumber: e.target.value })}
              readOnly={comp.isTradeSecret}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-50"
              placeholder="예: 7647-01-0" />
            <button type="button" onClick={handleCasSearch} disabled={searching || comp.isTradeSecret}
              className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 shrink-0">
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              검색
            </button>
          </div>
          <label className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={comp.isTradeSecret}
              onChange={e => handleTradeSecretChange(e.target.checked)}
              className="rounded border-gray-300" />
            영업비밀 <span className="text-red-400">(5점)</span>
          </label>
        </div>

        <div className="col-span-3">
          <label className="text-xs text-gray-500 mb-1 block">성분명</label>
          <input type="text" value={comp.name}
            onChange={e => onChange(index, { name: e.target.value })}
            readOnly={comp.isTradeSecret}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="성분명" />
        </div>

        <div className="col-span-3">
          <label className="text-xs text-gray-500 mb-1 block">함유량</label>
          <input type="text" value={comp.concentration}
            onChange={e => onChange(index, { concentration: e.target.value })}
            readOnly={comp.isConcentrationUnknown}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="예: 85, 10~30, 비공개" />
          <label className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={comp.isConcentrationUnknown}
              onChange={e => handleConcentrationUnknown(e.target.checked)}
              className="rounded border-gray-300" />
            함유량 모름
          </label>
        </div>

        <div className="col-span-3">
          <label className="text-xs text-gray-500 mb-1 block">중대성 점수</label>
          <input type="number" value={comp.severityScore} min={1} max={5}
            onChange={e => onChange(index, { severityScore: parseInt(e.target.value) || 1 })}
            readOnly={comp.isTradeSecret}
            className={`w-full px-2 py-1.5 border rounded text-sm font-bold text-center ${severityColors[comp.severityScore] || severityColors[1]}`} />
          <p className="text-xs text-gray-400 mt-1">자동 계산 / 직접 수정 가능</p>
        </div>
      </div>

      {/* Row 2: Hazards + Regulations */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">유해성</label>
          <textarea value={comp.hazards}
            onChange={e => handleHazardsChange(e.target.value)}
            readOnly={comp.isTradeSecret}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-none" rows={3}
            placeholder="KOSHA 검색 시 자동 입력됩니다" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">규제사항</label>
          <textarea value={comp.regulations}
            onChange={e => onChange(index, { regulations: e.target.value })}
            readOnly={comp.isTradeSecret}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-none" rows={3}
            placeholder="KOSHA 검색 시 자동 입력됩니다" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Form ───────────────────────────────────────────────────────────────

export default function ChemicalForm({ mode, workplaceId, workplaceName, productId, initial }: Props) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(initial?.name || '')
  const [manufacturer, setManufacturer] = useState(initial?.manufacturer || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [components, setComponents] = useState<ComponentData[]>(
    initial?.components?.length ? initial.components : [emptyComponent()]
  )

  // KOSHA 자동검색 진행 상태
  const [koshaProgress, setKoshaProgress] = useState<{
    total: number
    completed: number
    currentIndex: number // 현재 검색 중인 component index
  } | null>(null)

  const productSeverity = useMemo(
    () => calculateProductSeverity(components.map(c => c.severityScore)),
    [components]
  )

  const handleComponentChange = useCallback((index: number, data: Partial<ComponentData>) => {
    setComponents(prev => prev.map((c, i) => i === index ? { ...c, ...data } : c))
  }, [])

  const addComponent = () => setComponents(prev => [...prev, emptyComponent()])
  const removeComponent = (index: number) => {
    if (components.length <= 1) { alert('구성성분은 최소 1개 이상 필요합니다.'); return }
    setComponents(prev => prev.filter((_, i) => i !== index))
  }

  // ─── MSDS 파싱 결과 처리 + KOSHA 자동검색 ────────────────────────
  const handleMsdsParsed = useCallback(async (result: MsdsParseResult) => {
    // 1. 기본 정보 입력
    setName(result.productName || '')
    setManufacturer(result.manufacturer || '')
    setDescription(result.description || '')

    // 2. 성분 데이터 생성
    const newComponents: ComponentData[] = result.components.map(c => {
      const concLower = (c.concentration || '').toLowerCase()
      const isTradeSecret = concLower === '영업비밀' || c.casNumber === '영업비밀'
      const isUnknown = concLower === '모름' || concLower === '미확인' || concLower === '비공개'

      return {
        key: crypto.randomUUID(),
        casNumber: c.casNumber || '',
        name: c.name || '',
        concentration: c.concentration || '',
        hazards: '',
        regulations: '',
        severityScore: 1,
        isTradeSecret,
        isConcentrationUnknown: isUnknown,
      }
    })

    if (newComponents.length === 0) {
      newComponents.push(emptyComponent())
    }

    setComponents(newComponents)

    // 3. KOSHA 자동검색 (CAS 번호가 있는 성분만)
    const searchTargets = newComponents
      .map((c, i) => ({ index: i, cas: c.casNumber }))
      .filter(t => t.cas && t.cas !== '영업비밀' && /^\d/.test(t.cas))

    if (searchTargets.length === 0) return

    setKoshaProgress({ total: searchTargets.length, completed: 0, currentIndex: searchTargets[0].index })

    for (let si = 0; si < searchTargets.length; si++) {
      const target = searchTargets[si]
      setKoshaProgress(prev => prev ? { ...prev, completed: si, currentIndex: target.index } : null)

      try {
        const res = await fetch(`/api/risk-assessment/kosha?cas=${encodeURIComponent(target.cas)}`)
        if (res.ok) {
          const data = await res.json()
          if (!data.error) {
            const hazards = data.hazards || ''
            const severity = hazards ? calculateComponentSeverity(hazards) : 1
            setComponents(prev => prev.map((c, i) =>
              i === target.index ? {
                ...c,
                name: data.name || c.name,
                hazards,
                regulations: data.regulations || '',
                severityScore: severity,
              } : c
            ))
          }
        }
      } catch {
        // 개별 KOSHA 검색 실패는 무시 (사용자가 수동 검색 가능)
      }

      // KOSHA API 부하 방지 (300ms 간격)
      if (si < searchTargets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    setKoshaProgress(prev => prev ? { ...prev, completed: searchTargets.length, currentIndex: -1 } : null)
    // 완료 후 잠시 뒤 progress 숨기기
    setTimeout(() => setKoshaProgress(null), 2000)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { alert('제품명을 입력해주세요.'); return }

    // 함유량 유효성 검사
    for (const comp of components) {
      if (!comp.casNumber.trim() || !comp.name.trim()) {
        alert('구성성분의 CAS 번호와 성분명을 입력해주세요.')
        return
      }
      // 함유량은 자유 텍스트 (범위값, 비공개 등 허용)
    }

    setIsSaving(true)
    const payload = {
      workplaceId,
      name: name.trim(),
      manufacturer: manufacturer.trim() || null,
      description: description.trim() || null,
      components: components.map(c => ({
        casNumber: c.casNumber.trim(),
        name: c.name.trim(),
        concentration: c.concentration || null,
        hazards: c.hazards || null,
        regulations: c.regulations || null,
        severityScore: c.severityScore,
      })),
    }

    const url = mode === 'new'
      ? '/api/risk-assessment/chemicals'
      : `/api/risk-assessment/chemicals/${productId}`
    const method = mode === 'new' ? 'POST' : 'PUT'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const result = await res.json()
      router.push(`/risk-assessment/chemicals/${result.id || productId}`)
    } else {
      const err = await res.json().catch(() => null)
      alert(err?.error || '저장에 실패했습니다.')
    }
    setIsSaving(false)
  }

  const severityColors: Record<number, string> = {
    5: 'bg-red-100 text-red-700', 4: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700', 2: 'bg-blue-100 text-blue-700', 1: 'bg-gray-100 text-gray-600',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* MSDS 자동 입력 (신규 등록 모드에서만) */}
      {mode === 'new' && (
        <MsdsUploadSection onParsed={handleMsdsParsed} />
      )}

      {/* Product Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">기본 정보</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">사업장</label>
            <input type="text" value={workplaceName} readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">제품 중대성 점수</label>
            <div className={`px-3 py-2 rounded-lg text-sm font-bold text-center ${severityColors[productSeverity]}`}>
              {productSeverity}점 (구성성분 최댓값 자동 계산)
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">제품명 *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="화학제품명" />
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">제조사</label>
          <input type="text" value={manufacturer} onChange={e => setManufacturer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="제조사명" />
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">설명</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" rows={2} placeholder="제품에 대한 설명 (선택)" />
        </div>
      </div>

      {/* Components */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">구성성분 ({components.length}종)</h2>
          <button type="button" onClick={addComponent}
            className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> 성분 추가
          </button>
        </div>

        {/* KOSHA 자동검색 진행률 */}
        {koshaProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="font-medium">
                {koshaProgress.completed >= koshaProgress.total
                  ? 'KOSHA MSDS 데이터 조회 완료!'
                  : `KOSHA MSDS 데이터 조회 중... (${koshaProgress.completed + 1}/${koshaProgress.total})`
                }
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((koshaProgress.completed / koshaProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {!koshaProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            CAS 번호 입력 후 &quot;검색&quot; 버튼을 클릭하면 KOSHA MSDS 데이터에서 성분명, 유해성, 규제사항을 자동으로 불러오고 중대성 점수가 자동 계산됩니다.
          </div>
        )}

        <div className="space-y-3">
          {components.map((comp, idx) => (
            <ComponentEntry
              key={comp.key}
              comp={comp}
              index={idx}
              onChange={handleComponentChange}
              onRemove={removeComponent}
              canRemove={components.length > 1}
              isAutoSearching={koshaProgress !== null && koshaProgress.currentIndex === idx}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          취소
        </button>
        <button type="submit" disabled={isSaving || (koshaProgress !== null && koshaProgress.completed < koshaProgress.total)}
          className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'new' ? '제품 등록' : '수정 저장'}
        </button>
      </div>
    </form>
  )
}
