'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import {
  Upload, FileText, Loader2, CheckCircle2, AlertTriangle, XCircle, X, Play,
} from 'lucide-react'
import {
  calculateComponentSeverity,
  getStandardMeta,
  type SeverityStandard,
} from '@/lib/msds-rules'
import type { MsdsParseResult } from './MsdsUploadSection'

const ALLOWED_EXT = ['pdf', 'docx', 'doc', 'rtf', 'hwp']
const MAX_FILE_SIZE = 20 * 1024 * 1024
const CONCURRENCY = 2 // 동시 처리 개수 (Claude rate limit 고려)
const KOSHA_INTERVAL_MS = 300

type ItemStatus = 'pending' | 'parsing' | 'kosha' | 'done' | 'error'

interface ItemComponent {
  casNumber: string
  name: string
  concentration: string
  hazards: string
  regulations: string
  severityScore: number
  isTradeSecret: boolean
}

interface ParsedItem {
  id: string
  file: File
  fileName: string
  status: ItemStatus
  errorMsg?: string
  selected: boolean
  // 결과 (status === 'done')
  productName: string
  manufacturer: string
  description: string
  managementMethod: string
  productHazards: string
  productRegulations: string
  productSeverityScore: number
  components: ItemComponent[]
  warnings: string[]
}

interface SubmitResult {
  created: number
  errors: { row: number; message: string }[]
}

interface Props {
  workplaceId: string
  severityStandard: SeverityStandard
}

function newId() {
  return crypto.randomUUID()
}

function fileAccepted(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return ALLOWED_EXT.includes(ext) && file.size <= MAX_FILE_SIZE
}

function emptyItem(file: File): ParsedItem {
  return {
    id: newId(),
    file,
    fileName: file.name,
    status: 'pending',
    selected: false,
    productName: '',
    manufacturer: '',
    description: '',
    managementMethod: '',
    productHazards: '',
    productRegulations: '',
    productSeverityScore: 1,
    components: [],
    warnings: [],
  }
}

function computeProductSeverity(item: ParsedItem): number {
  const componentsMax = item.components.reduce((m, c) => Math.max(m, c.severityScore || 0), 0)
  const hasProductSelf = !!(item.productHazards.trim() || item.productRegulations.trim())
  const productScore = hasProductSelf ? item.productSeverityScore : 0
  return Math.max(componentsMax, productScore) || 1
}

export default function MsdsBulkPanel({ workplaceId, severityStandard }: Props) {
  const [items, setItems] = useState<ParsedItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const standardMeta = getStandardMeta(severityStandard)

  // useState setter via ref for use inside async loops
  const itemsRef = useRef<ParsedItem[]>([])
  itemsRef.current = items

  const updateItem = useCallback((id: string, patch: Partial<ParsedItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id))
  }, [])

  const addFiles = useCallback((files: File[]) => {
    const accepted: File[] = []
    const rejected: string[] = []
    for (const f of files) {
      if (fileAccepted(f)) accepted.push(f)
      else rejected.push(f.name)
    }
    if (rejected.length > 0) {
      alert(`다음 파일은 추가할 수 없습니다 (확장자 또는 크기 제한):\n${rejected.join('\n')}`)
    }
    if (accepted.length === 0) return
    setItems(prev => [...prev, ...accepted.map(emptyItem)])
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    addFiles(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }

  // ─── 파싱 + KOSHA 자동 검색 ────────────────────────────────
  async function processOne(item: ParsedItem) {
    updateItem(item.id, { status: 'parsing' })

    // 1) parse-msds
    let parsed: MsdsParseResult
    try {
      const fd = new FormData()
      fd.append('file', item.file)
      const res = await fetch('/api/risk-assessment/chemicals/parse-msds', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || `HTTP ${res.status}`)
      }
      parsed = await res.json()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '파싱 실패'
      updateItem(item.id, { status: 'error', errorMsg: msg })
      return
    }

    // 2) component 정규화 + 제품 자체 점수 자동 산정
    const pHazards = parsed.productHazards || ''
    const pRegulations = parsed.productRegulations || ''
    const pScore = calculateComponentSeverity(pHazards, severityStandard, pRegulations)

    const components: ItemComponent[] = parsed.components.map(c => {
      const concLower = (c.concentration || '').toLowerCase()
      const isTradeSecret = concLower === '영업비밀' || c.casNumber === '영업비밀'
      return {
        casNumber: c.casNumber || '',
        name: c.name || '',
        concentration: c.concentration || '',
        hazards: '',
        regulations: '',
        severityScore: isTradeSecret ? standardMeta.tradeSecretScore : 1,
        isTradeSecret,
      }
    })

    updateItem(item.id, {
      productName: parsed.productName || '',
      manufacturer: parsed.manufacturer || '',
      description: parsed.description || '',
      managementMethod: parsed.managementMethod || '',
      productHazards: pHazards,
      productRegulations: pRegulations,
      productSeverityScore: pScore,
      components,
      warnings: parsed.warnings || [],
      status: 'kosha',
      selected: true, // 자동 선택
    })

    // 3) KOSHA 자동 검색 (CAS 있는 성분만)
    const targets = components
      .map((c, i) => ({ index: i, cas: c.casNumber }))
      .filter(t => t.cas && !components[t.index].isTradeSecret && /^\d/.test(t.cas))

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]
      try {
        const res = await fetch(`/api/risk-assessment/kosha?cas=${encodeURIComponent(t.cas)}`)
        if (res.ok) {
          const data = await res.json()
          if (!data.error) {
            const hazards = data.hazards || ''
            const regulations = data.regulations || ''
            const severity = calculateComponentSeverity(hazards, severityStandard, regulations)
            // ref에서 최신 item 상태 읽어와서 반영
            setItems(prev => prev.map(it => {
              if (it.id !== item.id) return it
              const next = [...it.components]
              next[t.index] = {
                ...next[t.index],
                name: data.name || next[t.index].name,
                hazards,
                regulations,
                severityScore: severity,
              }
              return { ...it, components: next }
            }))
          }
        }
      } catch {
        // 개별 KOSHA 실패 무시
      }
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, KOSHA_INTERVAL_MS))
    }

    updateItem(item.id, { status: 'done' })
  }

  const startProcessing = async () => {
    const pending = itemsRef.current.filter(it => it.status === 'pending')
    if (pending.length === 0) return
    setIsProcessing(true)
    setSubmitResult(null)

    // 동시 처리 풀
    let cursor = 0
    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      while (cursor < pending.length) {
        const it = pending[cursor++]
        // 이미 다른 작업으로 상태가 바뀌었으면 스킵
        const current = itemsRef.current.find(x => x.id === it.id)
        if (!current || current.status !== 'pending') continue
        await processOne(it)
      }
    })
    await Promise.all(workers)
    setIsProcessing(false)
  }

  const toggleSelect = (id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, selected: !it.selected } : it))
  }
  const toggleSelectAll = (checked: boolean) => {
    setItems(prev => prev.map(it => it.status === 'done' ? { ...it, selected: checked } : it))
  }

  const handleFieldEdit = (id: string, field: 'productName' | 'manufacturer', value: string) => {
    updateItem(id, { [field]: value } as Partial<ParsedItem>)
  }
  const handleScoreEdit = (id: string, value: number) => {
    const clamped = Math.min(Math.max(value, 1), standardMeta.maxScore)
    updateItem(id, { productSeverityScore: clamped })
  }

  // ─── 제출 ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    const selected = items.filter(it => it.status === 'done' && it.selected)
    if (selected.length === 0) { alert('등록할 항목을 선택해주세요.'); return }
    if (!workplaceId) { alert('사업장을 먼저 선택해주세요.'); return }

    const products = selected.map(it => {
      const hasProductSelf = !!(it.productHazards.trim() || it.productRegulations.trim())
      const componentsMax = it.components.reduce((m, c) => Math.max(m, c.severityScore || 0), 0)
      return {
        name: it.productName,
        manufacturer: it.manufacturer,
        description: it.description,
        managementMethod: it.managementMethod,
        productHazards: it.productHazards,
        productRegulations: it.productRegulations,
        productSeverityScore: hasProductSelf ? it.productSeverityScore : null,
        severityScore: Math.max(componentsMax, hasProductSelf ? it.productSeverityScore : 0) || 1,
        components: it.components.map(c => ({
          casNumber: c.casNumber,
          name: c.name,
          concentration: c.concentration,
          hazards: c.hazards,
          regulations: c.regulations,
          severityScore: c.severityScore,
        })),
      }
    })

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/risk-assessment/chemicals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workplaceId, severityStandard, products }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data?.error || '등록 실패')
        return
      }
      setSubmitResult(data)
      // 등록 성공한 행 제거
      if (data.created > 0) {
        setItems(prev => prev.filter(it => !(it.status === 'done' && it.selected)))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── 통계 ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = items.length
    const pending = items.filter(i => i.status === 'pending').length
    const inProgress = items.filter(i => i.status === 'parsing' || i.status === 'kosha').length
    const done = items.filter(i => i.status === 'done').length
    const error = items.filter(i => i.status === 'error').length
    const selected = items.filter(i => i.status === 'done' && i.selected).length
    return { total, pending, inProgress, done, error, selected }
  }, [items])

  const allDoneSelected = stats.done > 0 && stats.selected === stats.done

  const severityColors: Record<number, string> = {
    5: 'bg-red-100 text-red-700', 4: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700', 2: 'bg-blue-100 text-blue-700', 1: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-4">
      {/* 드롭존 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-700 font-medium">MSDS 파일을 드래그하거나 클릭하여 선택</p>
        <p className="text-xs text-gray-500 mt-1">PDF, DOCX, DOC, RTF, HWP · 파일당 최대 20MB · 여러 개 동시 선택 가능</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.rtf,.hwp"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* 액션 바 */}
      {items.length > 0 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="text-sm text-gray-700">
            총 <strong>{stats.total}</strong>개
            {stats.pending > 0 && <span className="ml-2 text-gray-500">대기 {stats.pending}</span>}
            {stats.inProgress > 0 && <span className="ml-2 text-blue-600">진행중 {stats.inProgress}</span>}
            {stats.done > 0 && <span className="ml-2 text-green-600">완료 {stats.done}</span>}
            {stats.error > 0 && <span className="ml-2 text-red-600">오류 {stats.error}</span>}
            {stats.done > 0 && <span className="ml-3 text-gray-500">· 선택 {stats.selected}</span>}
          </div>
          <div className="flex items-center gap-2">
            {stats.pending > 0 && (
              <button
                type="button"
                onClick={startProcessing}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {isProcessing ? '처리 중...' : `${stats.pending}개 파싱 시작`}
              </button>
            )}
            {stats.done > 0 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || stats.selected === 0 || !workplaceId}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                선택 {stats.selected}개 등록
              </button>
            )}
          </div>
        </div>
      )}

      {/* 제출 결과 */}
      {submitResult && (
        <div className={`border rounded-lg px-4 py-3 ${
          submitResult.errors.length === 0
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <p className="text-sm font-medium">
            등록 완료: {submitResult.created}건 성공
            {submitResult.errors.length > 0 && `, ${submitResult.errors.length}건 실패`}
          </p>
          {submitResult.errors.length > 0 && (
            <ul className="mt-2 text-xs space-y-0.5">
              {submitResult.errors.map((e, i) => (
                <li key={i}>· 행 {e.row}: {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 결과 표 */}
      {items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={allDoneSelected}
                    disabled={stats.done === 0}
                    onChange={e => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">파일</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">제품명</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">제조사</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">성분</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">제품점</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">최종점</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">상태</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(it => {
                const finalScore = computeProductSeverity(it)
                const hasProductSelf = !!(it.productHazards.trim() || it.productRegulations.trim())
                return (
                  <tr key={it.id} className={it.status === 'error' ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={it.selected}
                        disabled={it.status !== 'done'}
                        onChange={() => toggleSelect(it.id)}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[200px] truncate" title={it.fileName}>
                      <FileText className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                      {it.fileName}
                    </td>
                    <td className="px-3 py-2">
                      {it.status === 'done' ? (
                        <input
                          type="text"
                          value={it.productName}
                          onChange={e => handleFieldEdit(it.id, 'productName', e.target.value)}
                          className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {it.status === 'done' ? (
                        <input
                          type="text"
                          value={it.manufacturer}
                          onChange={e => handleFieldEdit(it.id, 'manufacturer', e.target.value)}
                          className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-600">
                      {it.status === 'done' ? `${it.components.length}개` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {it.status === 'done' && hasProductSelf ? (
                        <input
                          type="number"
                          value={it.productSeverityScore}
                          min={1}
                          max={standardMeta.maxScore}
                          onChange={e => handleScoreEdit(it.id, parseInt(e.target.value) || 1)}
                          className={`w-12 px-1 py-0.5 border rounded text-xs font-bold text-center ${severityColors[it.productSeverityScore] || severityColors[1]}`}
                        />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {it.status === 'done' ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${severityColors[finalScore]}`}>
                          {finalScore}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {it.status === 'pending' && <span className="text-xs text-gray-400">대기</span>}
                      {it.status === 'parsing' && (
                        <span className="text-xs text-blue-600 flex items-center justify-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />파싱
                        </span>
                      )}
                      {it.status === 'kosha' && (
                        <span className="text-xs text-blue-600 flex items-center justify-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />KOSHA
                        </span>
                      )}
                      {it.status === 'done' && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                      )}
                      {it.status === 'error' && (
                        <span className="text-xs text-red-600 flex items-center justify-center gap-1" title={it.errorMsg}>
                          <XCircle className="w-3.5 h-3.5" />오류
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="제거"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 오류 상세 */}
      {items.some(it => it.status === 'error') && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-red-800 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />파싱 오류 ({items.filter(it => it.status === 'error').length}건)
          </p>
          <ul className="text-xs text-red-700 space-y-0.5 ml-5">
            {items.filter(it => it.status === 'error').map(it => (
              <li key={it.id}>· {it.fileName}: {it.errorMsg || '알 수 없는 오류'}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 안내 */}
      {items.length === 0 && (
        <div className="text-center text-xs text-gray-400 py-4">
          여러 MSDS 파일을 한 번에 등록할 수 있습니다.
          파일 추가 후 &quot;파싱 시작&quot; → 결과 확인 + 인라인 편집 → &quot;선택 등록&quot; 순서로 진행됩니다.
          상세 수정이 필요한 항목은 등록 후 개별 화면에서 편집할 수 있습니다.
        </div>
      )}
    </div>
  )
}
