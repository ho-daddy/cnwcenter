'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import {
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  ClipboardList,
  ListChecks,
  Table2,
} from 'lucide-react'

interface Workplace {
  id: string
  name: string
}

const PDF_REPORT_TYPES = [
  {
    type: 'summary',
    title: '조사결과 종합보고서',
    desc: '조사 현황, 관리수준 분포, 부위별 최고점수, RULA/REBA 결과, 개선 현황 요약',
    icon: ClipboardList,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    btnColor: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    type: 'detail',
    title: '부위별 상세 조사표',
    desc: '평가단위별 관리카드, 6개 부위 점수, RULA/REBA, 측정도구, 종합평가 상세',
    icon: Table2,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    btnColor: 'bg-purple-600 hover:bg-purple-700',
  },
  {
    type: 'improvement',
    title: '개선대책 보고서',
    desc: '전체 개선항목 목록, 문제점/개선방안, 담당자, 상태, 완료율 통계',
    icon: ListChecks,
    color: 'text-green-600',
    bg: 'bg-green-100',
    btnColor: 'bg-green-600 hover:bg-green-700',
  },
]

export default function MSReportPage() {
  const currentYear = new Date().getFullYear()
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWorkplace, setSelectedWorkplace] = useState('')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/workplaces')
      .then((r) => r.json())
      .then((d) => {
        const wps = d.workplaces || []
        setWorkplaces(wps)
        if (wps.length === 1) setSelectedWorkplace(wps[0].id)
      })
  }, [])

  const handleDownload = async (type: string, format: 'pdf' | 'excel') => {
    if (!selectedWorkplace) {
      setError('사업장을 선택해주세요.')
      return
    }
    setError(null)
    setGenerating(format === 'excel' ? 'excel' : type)

    try {
      const params = new URLSearchParams({
        year: String(selectedYear),
        workplaceId: selectedWorkplace,
        format,
      })
      if (format === 'pdf') params.set('type', type)

      const res = await fetch(`/api/musculoskeletal/report?${params}`)

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `보고서 생성 실패 (${res.status})`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : `보고서.${format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '보고서 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(null)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/musculoskeletal"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-1.5">보고서 생성 <HelpTooltip content="사업장과 연도를 선택한 후 원하는 보고서 유형의 다운로드 버튼을 클릭하세요." /></h1>
          <p className="text-sm text-gray-500 mt-0.5">
            근골격계유해요인조사 결과를 PDF 또는 Excel로 내보냅니다
          </p>
        </div>
      </div>

      {/* 조건 선택 */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                사업장
              </label>
              <select
                value={selectedWorkplace}
                onChange={(e) => setSelectedWorkplace(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[200px]"
              >
                <option value="">선택하세요</option>
                {workplaces.map((wp) => (
                  <option key={wp.id} value={wp.id}>
                    {wp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                연도
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* PDF 보고서 카드 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          PDF 보고서
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PDF_REPORT_TYPES.map((item) => {
            const isGenerating = generating === item.type
            const isDisabled = generating !== null
            const Icon = item.icon

            return (
              <Card key={item.type}>
                <CardContent className="pt-6">
                  <div
                    className={`w-12 h-12 ${item.bg} rounded-lg flex items-center justify-center mb-4`}
                  >
                    <Icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                  <button
                    onClick={() => handleDownload(item.type, 'pdf')}
                    disabled={isDisabled}
                    className={`mt-4 w-full px-4 py-2 text-white text-sm rounded-lg flex items-center justify-center gap-2 transition-colors
                      ${isDisabled ? 'bg-gray-300 cursor-not-allowed' : item.btnColor}`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        PDF 다운로드
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Excel 내보내기 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Excel 내보내기
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  전체 데이터 Excel 내보내기
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  3개 시트로 구성: 조사현황 요약, 부위별 상세 점수, 개선대책 목록.
                  필터/정렬이 적용되어 추가 분석이 가능합니다.
                </p>
              </div>
              <button
                onClick={() => handleDownload('', 'excel')}
                disabled={generating !== null}
                className={`px-6 py-2 text-white text-sm rounded-lg flex items-center gap-2 transition-colors flex-shrink-0
                  ${generating !== null ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {generating === 'excel' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Excel 다운로드
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {generating && (
        <div className="text-center text-sm text-gray-500">
          {generating === 'excel' ? 'Excel' : 'PDF'}을 생성하고 있습니다. 잠시만
          기다려주세요...
        </div>
      )}
    </div>
  )
}
