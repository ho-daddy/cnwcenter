'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface StaffUser {
  id: string
  name: string | null
}

const CASE_TYPES = [
  { value: 'ACCIDENT', label: '사고' },
  { value: 'DISEASE', label: '질병' },
  { value: 'COMMUTE', label: '출퇴근' },
]

const DISEASE_CATEGORIES = [
  { value: 'TRAUMA', label: '외상' },
  { value: 'MUSCULOSKELETAL', label: '근골격계' },
  { value: 'CARDIOVASCULAR', label: '뇌심혈관계' },
  { value: 'NOISE_HEARING', label: '소음성난청' },
  { value: 'OTHER', label: '기타' },
]

export default function NewCounselingCasePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const isStaff = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'STAFF'

  const [form, setForm] = useState({
    victimName: '',
    victimContact: '',
    workplaceName: '',
    caseType: '',
    diseaseCategory: '',
    accidentDate: '',
    diagnosisDate: '',
    diagnosisName: '',
    guardianName: '',
    guardianContact: '',
    assignedTo: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isStaff) {
      fetch('/api/admin/users?role=STAFF')
        .then((r) => r.json())
        .then((d) => setStaffUsers(d.users || []))
    }
  }, [isStaff])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/counseling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const c = await res.json()
        router.push(`/counseling/${c.id}`)
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

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/counseling" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">새 상담 케이스 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {/* 재해자 정보 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">재해자 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">재해자 성명 <span className="text-red-500">*</span></label>
              <input type="text" value={form.victimName} onChange={(e) => set('victimName', e.target.value)}
                className={inputCls} placeholder="재해자 성명" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">연락처 <span className="text-red-500">*</span></label>
              <input type="text" value={form.victimContact} onChange={(e) => set('victimContact', e.target.value)}
                className={inputCls} placeholder="010-0000-0000" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">사업장명</label>
              <input type="text" value={form.workplaceName} onChange={(e) => set('workplaceName', e.target.value)}
                className={inputCls} placeholder="사업장명 입력" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">재해유형</label>
              <select value={form.caseType} onChange={(e) => set('caseType', e.target.value)} className={inputCls}>
                <option value="">선택하세요</option>
                {CASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 질병/진단 정보 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">질병/진단 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">질병분류</label>
              <select value={form.diseaseCategory} onChange={(e) => set('diseaseCategory', e.target.value)} className={inputCls}>
                <option value="">선택하세요</option>
                {DISEASE_CATEGORIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">재해일시</label>
              <input type="date" value={form.accidentDate} onChange={(e) => set('accidentDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">진단일시</label>
              <input type="date" value={form.diagnosisDate} onChange={(e) => set('diagnosisDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">진단명</label>
              <input type="text" value={form.diagnosisName} onChange={(e) => set('diagnosisName', e.target.value)}
                className={inputCls} placeholder="진단명 입력" />
            </div>
          </div>
        </div>

        {/* 보호자 정보 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">보호자 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">보호자 성명</label>
              <input type="text" value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)}
                className={inputCls} placeholder="보호자 성명" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">보호자 연락처</label>
              <input type="text" value={form.guardianContact} onChange={(e) => set('guardianContact', e.target.value)}
                className={inputCls} placeholder="010-0000-0000" />
            </div>
          </div>
        </div>

        {/* 담당자 */}
        {isStaff && staffUsers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">담당자</label>
            <select value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} className={inputCls}>
              <option value="">본인 (기본)</option>
              {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Link href="/counseling" className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">취소</Link>
          <button type="submit" disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isSubmitting ? '저장 중...' : '케이스 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
