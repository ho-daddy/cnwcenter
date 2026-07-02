'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Wallet, Plus, X, Download, CheckCircle2, XCircle, Paperclip, FileText, HeartHandshake } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  level: string
  kind: 'INCOME' | 'EXPENSE'
  parentId: string | null
}

interface StaffUser {
  id: string
  name: string | null
}

interface Transaction {
  id: string
  kind: 'INCOME' | 'EXPENSE'
  accountType: 'PROFIT' | 'NONPROFIT'
  date: string
  amount: number
  description: string | null
  counterparty: string | null
  payMethod: string | null
  receiptUrl: string | null
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  category: { id: string; name: string; level: string } | null
  createdBy: { id: string; name: string | null }
  secretaryApprover: { id: string; name: string | null } | null
  directorApprover: { id: string; name: string | null } | null
}

const ACCOUNT_LABEL = { PROFIT: '수익통장', NONPROFIT: '비영리통장' } as const
const KIND_LABEL = { INCOME: '수입', EXPENSE: '지출' } as const
const APPROVAL_LABEL = { PENDING: '결재대기', APPROVED: '승인', REJECTED: '반려' } as const
const APPROVAL_COLOR = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
} as const

const now = new Date()
const EMPTY_FORM = {
  kind: 'EXPENSE' as 'INCOME' | 'EXPENSE',
  accountType: 'NONPROFIT' as 'PROFIT' | 'NONPROFIT',
  date: now.toISOString().slice(0, 10),
  amount: '',
  categoryId: '',
  description: '',
  counterparty: '',
  payMethod: '',
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balances, setBalances] = useState<{ PROFIT: number; NONPROFIT: number }>({ PROFIT: 0, NONPROFIT: 0 })
  const [categories, setCategories] = useState<Category[]>([])
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [filterAccount, setFilterAccount] = useState('')
  const [filterKind, setFilterKind] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [approvingId, setApprovingId] = useState<string | null>(null)

  const fetchMeta = useCallback(async () => {
    const [catRes, staffRes] = await Promise.all([
      fetch('/api/finance/categories'),
      fetch('/api/admin/users?role=STAFF&status=APPROVED'),
    ])
    if (catRes.ok) setCategories((await catRes.json()).categories)
    if (staffRes.ok) {
      const d = await staffRes.json()
      setStaff(d.users ?? [])
    }
  }, [])

  const fetchTransactions = useCallback(async (y: number, m: number, accountType: string, kind: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ year: String(y), month: String(m) })
      if (accountType) params.set('accountType', accountType)
      if (kind) params.set('kind', kind)
      const res = await fetch(`/api/finance/transactions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions)
        setBalances(data.balances)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchMeta() }, [fetchMeta])
  useEffect(() => { fetchTransactions(year, month, filterAccount, filterKind) }, [year, month, filterAccount, filterKind, fetchTransactions])

  const openNew = () => { setForm(EMPTY_FORM); setReceiptFile(null); setError(''); setShowForm(true) }

  const handleSave = async () => {
    if (!form.amount || parseInt(form.amount) <= 0) { setError('금액을 입력해주세요.'); return }
    setSaving(true); setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.set(k, v))
      if (receiptFile) fd.set('receipt', receiptFile)

      const res = await fetch('/api/finance/transactions', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? '저장 실패'); return }
      setShowForm(false)
      fetchTransactions(year, month, filterAccount, filterKind)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 거래 내역을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' })
    if (res.ok) fetchTransactions(year, month, filterAccount, filterKind)
  }

  const setApproval = async (id: string, approvalStatus: 'APPROVED' | 'REJECTED') => {
    const res = await fetch(`/api/finance/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalStatus }),
    })
    if (res.ok) fetchTransactions(year, month, filterAccount, filterKind)
    setApprovingId(null)
  }

  const setApprovers = async (id: string, key: 'secretaryApproverId' | 'directorApproverId', value: string) => {
    const res = await fetch(`/api/finance/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.ok) fetchTransactions(year, month, filterAccount, filterKind)
  }

  const handleExport = () => {
    window.open(`/api/finance/transactions/export?year=${year}&month=${month}`, '_blank')
  }

  const categoryOptions = categories.filter(c => c.kind === form.kind)

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Wallet className="w-6 h-6 text-blue-600" />
          재정관리
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/finance/donors" className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <HeartHandshake className="w-4 h-4" /> 후원회원
          </Link>
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> 월별 엑셀 다운로드
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> 거래 등록
          </button>
        </div>
      </div>

      {/* 계좌별 잔액 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">수익통장 잔액 (누적)</p>
          <p className="text-2xl font-bold text-gray-900">{balances.PROFIT.toLocaleString()}원</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">비영리통장 잔액 (누적)</p>
          <p className="text-2xl font-bold text-gray-900">{balances.NONPROFIT.toLocaleString()}원</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3">
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
          <option value="">전체 계좌</option>
          <option value="PROFIT">수익통장</option>
          <option value="NONPROFIT">비영리통장</option>
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={filterKind} onChange={e => setFilterKind(e.target.value)}>
          <option value="">수입/지출 전체</option>
          <option value="INCOME">수입</option>
          <option value="EXPENSE">지출</option>
        </select>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">해당 기간 거래 내역이 없습니다.</div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-gray-600">날짜</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">계좌</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">구분</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">분류</th>
                <th className="px-3 py-3 text-right font-medium text-gray-600">금액</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">적요</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">영수증</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">결재</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{t.date.slice(0, 10)}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{ACCOUNT_LABEL[t.accountType]}</td>
                  <td className="px-3 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', t.kind === 'INCOME' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700')}>
                      {KIND_LABEL[t.kind]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{t.category?.name ?? '—'}</td>
                  <td className="px-3 py-3 text-right font-mono text-gray-900">{t.amount.toLocaleString()}</td>
                  <td className="px-3 py-3 text-gray-500 max-w-[200px] truncate">{t.description || t.counterparty || '—'}</td>
                  <td className="px-3 py-3 text-center">
                    {t.receiptUrl ? (
                      <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex text-blue-600 hover:text-blue-800">
                        <Paperclip className="w-4 h-4" />
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    {approvingId === t.id ? (
                      <div className="flex flex-col gap-1 min-w-[220px]">
                        <select className="text-xs border border-gray-300 rounded px-1.5 py-1" value={t.secretaryApprover?.id ?? ''} onChange={e => setApprovers(t.id, 'secretaryApproverId', e.target.value)}>
                          <option value="">사무국장 지정</option>
                          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select className="text-xs border border-gray-300 rounded px-1.5 py-1" value={t.directorApprover?.id ?? ''} onChange={e => setApprovers(t.id, 'directorApproverId', e.target.value)}>
                          <option value="">센터장 지정</option>
                          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <div className="flex gap-1">
                          <button onClick={() => setApproval(t.id, 'APPROVED')} className="flex items-center gap-1 text-xs text-green-700 hover:bg-green-50 px-2 py-1 rounded"><CheckCircle2 className="w-3.5 h-3.5" />승인</button>
                          <button onClick={() => setApproval(t.id, 'REJECTED')} className="flex items-center gap-1 text-xs text-red-700 hover:bg-red-50 px-2 py-1 rounded"><XCircle className="w-3.5 h-3.5" />반려</button>
                          <button onClick={() => setApprovingId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">닫기</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setApprovingId(t.id)} className={cn('px-2 py-0.5 rounded-full text-xs font-medium', APPROVAL_COLOR[t.approvalStatus])}>
                        {APPROVAL_LABEL[t.approvalStatus]}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-600 transition-colors text-xs">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 거래 등록 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />거래 등록</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">수입/지출 *</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as 'INCOME' | 'EXPENSE', categoryId: '' }))}>
                    <option value="EXPENSE">지출</option>
                    <option value="INCOME">수입</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">계좌 구분 *</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value as 'PROFIT' | 'NONPROFIT' }))}>
                    <option value="NONPROFIT">비영리통장</option>
                    <option value="PROFIT">수익통장</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">날짜 *</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">금액 (원) *</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="100000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">분류(관/항/목)</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">선택 안 함</option>
                  {categoryOptions.map(c => <option key={c.id} value={c.id}>[{c.level}] {c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">적요</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="예: 7월 사무실 임대료" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">거래처</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">지급방법</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="계좌이체/카드/현금" value={form.payMethod} onChange={e => setForm(f => ({ ...f, payMethod: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">영수증 사진</label>
                <input type="file" accept="image/*,application/pdf" onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">취소</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
