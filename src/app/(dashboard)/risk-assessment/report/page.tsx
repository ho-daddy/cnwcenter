'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Download, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Workplace { id: string; name: string }

const REPORT_TYPES = [
  {
    type: 'summary',
    title: '위험성평가 요약 보고서',
    desc: '평가카드 목록, 위험등급 분포, 위험분류별 통계, 개선현황 요약',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    btnColor: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    type: 'hazard-list',
    title: '위험요인 목록표',
    desc: '평가단위별 전체 위험요인 상세 목록 (중대성, 가능성, 위험성점수, 개선후 점수)',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    btnColor: 'bg-purple-600 hover:bg-purple-700',
  },
  {
    type: 'improvement-plan',
    title: '개선계획서',
    desc: '개선 예정/완료 항목별 현황표 (최초점수, 개선내용, 담당자, 개선후 점수)',
    color: 'text-green-600',
    bg: 'bg-green-100',
    btnColor: 'bg-green-600 hover:bg-green-700',
  },
]

export default function RiskAssessmentReportPage() {
  const currentYear = new Date().getFullYear()
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [selectedWorkplace, setSelectedWorkplace] = useState('')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/workplaces')
      .then(r => r.json())
      .then(d => {
        const wps = d.workplaces || []
        setWorkplaces(wps)
        if (wps.length === 1) setSelectedWorkplace(wps[0].id)
      })
  }, [])

  const handleGenerate = async (type: string) => {
    if (!selectedWorkplace) {
      setError('사업장을 선택해주세요.')
      return
    }
    setError(null)
    setGenerating(type)

    try {
      const params = new URLSearchParams({
        type,
        year: String(selectedYear),
        workplaceId: selectedWorkplace,
      })
      const res = await fetch(`/api/risk-assessment/report?${params}`)

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
      a.download = match ? decodeURIComponent(match[1]) : `보고서_${type}.pdf`
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
        <Link href="/risk-assessment" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보고서 생성</h1>
          <p className="text-sm text-gray-500 mt-0.5">위험성평가 결과를 PDF 보고서로 출력합니다</p>
        </div>
      </div>

      {/* 조건 선택 */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">사업장</label>
              <select
                value={selectedWorkplace}
                onChange={e => setSelectedWorkplace(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[200px]"
              >
                <option value="">선택하세요</option>
                {workplaces.map(wp => (
                  <option key={wp.id} value={wp.id}>{wp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">연도</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}년</option>
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

      {/* 보고서 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_TYPES.map(item => {
          const isGenerating = generating === item.type
          const isDisabled = generating !== null

          return (
            <Card key={item.type}>
              <CardContent className="pt-6">
                <div className={`w-12 h-12 ${item.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <FileText className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                <button
                  onClick={() => handleGenerate(item.type)}
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

      {generating && (
        <div className="text-center text-sm text-gray-500">
          PDF를 생성하고 있습니다. 잠시만 기다려주세요...
        </div>
      )}
    </div>
  )
}
