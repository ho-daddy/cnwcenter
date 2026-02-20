'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Upload, FileSpreadsheet, AlertTriangle,
  CheckCircle2, XCircle, ChevronRight, Download, Loader2,
  FlaskConical, Pencil,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────
interface Workplace { id: string; name: string }

interface ParsedComponent {
  casNumber: string
  name: string
  concentration: string
  severityScore: number
}

interface ParsedProduct {
  rowIndex: number // Excel 원본 행번호
  name: string
  manufacturer: string
  description: string
  severityScore: number
  components: ParsedComponent[]
  errors: string[]
  warnings: string[]
}

type Step = 'upload' | 'preview' | 'result'

// ─── Helpers ──────────────────────────────────────────
function parseExcelData(rows: (string | number | null | undefined)[][]): ParsedProduct[] {
  const products: ParsedProduct[] = []
  let currentProduct: ParsedProduct | null = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const a = String(row[0] ?? '').trim() // 제품명
    const b = String(row[1] ?? '').trim() // 제조사
    const c = String(row[2] ?? '').trim() // 설명
    const d = String(row[3] ?? '').trim() // 중대성(제품)
    const e = String(row[4] ?? '').trim() // CAS번호
    const f = String(row[5] ?? '').trim() // 성분명
    const g = String(row[6] ?? '').trim() // 함유량
    const h = String(row[7] ?? '').trim() // 중대성(성분)

    // 제품 행: A열(제품명)이 채워져 있으면 새 제품
    if (a) {
      currentProduct = {
        rowIndex: i + 2, // 1-indexed + 헤더행
        name: a,
        manufacturer: b,
        description: c,
        severityScore: parseScore(d),
        components: [],
        errors: [],
        warnings: [],
      }
      products.push(currentProduct)

      // 같은 행에 성분 데이터도 있으면 추가
      if (e || f) {
        currentProduct.components.push({
          casNumber: e,
          name: f,
          concentration: normalizeConcentration(g),
          severityScore: parseScore(h),
        })
      }
    } else if (currentProduct && (e || f)) {
      // 성분 행: A열 비어있고 E/F열 있으면 성분 추가
      currentProduct.components.push({
        casNumber: e,
        name: f,
        concentration: normalizeConcentration(g),
        severityScore: parseScore(h),
      })
    }
  }

  // 검증
  for (const p of products) {
    if (!p.name) p.errors.push('제품명이 비어있습니다.')
    if (p.components.length === 0) p.warnings.push('구성성분이 없습니다.')
    for (let ci = 0; ci < p.components.length; ci++) {
      const comp = p.components[ci]
      if (!comp.casNumber) p.errors.push(`성분 ${ci + 1}: CAS번호가 비어있습니다.`)
      if (!comp.name) p.errors.push(`성분 ${ci + 1}: 성분명이 비어있습니다.`)
      if (comp.severityScore < 1 || comp.severityScore > 5) {
        p.warnings.push(`성분 ${ci + 1}: 중대성 점수(${comp.severityScore})가 1~5 범위를 벗어납니다.`)
      }
    }
    if (p.severityScore < 1 || p.severityScore > 5) {
      p.warnings.push(`제품 중대성 점수(${p.severityScore})가 1~5 범위를 벗어납니다.`)
    }
  }

  return products
}

function parseScore(val: string): number {
  const n = parseInt(val)
  return isNaN(n) ? 1 : Math.max(1, Math.min(5, n))
}

function normalizeConcentration(val: string): string {
  if (!val) return ''
  const lower = val.toLowerCase()
  if (lower === '모름' || lower === '영업비밀' || lower === 'unknown' || lower === 'trade secret') {
    return val
  }
  // 숫자만 있으면 % 추가하지 않음 (서버에서 그대로 저장)
  return val
}

function generateSampleCSV(): string {
  const header = '제품명,제조사,설명,중대성점수,CAS번호,성분명,함유량(%),성분중대성점수'
  const rows = [
    '아세톤 세정제,삼성화학,금속 세정용,3,67-64-1,아세톤,80,3',
    ',,,, 64-17-5,에탄올,15,1',
    '톨루엔 희석제,LG화학,도장 희석제,4,108-88-3,톨루엔,90,4',
    ',,,, 1330-20-7,크실렌,8,3',
  ]
  return [header, ...rows].join('\n')
}

// ─── Component ────────────────────────────────────────
export default function ChemicalBulkPage() {
  const [step, setStep] = useState<Step>('upload')
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWorkplace, setSelectedWorkplace] = useState('')
  const [fileName, setFileName] = useState('')
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)

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

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

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

        // 첫 행이 헤더인지 확인 (제품명, CAS번호 등 키워드)
        if (rows.length > 0) {
          const firstRow = rows[0].map(v => String(v ?? '').toLowerCase())
          const isHeader = firstRow.some(v =>
            v.includes('제품명') || v.includes('cas') || v.includes('product') || v.includes('성분')
          )
          if (isHeader) rows = rows.slice(1) // 헤더 제거
        }

        const parsed = parseExcelData(rows)
        setProducts(parsed)
        setStep('preview')
      } catch {
        alert('파일 파싱에 실패했습니다. 올바른 Excel/CSV 파일인지 확인해주세요.')
      }
    }

    if (ext === 'csv') {
      reader.readAsText(file, 'UTF-8')
    } else {
      reader.readAsArrayBuffer(file)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDownloadSample = () => {
    const csv = generateSampleCSV()
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '화학제품_일괄등록_샘플.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

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
          products: validProducts.map(p => ({
            name: p.name,
            manufacturer: p.manufacturer,
            description: p.description,
            severityScore: p.severityScore,
            components: p.components,
          })),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitResult(data)
        setStep('result')
      } else {
        alert(data.error || '등록에 실패했습니다.')
      }
    } catch {
      alert('서버와의 통신에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 인라인 수정
  const updateProduct = (idx: number, field: keyof ParsedProduct, value: string) => {
    setProducts(prev => {
      const next = [...prev]
      const p = { ...next[idx] }
      if (field === 'severityScore') {
        p.severityScore = parseScore(value)
      } else {
        (p as Record<string, unknown>)[field] = value
      }
      next[idx] = p
      return revalidate(next)
    })
  }

  const updateComponent = (pIdx: number, cIdx: number, field: keyof ParsedComponent, value: string) => {
    setProducts(prev => {
      const next = [...prev]
      const p = { ...next[pIdx], components: [...next[pIdx].components] }
      const c = { ...p.components[cIdx] }
      if (field === 'severityScore') {
        c.severityScore = parseScore(value)
      } else {
        (c as Record<string, unknown>)[field] = value
      }
      p.components[cIdx] = c
      next[pIdx] = p
      return revalidate(next)
    })
  }

  const removeProduct = (idx: number) => {
    setProducts(prev => prev.filter((_, i) => i !== idx))
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
          <p className="text-sm text-gray-500 mt-0.5">Excel/CSV 파일로 화학제품과 구성성분을 한번에 등록</p>
        </div>
        <FlaskConical className="w-6 h-6 text-purple-600" />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <StepBadge num={1} label="파일 업로드" active={step === 'upload'} done={step !== 'upload'} />
        <ChevronRight className="w-4 h-4 text-gray-300" />
        <StepBadge num={2} label="미리보기 & 검증" active={step === 'preview'} done={step === 'result'} />
        <ChevronRight className="w-4 h-4 text-gray-300" />
        <StepBadge num={3} label="등록 결과" active={step === 'result'} done={false} />
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">파일 업로드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 사업장 선택 */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">사업장 선택 *</label>
              <select
                value={selectedWorkplace}
                onChange={e => setSelectedWorkplace(e.target.value)}
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">사업장을 선택하세요</option>
                {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
              </select>
            </div>

            {/* 드래그 & 드롭 */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('bulk-file-input')?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-gray-300'}`} />
              <p className="text-sm text-gray-600 font-medium">
                파일을 드래그하거나 클릭하여 선택하세요
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                Excel (.xlsx, .xls) 또는 CSV (.csv) 형식 지원
              </p>
              <input
                id="bulk-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>

            {/* 샘플 & 안내 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                파일 형식 안내
              </h3>
              <div className="text-xs text-gray-600 space-y-1.5">
                <p><strong>8개 열 구조:</strong> 제품명, 제조사, 설명, 중대성점수, CAS번호, 성분명, 함유량(%), 성분중대성점수</p>
                <p><strong>계층 구조:</strong> 제품 행(A열=제품명 채움) → 성분 행(A열 비우고 E~H열 채움)</p>
                <p><strong>함유량:</strong> 숫자(0~100) 또는 &quot;모름&quot;, &quot;영업비밀&quot;</p>
                <p><strong>중대성점수:</strong> 1~5 (높을수록 위험)</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownloadSample() }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                샘플 파일 다운로드 (CSV)
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview & Validation */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <SummaryCard label="파일" value={fileName} small />
            <SummaryCard label="제품" value={`${stats.total}건`} />
            <SummaryCard label="성분" value={`${stats.totalComponents}종`} />
            <SummaryCard label="정상" value={`${stats.okCount}건`} color="green" />
            <SummaryCard label="오류" value={`${stats.errorCount}건`} color={stats.errorCount > 0 ? 'red' : 'gray'} />
          </div>

          {/* Workplace */}
          {!selectedWorkplace && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
              <div className="flex-1 text-sm text-yellow-700">사업장을 선택해주세요.</div>
              <select
                value={selectedWorkplace}
                onChange={e => setSelectedWorkplace(e.target.value)}
                className="px-2 py-1 border rounded text-sm bg-white"
              >
                <option value="">선택</option>
                {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
              </select>
            </div>
          )}

          {/* Product table */}
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
                    <th className="px-3 py-2 text-center font-medium text-gray-500 w-16">중대성</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 w-12">성분수</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[200px]">구성성분 (CAS / 성분명 / 함유량 / 점수)</th>
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
                      <td className="px-3 py-2">
                        <EditableCell value={p.name} onChange={v => updateProduct(pi, 'name', v)} />
                      </td>
                      <td className="px-3 py-2">
                        <EditableCell value={p.manufacturer} onChange={v => updateProduct(pi, 'manufacturer', v)} />
                      </td>
                      <td className="px-3 py-2">
                        <EditableCell value={p.description} onChange={v => updateProduct(pi, 'description', v)} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <SeverityBadge score={p.severityScore} />
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{p.components.length}</td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          {p.components.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-1.5 text-[11px]">
                              <EditableCell value={c.casNumber} onChange={v => updateComponent(pi, ci, 'casNumber', v)} className="w-24" placeholder="CAS" />
                              <span className="text-gray-300">/</span>
                              <EditableCell value={c.name} onChange={v => updateComponent(pi, ci, 'name', v)} className="w-20" placeholder="성분명" />
                              <span className="text-gray-300">/</span>
                              <EditableCell value={c.concentration} onChange={v => updateComponent(pi, ci, 'concentration', v)} className="w-14" placeholder="함유량" />
                              <span className="text-gray-300">/</span>
                              <SeverityBadge score={c.severityScore} />
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

          {/* Error details */}
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

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setStep('upload'); setProducts([]); setFileName('') }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              다시 선택
            </button>
            <div className="flex-1" />
            <span className="text-xs text-gray-400">
              {stats.okCount}건 등록 예정 {stats.errorCount > 0 && `(${stats.errorCount}건 제외)`}
            </span>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || stats.okCount === 0 || !selectedWorkplace}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {stats.okCount}건 일괄등록
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
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
                  {submitResult.errors.map((e, i) => (
                    <p key={i}>행 {e.row}: {e.message}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/risk-assessment/chemicals"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                화학물질 목록으로
              </Link>
              <button
                onClick={() => { setStep('upload'); setProducts([]); setFileName(''); setSubmitResult(null) }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                추가 등록
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────
function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
      active ? 'bg-blue-100 text-blue-700' :
      done ? 'bg-green-100 text-green-700' :
      'bg-gray-100 text-gray-400'
    }`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
        active ? 'bg-blue-600 text-white' :
        done ? 'bg-green-500 text-white' :
        'bg-gray-300 text-white'
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

function SeverityBadge({ score }: { score: number }) {
  const colors: Record<number, string> = {
    5: 'bg-red-100 text-red-700', 4: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700', 2: 'bg-blue-100 text-blue-700', 1: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${colors[score] || 'bg-gray-100 text-gray-600'}`}>
      {score}
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
      <input
        autoFocus
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { onChange(temp); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(temp); setEditing(false) } }}
        className={`px-1 py-0.5 border border-blue-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${className || 'w-full'}`}
        placeholder={placeholder}
      />
    )
  }

  return (
    <span
      onClick={() => { setTemp(value); setEditing(true) }}
      className={`inline-block cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 min-w-[20px] ${className || ''} ${!value ? 'text-gray-300' : ''}`}
      title="클릭하여 수정"
    >
      {value || placeholder || '—'}
    </span>
  )
}

// 재검증 헬퍼
function revalidate(products: ParsedProduct[]): ParsedProduct[] {
  return products.map(p => {
    const errors: string[] = []
    const warnings: string[] = []
    if (!p.name) errors.push('제품명이 비어있습니다.')
    if (p.components.length === 0) warnings.push('구성성분이 없습니다.')
    for (let ci = 0; ci < p.components.length; ci++) {
      const comp = p.components[ci]
      if (!comp.casNumber) errors.push(`성분 ${ci + 1}: CAS번호가 비어있습니다.`)
      if (!comp.name) errors.push(`성분 ${ci + 1}: 성분명이 비어있습니다.`)
      if (comp.severityScore < 1 || comp.severityScore > 5) {
        warnings.push(`성분 ${ci + 1}: 중대성 점수 범위 초과`)
      }
    }
    return { ...p, errors, warnings }
  })
}
