'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HeartHandshake, ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DonationRow {
  id: number
  name: string
  phone: string
  email: string | null
  bankName: string
  monthlyAmount: number
  withdrawDay: number
  status: string
  campaign: string | null
  isAnjaebeom: boolean
  createdAt: string
  matchedMember: { id: string; name: string; phone: string } | null
}

const STATUS_LABEL: Record<string, string> = { pending: '대기', completed: '완료', cancelled: '취소' }

export default function DonorsPage() {
  const [donations, setDonations] = useState<DonationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/finance/donations')
      .then(async (res) => {
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '조회 실패') }
        return res.json()
      })
      .then((d) => setDonations(d.donations))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  const matchedCount = donations.filter((d) => d.matchedMember).length

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/finance" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <HeartHandshake className="w-6 h-6 text-blue-600" />
          후원회원 (center.saeum.space 연동)
          <span className="text-sm font-normal text-gray-500">({donations.length}건, Member 매칭 {matchedCount}건)</span>
        </h1>
      </div>

      <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
        center.saeum.space(홈페이지)에서 접수된 CMS 후원 신청 데이터를 실시간 조회합니다(cross-schema 조회, 별도 동기화 아님).
        전화번호가 사무국 회원(Member)과 일치하면 자동으로 연결 표시됩니다.
      </p>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : donations.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">접수된 후원 신청이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">이름</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">연락처</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">캠페인</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">월 후원금</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">은행</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">사무국 회원 매칭</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{d.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{d.isAnjaebeom ? '안재범 특별후원' : '일반'}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">{d.monthlyAmount.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-gray-500">{d.bankName}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                      d.status === 'completed' ? 'bg-green-50 text-green-700' : d.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700')}>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.matchedMember ? (
                      <span className="inline-flex items-center gap-1 text-green-700 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />{d.matchedMember.name}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400 text-xs"><HelpCircle className="w-3.5 h-3.5" />미등록</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
