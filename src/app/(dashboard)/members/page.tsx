'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Contact2, Plus, Search, X, Pencil, Trash2, Tag, Upload, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Group {
  id: string
  name: string
}

interface Member {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  joinedAt: string
  groups: { group: Group }[]
}

interface MemberFormData {
  name: string
  phone: string
  email: string
  address: string
  notes: string
  groupIds: string[]
}

const EMPTY_FORM: MemberFormData = { name: '', phone: '', email: '', address: '', notes: '', groupIds: [] }

export default function MembersPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterGroupId, setFilterGroupId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [form, setForm] = useState<MemberFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const PAGE_SIZE = 50
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchGroups = useCallback(async () => {
    const res = await fetch('/api/member-groups')
    if (res.ok) setGroups(await res.json())
  }, [])

  const fetchMembers = useCallback(async (p: number, q: string, gid: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (q) params.set('search', q)
      if (gid) params.set('groupId', gid)
      const res = await fetch(`/api/members?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members)
        setTotal(data.total)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])
  useEffect(() => {
    const t = setTimeout(() => fetchMembers(page, search, filterGroupId), 200)
    return () => clearTimeout(t)
  }, [page, search, filterGroupId, fetchMembers])

  const openNew = () => { setEditingMember(null); setForm(EMPTY_FORM); setError(''); setShowForm(true) }
  const openEdit = (m: Member) => {
    setEditingMember(m)
    setForm({ name: m.name, phone: m.phone, email: m.email ?? '', address: m.address ?? '', notes: m.notes ?? '', groupIds: m.groups.map(g => g.group.id) })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) { setError('이름과 전화번호는 필수입니다.'); return }
    setSaving(true); setError('')
    try {
      const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members'
      const method = editingMember ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? '저장 실패'); return }
      setShowForm(false)
      fetchMembers(page, search, filterGroupId)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} 회원을 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })
    if (res.ok) fetchMembers(page, search, filterGroupId)
  }

  const toggleGroup = (gid: string) => {
    setForm(f => ({ ...f, groupIds: f.groupIds.includes(gid) ? f.groupIds.filter(id => id !== gid) : [...f.groupIds, gid] }))
  }

  const handleExportCsv = async () => {
    const params = new URLSearchParams({ page: '1', limit: '9999' })
    if (filterGroupId) params.set('groupId', filterGroupId)
    if (search) params.set('search', search)
    const res = await fetch(`/api/members?${params}`)
    if (!res.ok) return
    const data = await res.json()
    const rows = [
      ['이름', '전화번호', '이메일', '주소', '메모', '그룹', '상태'],
      ...data.members.map((m: Member) => [
        m.name, m.phone, m.email ?? '', m.address ?? '', m.notes ?? '',
        m.groups.map((g: { group: Group }) => g.group.name).join('|'),
        m.isActive ? '활성' : '비활성',
      ]),
    ]
    const csv = rows.map(r => r.map((v: string) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = '회원목록.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
    const nameIdx = headers.findIndex(h => h === '이름')
    const phoneIdx = headers.findIndex(h => h === '전화번호')
    const emailIdx = headers.findIndex(h => h === '이메일')
    const addressIdx = headers.findIndex(h => h === '주소')
    const notesIdx = headers.findIndex(h => h === '메모')
    if (nameIdx < 0 || phoneIdx < 0) { alert('CSV 형식 오류: 이름, 전화번호 열이 필요합니다'); return }

    let ok = 0, skip = 0
    for (const line of lines.slice(1)) {
      const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.replace(/^"|"$/g, '')) ?? []
      const name = cols[nameIdx]?.trim(); const phone = cols[phoneIdx]?.trim()
      if (!name || !phone) continue
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email: cols[emailIdx]?.trim() || '', address: cols[addressIdx]?.trim() || '', notes: cols[notesIdx]?.trim() || '', groupIds: [] }),
      })
      if (res.ok) ok++; else skip++
    }
    alert(`가져오기 완료: 신규 ${ok}명, 중복/실패 ${skip}명`)
    e.target.value = ''
    fetchMembers(page, search, filterGroupId)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Contact2 className="w-6 h-6 text-blue-600" />
          회원 목록
          <span className="text-sm font-normal text-gray-500">({total}명)</span>
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> CSV 내보내기
          </button>
          <label className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" /> CSV 가져오기
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
          </label>
          <button onClick={openNew} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> 회원 추가
          </button>
        </div>
      </div>

      {/* 검색/필터 */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="이름 또는 전화번호 검색"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterGroupId}
          onChange={e => { setFilterGroupId(e.target.value); setPage(1) }}
        >
          <option value="">전체 그룹</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">등록된 회원이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">이름</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">전화번호</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">이메일</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">그룹</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{m.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{m.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.groups.map(({ group }) => (
                        <span key={group.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                          <Tag className="w-3 h-3" />{group.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', m.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {m.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(m)} className="text-gray-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(m.id, m.name)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">이전</button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">다음</button>
        </div>
      )}

      {/* 회원 추가/편집 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{editingMember ? '회원 편집' : '회원 추가'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="space-y-3">
              {[
                { label: '이름 *', key: 'name', placeholder: '홍길동' },
                { label: '전화번호 *', key: 'phone', placeholder: '01012345678' },
                { label: '이메일', key: 'email', placeholder: 'hong@example.com' },
                { label: '주소', key: 'address', placeholder: '충남 서산시...' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {groups.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">그룹</label>
                  <div className="flex flex-wrap gap-2">
                    {groups.map(g => (
                      <button
                        key={g.id}
                        onClick={() => toggleGroup(g.id)}
                        className={cn(
                          'px-3 py-1 text-xs rounded-full border transition-colors',
                          form.groupIds.includes(g.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 text-gray-600 hover:border-blue-400'
                        )}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {editingMember && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={form.groupIds !== undefined} onChange={() => {}} className="hidden" />
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={(form as any).isActive !== false}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.checked } as any))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    활성 회원
                  </label>
                </div>
              )}
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
