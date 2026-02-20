'use client'

import { useState, useRef, useCallback } from 'react'
import {
  FileText, Upload, Loader2, CheckCircle2,
  AlertTriangle, X, ChevronDown, ChevronUp,
} from 'lucide-react'

export interface MsdsParseResult {
  productName: string
  manufacturer: string
  description: string
  components: { casNumber: string; name: string; concentration: string }[]
  warnings: string[]
}

interface Props {
  onParsed: (result: MsdsParseResult) => void
}

type Status = 'idle' | 'parsing' | 'done' | 'error'

export default function MsdsUploadSection({ onParsed }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [collapsed, setCollapsed] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<MsdsParseResult | null>(null)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'docx', 'doc'].includes(ext)) {
      setErrorMsg('PDF, DOCX, DOC 파일만 지원합니다.')
      setStatus('error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('파일 크기는 20MB 이하여야 합니다.')
      setStatus('error')
      return
    }

    setFileName(file.name)
    setStatus('parsing')
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/risk-assessment/chemicals/parse-msds', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'MSDS 분석에 실패했습니다.')
      }

      const data: MsdsParseResult = await res.json()
      setResult(data)
      setStatus('done')
      setCollapsed(true) // 결과 요약만 표시
      onParsed(data)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'MSDS 분석 중 오류가 발생했습니다.')
      setStatus('error')
    }
  }, [onParsed])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const reset = () => {
    setStatus('idle')
    setResult(null)
    setFileName('')
    setErrorMsg('')
    setCollapsed(false)
  }

  // 완료 후 축소된 요약 바
  if (status === 'done' && collapsed && result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800">
            MSDS 자동 입력 완료
          </p>
          <p className="text-xs text-green-600 truncate">
            {result.productName && `${result.productName} · `}
            성분 {result.components.length}종 추출
            {result.warnings.length > 0 && ` · 주의사항 ${result.warnings.length}건`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="text-green-600 hover:text-green-800 p-1"
          title="상세 보기"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={reset}
          className="text-green-600 hover:text-red-500 p-1"
          title="초기화"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => status === 'done' ? setCollapsed(!collapsed) : undefined}
        className="w-full px-5 py-3 flex items-center gap-2 text-left bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100"
      >
        <FileText className="w-5 h-5 text-purple-600" />
        <span className="text-sm font-semibold text-gray-800 flex-1">MSDS 자동 입력</span>
        <span className="text-xs text-gray-400">물질안전보건자료 파일에서 제품 정보를 자동 추출합니다</span>
        {status === 'done' && (
          collapsed
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Body */}
      <div className="p-5 space-y-3">
        {/* Idle: 업로드 영역 */}
        {(status === 'idle' || status === 'error') && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-300 hover:bg-gray-50'
              }`}
            >
              <Upload className={`w-10 h-10 mx-auto mb-2 ${dragOver ? 'text-purple-500' : 'text-gray-300'}`} />
              <p className="text-sm text-gray-600 font-medium">
                MSDS 파일을 드래그하거나 클릭하여 선택
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, DOCX, DOC 지원 · 이미지 PDF는 AI OCR로 추출
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleInputChange}
              className="hidden"
            />

            {status === 'error' && errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-xs text-red-500 hover:text-red-700 mt-1 underline"
                  >
                    다시 시도
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Parsing: 분석 중 */}
        {status === 'parsing' && (
          <div className="text-center py-6 space-y-3">
            <Loader2 className="w-10 h-10 mx-auto text-purple-500 animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-700">MSDS 문서 분석 중...</p>
              <p className="text-xs text-gray-400 mt-1">
                AI가 {fileName}에서 제품명, 성분 정보를 추출하고 있습니다
              </p>
              <p className="text-xs text-gray-400">
                이미지 PDF의 경우 OCR 처리로 시간이 더 소요될 수 있습니다
              </p>
            </div>
          </div>
        )}

        {/* Done: 결과 상세 */}
        {status === 'done' && !collapsed && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">추출 완료</span>
              <span className="text-xs text-gray-400 ml-auto">{fileName}</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-xs text-gray-500">제품명</span>
                  <p className="font-medium text-gray-800 truncate">{result.productName || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">제조사</span>
                  <p className="text-gray-700 truncate">{result.manufacturer || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">구성성분</span>
                  <p className="text-gray-700">{result.components.length}종</p>
                </div>
              </div>
              {result.description && (
                <div>
                  <span className="text-xs text-gray-500">용도</span>
                  <p className="text-gray-700 text-xs">{result.description}</p>
                </div>
              )}
            </div>

            {result.components.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1.5">추출된 성분 목록</p>
                <div className="space-y-1">
                  {result.components.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-4">{i + 1}.</span>
                      <span className="font-mono text-gray-600 w-24">{c.casNumber || '—'}</span>
                      <span className="text-gray-800 flex-1 truncate">{c.name || '—'}</span>
                      <span className="text-gray-500">{c.concentration ? `${c.concentration}%` : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-medium text-yellow-700 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  추출 주의사항
                </p>
                <ul className="text-xs text-yellow-600 space-y-0.5">
                  {result.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="flex-1 py-1.5 text-xs text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                접기
              </button>
              <button
                type="button"
                onClick={reset}
                className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
              >
                초기화
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              아래 폼에서 자동 입력된 내용을 확인/수정한 후 등록해주세요.
              KOSHA 자동검색이 진행되어 유해성·규제사항이 입력됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
