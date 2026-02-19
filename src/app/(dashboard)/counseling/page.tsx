'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Users, Plus, Search, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CaseItem {
  id: string
  caseNumber: string
  victimName: string
  victimContact: string
  accidentDate: string | null
  accidentType: string | null
  status: string
  createdAt: string
  user: { name: string | null }
  _count: { consultations: number }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN:        { label: '접수',   color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: '진행중', color: 'bg-amber-100 text-amber-700' },
  PENDING:     { label: '보류',   color: 'bg-gray-100 text-gray-600' },
  CLOSED:      { label: '종결',   color: 'bg-green-100 text-green-700' },
}

export default function CounselingPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchCases = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/counseling?${params}`)
      const data = await res.json()
      setCases(data.cases || [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCases() }, [search, statusFilter])

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600" />
          상담 관리
        </h1>
        <Link
          href="/counseling/new"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 케이스 등록
        </Link>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름 또는 케이스번호 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['', 'OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                statusFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {s === '' ? '전체' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">로딩 중...</div>
        ) : cases.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {search || statusFilter ? '검색 결과가 없습니다.' : '등록된 상담케이스가 없습니다.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {cases.map((c) => {
              const status = STATUS_CONFIG[c.status] ?? { label: c.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <Link
                  key={c.id}
                  href={`/counseling/${c.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{c.victimName}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', status.color)}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{c.caseNumber}</span>
                      {c.accidentType && <span>· {c.accidentType}</span>}
                      {c.accidentDate && (
                        <span>· 사고일: {format(new Date(c.accidentDate), 'yyyy.MM.dd', { locale: ko })}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-500">담당: {c.user.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      상담 {c._count.consultations}회 · {format(new Date(c.createdAt), 'MM/dd', { locale: ko })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
