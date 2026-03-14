'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/help-tooltip'

interface Workplace {
  id: string
  name: string
}

interface OrgUnit {
  id: string
  name: string
  level: number
  isLeaf: boolean
  parentId: string | null
}

export default function NewRiskAssessmentPage() {
  const router = useRouter()
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currentYear = new Date().getFullYear()

  const [form, setForm] = useState({
    workplaceId: '',
    organizationUnitId: '',
    year: String(currentYear),
    evaluationType: 'REGULAR',
    evaluationReason: '',
    workerName: '',
    evaluatorName: '',
    workDescription: '',
    dailyWorkingHours: '',
    dailyProduction: '',
    annualWorkingDays: '',
    workCycle: '',
  })

  // 사업장 목록 로드
  useEffect(() => {
    fetch('/api/workplaces')
      .then((r) => r.json())
      .then((d) => setWorkplaces(d.workplaces || []))
  }, [])

  // 사업장 변경 시 조직 단위 로드
  useEffect(() => {
    if (!form.workplaceId) { setOrgUnits([]); return }
    fetch(`/api/workplaces/${form.workplaceId}/organizations`)
      .then((r) => r.json())
      .then((d) => {
        // 조직 단위 평탄화
        const units: OrgUnit[] = []
        const org = d.organizations?.[0]
        if (org) flattenUnits(org.units || [], units)
        setOrgUnits(units)
      })
  }, [form.workplaceId])

  function flattenUnits(units: OrgUnit[], result: OrgUnit[]) {
    for (const u of units) {
      result.push(u)
      if ((u as unknown as { children: OrgUnit[] }).children) {
        flattenUnits((u as unknown as { children: OrgUnit[] }).children, result)
      }
    }
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const card = await res.json()
        router.push(`/risk-assessment/conduct?cardId=${card.id}`)
      } else {
        const d = await res.json()
        setError(d.error ?? '저장 중 오류가 발생했습니다.')
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const leafUnits = orgUnits.filter((u) => u.isLeaf)
  const allUnits = leafUnits.length > 0 ? leafUnits : orgUnits

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/risk-assessment" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">새 위험성평가 작성 <HelpTooltip content="평가카드를 새로 생성합니다. 사업장과 조직 단위를 선택한 뒤 기본 정보를 입력해주세요." /></h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* 사업장 + 평가단위 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">사업장 <span className="text-red-500">*</span> <HelpTooltip content="위험성평가를 실시할 사업장을 선택하세요." side="right" /></label>
            <select
              value={form.workplaceId}
              onChange={(e) => { set('workplaceId', e.target.value); set('organizationUnitId', '') }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">선택하세요</option>
              {workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">조직 단위 <span className="text-red-500">*</span> <HelpTooltip content="조직도에서 평가할 부서/공정을 선택하세요. 말단 조직만 선택 가능합니다." side="right" /></label>
            <select
              value={form.organizationUnitId}
              onChange={(e) => set('organizationUnitId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={!form.workplaceId}
            >
              <option value="">선택하세요</option>
              {allUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {'  '.repeat(u.level - 1)}{u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 연도 + 평가구분 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">평가 연도 <span className="text-red-500">*</span></label>
            <select
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[0, 1, 2].map((i) => (
                <option key={i} value={currentYear - i}>{currentYear - i}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">평가 구분 <span className="text-red-500">*</span> <HelpTooltip content="정기조사: 매년 실시하는 정기 위험성평가\n수시조사: 사고 발생, 공정 변경 등 사유 발생 시 실시" side="right" /></label>
            <select
              value={form.evaluationType}
              onChange={(e) => set('evaluationType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="REGULAR">정기조사</option>
              <option value="OCCASIONAL">수시조사</option>
            </select>
          </div>
        </div>

        {/* 수시조사 사유 */}
        {form.evaluationType === 'OCCASIONAL' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">수시조사 사유 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.evaluationReason}
              onChange={(e) => set('evaluationReason', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="수시조사 실시 사유"
              required
            />
          </div>
        )}

        {/* 작업자 + 평가자 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">작업자 성명 <span className="text-red-500">*</span> <HelpTooltip content="해당 작업을 수행하는 작업자의 이름을 입력하세요." side="right" /></label>
            <input
              type="text"
              value={form.workerName}
              onChange={(e) => set('workerName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">평가자 성명 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.evaluatorName}
              onChange={(e) => set('evaluatorName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* 작업 정보 */}
        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">작업 정보 <HelpTooltip content="작업의 시간, 생산량, 근무일수 등 기본 정보를 입력하세요. 위험성 추정에 참고됩니다." /></h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">1일 작업시간</label>
              <input type="text" value={form.dailyWorkingHours} onChange={(e) => set('dailyWorkingHours', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 8시간" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">1일 생산량</label>
              <input type="text" value={form.dailyProduction} onChange={(e) => set('dailyProduction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 500개" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">연간 작업일수</label>
              <input type="text" value={form.annualWorkingDays} onChange={(e) => set('annualWorkingDays', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 250일" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">작업 주기</label>
              <input type="text" value={form.workCycle} onChange={(e) => set('workCycle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 2교대" />
            </div>
          </div>
        </div>

        {/* 작업 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">작업 내용 <span className="text-red-500">*</span> <HelpTooltip content="해당 공정/부서에서 수행하는 주요 작업을 구체적으로 기술해주세요." side="right" /></label>
          <textarea
            value={form.workDescription}
            onChange={(e) => set('workDescription', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="해당 공정/부서의 주요 작업 내용을 입력하세요"
            required
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Link href="/risk-assessment" className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            취소
          </Link>
          <button type="submit" disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isSubmitting ? '저장 중...' : '평가카드 생성'}
          </button>
        </div>
      </form>
    </div>
  )
}
