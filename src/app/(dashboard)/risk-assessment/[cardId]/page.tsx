'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ArrowLeft, Plus, Trash2, ChevronRight, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react'
import {
  getRiskLevel, HAZARD_CATEGORY_LABELS, HAZARD_CATEGORY_COLORS, EVALUATION_TYPE_LABELS,
} from '@/lib/risk-assessment'
import { cn } from '@/lib/utils'

interface Hazard {
  id: string
  hazardCategory: string
  hazardFactor: string
  severityScore: number
  likelihoodScore: number
  additionalPoints: number
  riskScore: number
  improvementPlan: string | null
  chemicalProduct: { id: string; name: string } | null
  _count: { improvements: number }
}

interface Card {
  id: string
  evaluationType: string
  evaluationReason: string | null
  year: number
  workerName: string
  evaluatorName: string
  workDescription: string
  dailyWorkingHours: string | null
  dailyProduction: string | null
  annualWorkingDays: string | null
  workCycle: string | null
  createdAt: string
  updatedAt: string
  workplace: { name: string }
  organizationUnit: { name: string }
  hazards: Hazard[]
}

export default function RiskAssessmentCardPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const router = useRouter()
  const [card, setCard] = useState<Card | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/risk-assessment/${cardId}`)
      .then((r) => r.json())
      .then(setCard)
      .finally(() => setIsLoading(false))
  }, [cardId])

  const handleDeleteCard = async () => {
    if (!confirm('이 평가카드와 모든 위험요인을 삭제하시겠습니까?')) return
    setIsDeleting(true)
    const res = await fetch(`/api/risk-assessment/${cardId}`, { method: 'DELETE' })
    if (res.ok) router.push('/risk-assessment')
    else setIsDeleting(false)
  }

  const handleDeleteHazard = async (hazardId: string) => {
    if (!confirm('이 위험요인을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/risk-assessment/${cardId}/hazards/${hazardId}`, { method: 'DELETE' })
    if (res.ok) {
      setCard((prev) => prev ? { ...prev, hazards: prev.hazards.filter((h) => h.id !== hazardId) } : prev)
    }
  }

  if (isLoading) return <div className="text-center py-20 text-sm text-gray-400">로딩 중...</div>
  if (!card) return <div className="text-center py-20 text-sm text-gray-400">카드를 찾을 수 없습니다.</div>

  const highRiskHazards = card.hazards.filter((h) => h.riskScore >= 9)
  const pendingImprovements = card.hazards.reduce((sum, h) => sum + h._count.improvements, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/risk-assessment" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {card.organizationUnit.name}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {card.workplace.name} · {EVALUATION_TYPE_LABELS[card.evaluationType]} · {card.year}년
          </p>
        </div>
        <button onClick={handleDeleteCard} disabled={isDeleting}
          className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
          삭제
        </button>
      </div>

      {/* 요약 배지 */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="font-medium text-gray-700">위험요인 {card.hazards.length}건</span>
        </div>
        {highRiskHazards.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="font-medium text-red-700">높음 이상 {highRiskHazards.length}건</span>
          </div>
        )}
        {pendingImprovements > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="font-medium text-amber-700">개선이력 {pendingImprovements}건</span>
          </div>
        )}
      </div>

      {/* 작업 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">작업 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <div><span className="text-gray-500">작업자:</span> <span className="font-medium ml-1">{card.workerName}</span></div>
          <div><span className="text-gray-500">평가자:</span> <span className="font-medium ml-1">{card.evaluatorName}</span></div>
          {card.dailyWorkingHours && <div><span className="text-gray-500">1일 작업시간:</span> <span className="ml-1">{card.dailyWorkingHours}</span></div>}
          {card.dailyProduction && <div><span className="text-gray-500">1일 생산량:</span> <span className="ml-1">{card.dailyProduction}</span></div>}
          {card.annualWorkingDays && <div><span className="text-gray-500">연간 작업일:</span> <span className="ml-1">{card.annualWorkingDays}</span></div>}
          {card.workCycle && <div><span className="text-gray-500">작업 주기:</span> <span className="ml-1">{card.workCycle}</span></div>}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">작업 내용</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{card.workDescription}</p>
        </div>
        {card.evaluationReason && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">수시조사 사유</p>
            <p className="text-sm text-gray-800">{card.evaluationReason}</p>
          </div>
        )}
      </div>

      {/* 위험요인 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">유해위험요인 목록</h2>
          <Link
            href={`/risk-assessment/${cardId}/hazards/new`}
            className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            요인 추가
          </Link>
        </div>

        {card.hazards.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            아직 등록된 위험요인이 없습니다.
            <br />
            <Link href={`/risk-assessment/${cardId}/hazards/new`} className="text-blue-600 hover:underline mt-1 inline-block">
              첫 번째 위험요인 추가하기 →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {card.hazards.map((hazard, idx) => {
              const risk = getRiskLevel(hazard.riskScore)
              return (
                <div key={hazard.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-gray-400 w-5 shrink-0 pt-0.5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', HAZARD_CATEGORY_COLORS[hazard.hazardCategory])}>
                          {HAZARD_CATEGORY_LABELS[hazard.hazardCategory]}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', risk.bg, risk.color)}>
                          {hazard.riskScore}점 ({risk.label})
                        </span>
                        {hazard._count.improvements > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            개선이력 {hazard._count.improvements}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 font-medium">{hazard.hazardFactor}</p>
                      {hazard.chemicalProduct && (
                        <p className="text-xs text-purple-600 mt-0.5">화학물질: {hazard.chemicalProduct.name}</p>
                      )}
                      {hazard.improvementPlan && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">개선계획: {hazard.improvementPlan}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        중대성 {hazard.severityScore} × 가능성 {hazard.likelihoodScore}
                        {hazard.additionalPoints > 0 && ` + ${hazard.additionalPoints}점`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/risk-assessment/${cardId}/hazards/${hazard.id}`}
                        className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        상세 <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteHazard(hazard.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-right">
        마지막 수정: {format(new Date(card.updatedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
      </p>
    </div>
  )
}
