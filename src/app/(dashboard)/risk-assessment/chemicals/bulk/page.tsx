'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Upload, FileSpreadsheet, FileText, AlertTriangle,
  CheckCircle2, XCircle, ChevronRight, Download, Loader2,
  FlaskConical, Wand2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as XLSX from 'xlsx'
import {
  detectColumns,
  looksLikeHeader,
  parseRows,
  collectUniqueCasNumbers,
  type ColumnMapping,
  type RawProduct,
  type FieldKey,
} from '@/lib/bulk-chemical-parser'
import {
  calculateComponentSeverity,
  calculateProductSeverity,
  getStandardMeta,
  SEVERITY_STANDARDS,
  STANDARDS_META,
  type SeverityStandard,
} from '@/lib/msds-rules'
import MsdsBulkPanel from '../_components/MsdsBulkPanel'

interface Workplace { id: string; name: string }

interface AnalyzedComponent {
  casNumber: string
  componentName: string
  concentration: string
  hazards: string
  regulations: string
  severityScore: number
  source: string  // 'cache' | 'kosha' | 'kosha-not-found' | 'error' | 'trade-secret'
}

interface AnalyzedProduct {
  rowIndex: number
  name: string
  manufacturer: string
  description: string
  severityScore: number
  components: AnalyzedComponent[]
  errors: string[]
  warnings: string[]
}

type Step = 'upload' | 'analyze' | 'preview' | 'result'
type BulkMode = 'csv' | 'msds'

const FIELD_LABELS: Record<FieldKey, string> = {
  name: '제품명',
  manufacturer: '제조사',
  description: '설명',
  casNumber: 'CAS 번호',
  componentName: '성분명',
  concentration: '함유량',
}

const REQUIRED_FIELDS: FieldKey[] = ['name', 'casNumber', 'componentName']

export default function ChemicalBulkPage() {
  const [step, setStep] = useState<Step>('upload')
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWorkplace, setSelectedWorkplace] = useState('')
  const [severityStandard, setSeverityStandard] = useState<SeverityStandard>('SAEUMTER')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [dataRows, setDataRows] = useState<(string | number | null | undefined)[][]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [detectConfidence, setDetectConfidence] = useState(0)
  const [detectSource, setDetectSource] = useState<'heuristic' | 'claude'>('heuristic')
  const [products, setProducts] = useState<AnalyzedProduct[]>([])
  const [analyzeProgress, setAnalyzeProgress] = useState<{ total: number; completed: number; currentCas: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [bulkMode, setBulkMode] = useState<BulkMode>('csv')

  const standardMeta = getStandardMeta(severityStandard)

  useEffect(() => {
    fetch('/api/workplaces').then(r => r.json()).then(d => setWorkplaces(d.workplaces || []))
  }, [])

  const stats = useMemo(() => {
    const errorCount = products.filter(p => p.errors.length > 0).length
    const warnCount = products.filter(p => p.warnings.length > 0 && p.errors.length === 0).length
    const okCount = products.filter(p => p.errors.length === 0).length
    const totalComponents = products.reduce((sum, p) => sum + p.components.length, 0)
    return { errorCount, warnCount, okCount, totalComponents, total: products.length }
  }, [products])

  // ─── 파일 업로드 + 컬럼 자동 감지 ─────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

    const readFile = (): Promise<(string | number | null | undefined)[][]> => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          let rows: (string | number | null | undefined)[][] = []
          if (ext === 'csv') {
            const text = e.target?.result as string
            const wb = XLSX.read(text, { type: 'string' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(ws, { header: 1 })
          } else {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const wb = XLSX.read(data, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(ws, { header: 1 })
          }
          resolve(rows)
        } catch (err) { reject(err) }
      }
      reader.onerror = () => reject(reader.error)
      if (ext === 'csv') reader.readAsText(file, 'UTF-8')
      else reader.readAsArrayBuffer(file)
    })

    try {
      const allRows = await readFile()
      if (allRows.length === 0) { alert('빈 파일입니다.'); return }

      // 헤더 추정
      const firstRowStr = allRows[0].map(v => String(v ?? ''))
      const hasHeader = looksLikeHeader(firstRowStr)
      const headerRow = hasHeader ? firstRowStr : firstRowStr.map((_, i) => `컬럼 ${i + 1}`)
      const restRows = hasHeader ? allRows.slice(1) : allRows

      // 휴리스틱 감지
      const detect = detectColumns(headerRow)
      let finalMapping = detect.mapping
      let confidence = detect.confidence
      let source: 'heuristic' | 'claude' = 'heuristic'

      // confidence < 0.6이면 Claude fallback
      if (confidence < 0.6) {
        try {
          const sampleRows = restRows.slice(0, 3).map(r => r.map(v => String(v ?? '')))
          const res = await fetch('/api/risk-assessment/chemicals/detect-columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ headers: headerRow, sampleRows }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.mapping) {
              finalMapping = data.mapping
              confidence = typeof data.confidence === 'number' ? data.confidence : confidence
              source = 'claude'
            }
          }
        } catch { /* fallback silently */ }
      }

      setHeaders(headerRow)
      setDataRows(restRows)
      setMapping(finalMapping)
      setDetectConfidence(confidence)
      setDetectSource(source)
      setStep('analyze')
    } catch {
      alert('파일 파싱에 실패했습니다. 올바른 Excel/CSV 파일인지 확인해주세요.')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  // ─── 자동 분석: KOSHA + 중대성 점수 ───────────────────────
  const runAnalysis = async () => {
    const missingRequired = REQUIRED_FIELDS.filter(f => mapping[f] === undefined)
    if (missingRequired.length > 0) {
      alert(`필수 컬럼이 매핑되지 않았습니다: ${missingRequired.map(f => FIELD_LABELS[f]).join(', ')}`)
      return
    }

    const raw = parseRows(dataRows, mapping)
    if (raw.length === 0) { alert('파싱된 제품이 없습니다.'); return }

    const uniqueCas = collectUniqueCasNumbers(raw)
    setAnalyzeProgress({ total: uniqueCas.length, completed: 0, currentCas: '' })

    // CAS → { hazards, regulations, name }
    const lookupCache = new Map<string, { hazards: string; regulations: string; name: string }>()

    for (let i = 0; i < uniqueCas.length; i++) {
      const cas = uniqueCas[i]
      setAnalyzeProgress({ total: uniqueCas.length, completed: i, currentCas: cas })
      try {
        const res = await fetch(`/api/risk-assessment/chemicals/lookup?cas=${encodeURIComponent(cas)}`)
        if (res.ok) {
          const d = await res.json()
          lookupCache.set(cas, {
            hazards: d.hazards || '',
            regulations: d.regulations || '',
            name: d.name || '',
          })
        }
      } catch { /* 개별 실패 무시 */ }

      // KOSHA API 부하 방지 — DB 캐시 응답이면 빠르지만 안전하게 100ms
      if (i < uniqueCas.length - 1) {
        await new Promise(r => setTimeout(r, 150))
      }
    }
    setAnalyzeProgress({ total: uniqueCas.length, completed: uniqueCas.length, currentCas: '' })

    // RawProduct → AnalyzedProduct
    const analyzed: AnalyzedProduct[] = raw.map(p => {
      const components: AnalyzedComponent[] = p.components.map(c => {
        const cas = c.casNumber.trim()
        const isTradeSecret = cas === '영업비밀'
        if (isTradeSecret) {
          return {
            casNumber: cas,
            componentName: c.componentName || '영업비밀',
            concentration: c.concentration,
            hazards: standardMeta.tradeSecretFillsHazards ? standardMeta.tradeSecretHazardsText : '영업비밀',
            regulations: '',
            severityScore: standardMeta.tradeSecretScore,
            source: 'trade-secret',
          }
        }
        const cached = lookupCache.get(cas)
        const hazards = cached?.hazards || ''
        const regulations = cached?.regulations || ''
        const componentName = c.componentName || cached?.name || ''
        const severity = calculateComponentSeverity(hazards, severityStandard, regulations)
        return {
          casNumber: cas,
          componentName,
          concentration: c.concentration,
          hazards,
          regulations,
          severityScore: severity,
          source: cached ? (hazards || regulations ? 'kosha' : 'kosha-not-found') : 'error',
        }
      })

      const errors: string[] = []
      const warnings: string[] = []
      if (!p.name) errors.push('제품명이 비어있습니다.')
      if (components.length === 0) warnings.push('구성성분이 없습니다.')
      components.forEach((c, ci) => {
        if (!c.casNumber) errors.push(`성분 ${ci + 1}: CAS 번호 누락`)
        if (!c.componentName) warnings.push(`성분 ${ci + 1}: 성분명 누락 (CAS만 등록)`)
        if (c.source === 'kosha-not-found') warnings.push(`성분 ${ci + 1} (${c.casNumber}): KOSHA에서 정보 없음 → 1점 부여`)
      })

      const productSeverity = calculateProductSeverity(components.map(c => c.severityScore))

      return {
        rowIndex: p.rowIndex,
        name: p.name,
        manufacturer: p.manufacturer,
        description: p.description,
        severityScore: productSeverity,
        components,
        errors,
        warnings,
      }
    })

    setProducts(analyzed)
    setAnalyzeProgress(null)
    setStep('preview')
  }

  // ─── 기준 변경 시 모든 제품 점수 재계산 (미리보기 단계) ──
  const handleStandardChangeInPreview = (next: SeverityStandard) => {
    setSeverityStandard(next)
    const nextMeta = STANDARDS_META[next]
    setProducts(prev => prev.map(p => {
      const components = p.components.map(c => {
        if (c.source === 'trade-secret') {
          return {
            ...c,
            hazards: nextMeta.tradeSecretFillsHazards ? nextMeta.tradeSecretHazardsText : '영업비밀',
            severityScore: nextMeta.tradeSecretScore,
          }
        }
        return { ...c, severityScore: calculateComponentSeverity(c.hazards, next, c.regulations) }
      })
      return { ...p, components, severityScore: calculateProductSeverity(components.map(c => c.severityScore)) }
    }))
  }

  // ─── 등록 제출 ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedWorkplace) { alert('사업장을 선택해주세요.'); return }
    const validProducts = products.filter(p => p.errors.length === 0)
    if (validProducts.length === 0) { alert('등록 가능한 제품이 없습니다.'); return }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/risk-assessment/chemicals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workplaceId: selectedWorkplace,
          severityStandard,
          products: validProducts.map(p => ({
            name: p.name,
            manufacturer: p.manufacturer,
            description: p.description,
            severityScore: p.severityScore,
            components: p.components.map(c => ({
              casNumber: c.casNumber,
              name: c.componentName,
              concentration: c.concentration,
              hazards: c.hazards,
              regulations: c.regulations,
              severityScore: c.severityScore,
            })),
          })),
        }),
      })
      const data = await res.json()
      if (res.ok) { setSubmitResult(data); setStep('result') }
      else alert(data.error || '등록에 실패했습니다.')
    } catch {
      alert('서버와의 통신에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadSample = () => {
    const csv = '제품명,제조사,설명,CAS번호,성분명,함유량\n' +
      '아세톤 세정제,삼성화학,금속 세정용,67-64-1,아세톤,80\n' +
      ',,,64-17-5,에탄올,15\n' +
      '톨루엔 희석제,LG화학,도장 희석제,108-88-3,톨루엔,90\n' +
      ',,,1330-20-7,크실렌,8\n'
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '화학제품_일괄등록_샘플.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── 매핑 변경 (analyze 단계) ───
  const setFieldColumn = (field: FieldKey, col: number | undefined) => {
    setMapping(prev => {
      const next: ColumnMapping = { ...prev }
      // 같은 col이 다른 필드에 잡혀있으면 그 필드는 해제
      if (col !== undefined) {
        for (const f of Object.keys(next) as FieldKey[]) {
          if (next[f] === col && f !== field) delete next[f]
        }
        next[field] = col
      } else {
        delete next[field]
      }
      return next
    })
  }

  // ─── 미리보기 인라인 수정 ───
  const updateProduct = (idx: number, field: 'name' | 'manufacturer' | 'description', value: string) => {
    setProducts(prev => prev.map((p, i) => i === idx ? revalidate({ ...p, [field]: value }) : p))
  }
  const updateComponent = (pIdx: number, cIdx: number, field: 'casNumber' | 'componentName' | 'concentration' | 'severityScore', value: string) => {
    setProducts(prev => prev.map((p, pi) => {
      if (pi !== pIdx) return p
      const components = p.components.map((c, ci) => {
        if (ci !== cIdx) return c
        if (field === 'severityScore') {
          const v = Math.max(1, Math.min(standardMeta.maxScore, parseInt(value) || 1))
          return { ...c, severityScore: v }
        }
        return { ...c, [field]: value }
      })
      const productSeverity = calculateProductSeverity(components.map(c => c.severityScore))
      return revalidate({ ...p, components, severityScore: productSeverity })
    }))
  }
  const removeProduct = (idx: number) => setProducts(prev => prev.filter((_, i) => i !== idx))

  function revalidate(p: AnalyzedProduct): AnalyzedProduct {
    const errors: string[] = []
    const warnings: string[] = []
    if (!p.name) errors.push('제품명이 비어있습니다.')
    if (p.components.length === 0) warnings.push('구성성분이 없습니다.')
    p.components.forEach((c, ci) => {
      if (!c.casNumber) errors.push(`성분 ${ci + 1}: CAS 번호 누락`)
      if (!c.componentName) warnings.push(`성분 ${ci + 1}: 성분명 누락`)
    })
    return { ...p, errors, warnings }
  }

  // 모드 전환 시 csv 진행 상태를 안전한 위치로 리셋
  const switchMode = (next: BulkMode) => {
    if (next === bulkMode) return
    setBulkMode(next)
    setStep('upload')
    setSubmitResult(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/risk-assessment/chemicals" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">화학제품 일괄등록</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {bulkMode === 'csv'
              ? 'CSV/Excel 업로드 → 자동 컬럼 인식 → KOSHA 조회 → 중대성 자동 산정'
              : 'MSDS 파일(PDF/HWP/DOCX) 여러 개를 한 번에 업로드 → 자동 파싱 → 검토 후 일괄 등록'}
          </p>
        </div>
        <FlaskConical className="w-6 h-6 text-purple-600" />
      </div>

      {/* Mode Tab */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => switchMode('csv')}
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
            bulkMode === 'csv'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 inline mr-1.5" />
          CSV / Excel 일괄
        </button>
        <button
          type="button"
          onClick={() => switchMode('msds')}
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
            bulkMode === 'msds'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-1.5" />
          MSDS 파일 다중 업로드
        </button>
      </div>

      {/* Step indicator (CSV 흐름에서만 의미가 있음) */}
      {bulkMode === 'csv' && (
        <div className="flex items-center gap-2 text-sm">
          <StepBadge num={1} label="파일 업로드" active={step === 'upload'} done={step !== 'upload'} />
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <StepBadge num={2} label="컬럼 매핑 & 분석" active={step === 'analyze'} done={step === 'preview' || step === 'result'} />
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <StepBadge num={3} label="미리보기" active={step === 'preview'} done={step === 'result'} />
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <StepBadge num={4} label="등록 결과" active={step === 'result'} done={false} />
        </div>
      )}

      {/* 사업장 + 중대성평가 기준 (csv 첫 단계 또는 msds 모드) */}
      {((bulkMode === 'csv' && step === 'upload') || bulkMode === 'msds') && (
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">사업장 선택 *</label>
                <select value={selectedWorkplace} onChange={e => setSelectedWorkplace(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">사업장을 선택하세요</option>
                  {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">중대성평가 기준</label>
                <select value={severityStandard} onChange={e => setSeverityStandard(e.target.value as SeverityStandard)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  {SEVERITY_STANDARDS.map(s => <option key={s} value={s}>{STANDARDS_META[s].label}</option>)}
                </select>
                {bulkMode === 'csv' && (
                  <p className="text-xs text-gray-400 mt-1">CSV 흐름은 미리보기 단계에서도 변경 가능합니다.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MSDS 다중 업로드 패널 */}
      {bulkMode === 'msds' && (
        <MsdsBulkPanel workplaceId={selectedWorkplace} severityStandard={severityStandard} />
      )}

      {/* Step 1: Upload (CSV) */}
      {bulkMode === 'csv' && step === 'upload' && (
        <Card>
          <CardHeader><CardTitle className="text-base">CSV / Excel 파일 업로드</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              onClick={() => document.getElementById('bulk-file-input')?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}>
              <Upload className={`w-12 h-12 mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-gray-300'}`} />
              <p className="text-sm text-gray-600 font-medium">파일을 드래그하거나 클릭하여 선택하세요</p>
              <p className="text-xs text-gray-400 mt-1.5">Excel (.xlsx, .xls) 또는 CSV (.csv) 지원</p>
              <input id="bulk-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleInputChange} className="hidden" />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> 파일 형식 안내
              </h3>
              <div className="text-xs text-gray-600 space-y-1.5">
                <p><strong>필요한 컬럼:</strong> 제품명, 제조사(선택), 설명(선택), CAS번호, 성분명, 함유량</p>
                <p><strong>중대성 점수는 입력하지 않습니다.</strong> 시스템이 KOSHA MSDS를 자동 조회하여 선택한 기준으로 산정합니다.</p>
                <p><strong>컬럼 순서는 자유롭습니다.</strong> 헤더 텍스트로 자동 인식하며, 인식이 어려운 경우 Claude AI가 보조합니다.</p>
                <p><strong>다중 성분 제품:</strong> 첫 행에 제품명, 다음 행들은 제품명을 비우고 CAS/성분만 채워 같은 제품의 성분으로 묶입니다.</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2.5 text-xs text-yellow-800 space-y-1">
                <p className="font-medium flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> 처리되지 않는 파일 형식</p>
                <ul className="list-disc list-inside space-y-0.5 text-yellow-700 ml-1">
                  <li>상단 행에 <strong>병합된 셀(문서 제목, 회사 로고 영역 등)</strong>이 있는 파일 → 첫 행이 헤더여야 합니다.</li>
                  <li><strong>여러 시트(탭)로 분리된 엑셀</strong> → 첫 번째 시트만 읽히므로, 필요한 데이터를 한 시트로 모아주세요.</li>
                  <li>제품 정보가 <strong>가로 방향으로 펼쳐진 표</strong>(피벗형) → 세로 방향 표로 변환해 주세요.</li>
                  <li>이미지/도형/주석으로만 표시된 데이터 → 셀에 텍스트로 입력해 주세요.</li>
                </ul>
                <p className="text-yellow-700">위 형식의 파일은 샘플 CSV를 받아 데이터를 옮겨 담은 후 업로드해 주세요.</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDownloadSample() }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                <Download className="w-3.5 h-3.5" /> 샘플 파일 다운로드 (CSV)
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Analyze (column mapping + KOSHA enrichment) */}
      {step === 'analyze' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-600" />
                컬럼 자동 매핑 결과
                <span className={`text-xs font-normal px-2 py-0.5 rounded ${detectConfidence >= 0.8 ? 'bg-green-100 text-green-700' : detectConfidence >= 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  신뢰도 {Math.round(detectConfidence * 100)}% · {detectSource === 'claude' ? 'Claude AI' : '휴리스틱'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-3">각 필드별로 매칭된 컬럼을 확인하고 필요시 수정하세요.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Object.keys(FIELD_LABELS) as FieldKey[]).map(field => (
                  <div key={field} className="flex items-center gap-2">
                    <label className="text-sm text-gray-700 w-20 shrink-0">
                      {FIELD_LABELS[field]}
                      {REQUIRED_FIELDS.includes(field) && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <select
                      value={mapping[field] ?? ''}
                      onChange={e => setFieldColumn(field, e.target.value === '' ? undefined : parseInt(e.target.value))}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
                    >
                      <option value="">— 매칭 안 함 —</option>
                      {headers.map((h, i) => <option key={i} value={i}>[{i}] {h || '(빈 헤더)'}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* 샘플 데이터 미리보기 */}
              <div className="mt-4 overflow-x-auto">
                <p className="text-xs text-gray-500 mb-1.5">데이터 미리보기 (상위 5행)</p>
                <table className="w-full text-[11px] border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map((h, i) => {
                        const mapped = (Object.keys(mapping) as FieldKey[]).find(f => mapping[f] === i)
                        return (
                          <th key={i} className="px-2 py-1.5 border text-left font-medium text-gray-600">
                            <div className="flex flex-col">
                              <span className="text-gray-400 text-[9px]">[{i}]</span>
                              <span>{h || '(빈 헤더)'}</span>
                              {mapped && <span className="text-[9px] text-blue-600 font-semibold">→ {FIELD_LABELS[mapped]}</span>}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {headers.map((_, i) => (
                          <td key={i} className="px-2 py-1 border-r last:border-r-0 text-gray-700">
                            {String(row[i] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 분석 진행률 */}
          {analyzeProgress && (
            <Card>
              <CardContent className="py-5 space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-medium">
                    {analyzeProgress.completed >= analyzeProgress.total
                      ? 'KOSHA 조회 완료, 중대성 점수 계산 중...'
                      : `KOSHA 조회 중 ${analyzeProgress.completed + 1}/${analyzeProgress.total}: ${analyzeProgress.currentCas}`}
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.round((analyzeProgress.completed / Math.max(analyzeProgress.total, 1)) * 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={() => { setStep('upload'); setHeaders([]); setDataRows([]); setMapping({}); setFileName('') }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              다시 선택
            </button>
            <div className="flex-1" />
            <button
              onClick={runAnalysis}
              disabled={analyzeProgress !== null || REQUIRED_FIELDS.some(f => mapping[f] === undefined)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {analyzeProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              자동 분석 시작 (KOSHA + 중대성)
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <SummaryCard label="파일" value={fileName} small />
            <SummaryCard label="제품" value={`${stats.total}건`} />
            <SummaryCard label="성분" value={`${stats.totalComponents}종`} />
            <SummaryCard label="정상" value={`${stats.okCount}건`} color="green" />
            <SummaryCard label="오류" value={`${stats.errorCount}건`} color={stats.errorCount > 0 ? 'red' : 'gray'} />
          </div>

          <Card>
            <CardContent className="py-3 flex items-center gap-4">
              <label className="text-sm text-gray-700">중대성평가 기준:</label>
              <select value={severityStandard} onChange={e => handleStandardChangeInPreview(e.target.value as SeverityStandard)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white">
                {SEVERITY_STANDARDS.map(s => <option key={s} value={s}>{STANDARDS_META[s].label}</option>)}
              </select>
              {!selectedWorkplace && (
                <>
                  <span className="text-gray-300">|</span>
                  <label className="text-sm text-gray-700">사업장:</label>
                  <select value={selectedWorkplace} onChange={e => setSelectedWorkplace(e.target.value)}
                    className="px-3 py-1.5 border border-yellow-300 rounded text-sm bg-yellow-50">
                    <option value="">선택하세요</option>
                    {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
                  </select>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 w-8">상태</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 w-10">행</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[140px]">제품명</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[100px]">제조사</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[120px]">설명</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 w-16">제품점수</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 w-12">성분수</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[300px]">구성성분 (CAS / 성분명 / 함유량 / 점수 / 출처)</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p, pi) => (
                    <tr key={pi} className={p.errors.length > 0 ? 'bg-red-50/50' : p.warnings.length > 0 ? 'bg-yellow-50/50' : ''}>
                      <td className="px-3 py-2">
                        {p.errors.length > 0 ? (
                          <span title={p.errors.join('\n')}><XCircle className="w-4 h-4 text-red-500" /></span>
                        ) : p.warnings.length > 0 ? (
                          <span title={p.warnings.join('\n')}><AlertTriangle className="w-4 h-4 text-yellow-500" /></span>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-400">{p.rowIndex}</td>
                      <td className="px-3 py-2"><EditableCell value={p.name} onChange={v => updateProduct(pi, 'name', v)} /></td>
                      <td className="px-3 py-2"><EditableCell value={p.manufacturer} onChange={v => updateProduct(pi, 'manufacturer', v)} /></td>
                      <td className="px-3 py-2"><EditableCell value={p.description} onChange={v => updateProduct(pi, 'description', v)} /></td>
                      <td className="px-3 py-2 text-center"><SeverityBadge score={p.severityScore} maxScore={standardMeta.maxScore} /></td>
                      <td className="px-3 py-2 text-center text-gray-600">{p.components.length}</td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          {p.components.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-1.5 text-[11px]">
                              <EditableCell value={c.casNumber} onChange={v => updateComponent(pi, ci, 'casNumber', v)} className="w-24" placeholder="CAS" />
                              <span className="text-gray-300">/</span>
                              <EditableCell value={c.componentName} onChange={v => updateComponent(pi, ci, 'componentName', v)} className="w-24" placeholder="성분명" />
                              <span className="text-gray-300">/</span>
                              <EditableCell value={c.concentration} onChange={v => updateComponent(pi, ci, 'concentration', v)} className="w-14" placeholder="함유량" />
                              <span className="text-gray-300">/</span>
                              <input type="number" value={c.severityScore} min={1} max={standardMeta.maxScore}
                                onChange={e => updateComponent(pi, ci, 'severityScore', e.target.value)}
                                className="w-10 px-1 py-0.5 border border-gray-200 rounded text-[10px] text-center" />
                              <span className={`text-[9px] ${c.source === 'kosha' ? 'text-green-600' : c.source === 'cache' ? 'text-blue-600' : c.source === 'kosha-not-found' ? 'text-yellow-600' : c.source === 'trade-secret' ? 'text-purple-600' : 'text-red-500'}`}>
                                {c.source === 'kosha' ? 'KOSHA' : c.source === 'cache' ? '캐시' : c.source === 'kosha-not-found' ? '미발견' : c.source === 'trade-secret' ? '영업비밀' : '오류'}
                              </span>
                            </div>
                          ))}
                          {p.components.length === 0 && <span className="text-gray-300">-</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeProduct(pi)} className="p-1 text-gray-300 hover:text-red-500" title="삭제">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {stats.warnCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-yellow-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                경고(노란색) 표시가 있는 제품은 등록 전에 직접 확인하고 수정해야 합니다
              </p>
              <p className="text-xs text-yellow-700">
                KOSHA에서 정보를 찾지 못했거나 일부 필드가 누락된 경우 자동 산정된 점수가 부정확할 수 있습니다.
                해당 행을 클릭해 직접 점수와 정보를 검토해주세요.
              </p>
              <div className="text-xs text-yellow-700 space-y-0.5 mt-1">
                {products.filter(p => p.warnings.length > 0 && p.errors.length === 0).map((p, i) => (
                  <p key={i}>행 {p.rowIndex} ({p.name || '제품명 없음'}): {p.warnings.join(', ')}</p>
                ))}
              </div>
            </div>
          )}

          {stats.errorCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-red-700">오류가 있는 제품은 등록되지 않습니다</p>
              <div className="text-xs text-red-600 space-y-0.5">
                {products.filter(p => p.errors.length > 0).map((p, i) => (
                  <p key={i}>행 {p.rowIndex} ({p.name || '제품명 없음'}): {p.errors.join(', ')}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => setStep('analyze')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              컬럼 매핑 다시 확인
            </button>
            <div className="flex-1" />
            <span className="text-xs text-gray-400">
              {stats.okCount}건 등록 예정 {stats.errorCount > 0 && `(${stats.errorCount}건 제외)`}
            </span>
            <button onClick={handleSubmit} disabled={isSubmitting || stats.okCount === 0 || !selectedWorkplace}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 등록 중...</> : <><Upload className="w-4 h-4" /> {stats.okCount}건 일괄등록</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && submitResult && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <div>
              <p className="text-xl font-bold text-gray-900">일괄등록 완료</p>
              <p className="text-sm text-gray-500 mt-1">
                총 <strong className="text-green-600">{submitResult.created}건</strong>의 화학제품이 등록되었습니다.
              </p>
            </div>
            {submitResult.errors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-yellow-700 mb-1">일부 오류 ({submitResult.errors.length}건)</p>
                <div className="text-xs text-yellow-600 space-y-0.5">
                  {submitResult.errors.map((e, i) => <p key={i}>행 {e.row}: {e.message}</p>)}
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href="/risk-assessment/chemicals" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                화학물질 목록으로
              </Link>
              <button onClick={() => { setStep('upload'); setProducts([]); setFileName(''); setSubmitResult(null); setHeaders([]); setDataRows([]); setMapping({}) }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                추가 등록
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Sub-components ───
function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
      active ? 'bg-blue-100 text-blue-700' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
    }`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
        active ? 'bg-blue-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'
      }`}>{done ? '✓' : num}</span>
      {label}
    </div>
  )
}

function SummaryCard({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-600', red: 'text-red-600', yellow: 'text-yellow-600', gray: 'text-gray-400',
  }
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <p className="text-[10px] text-gray-500">{label}</p>
        <p className={`${small ? 'text-xs truncate' : 'text-lg font-bold'} ${color ? colorMap[color] || '' : 'text-gray-800'}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function SeverityBadge({ score, maxScore }: { score: number; maxScore: number }) {
  const colors: Record<number, string> = {
    5: 'bg-red-100 text-red-700', 4: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700', 2: 'bg-blue-100 text-blue-700', 1: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${colors[score] || 'bg-gray-100 text-gray-600'}`}>
      {score}/{maxScore}
    </span>
  )
}

function EditableCell({ value, onChange, className, placeholder }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [temp, setTemp] = useState(value)
  if (editing) {
    return (
      <input autoFocus value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { onChange(temp); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(temp); setEditing(false) } }}
        className={`px-1 py-0.5 border border-blue-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${className || 'w-full'}`}
        placeholder={placeholder} />
    )
  }
  return (
    <span onClick={() => { setTemp(value); setEditing(true) }}
      className={`inline-block cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 min-w-[20px] ${className || ''} ${!value ? 'text-gray-300' : ''}`}
      title="클릭하여 수정">
      {value || placeholder || '—'}
    </span>
  )
}
