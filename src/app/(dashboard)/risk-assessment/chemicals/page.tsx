'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Search, FlaskConical, Trash2, Eye, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getRiskLevel } from '@/lib/risk-assessment'

interface Chemical {
  id: string
  name: string
  manufacturer: string | null
  description: string | null
  severityScore: number | null
  workplace: { id: string; name: string }
  _count: { components: number; unitLinks: number }
}

interface Workplace { id: string; name: string }

export default function ChemicalProductsPage() {
  const [chemicals, setChemicals] = useState<Chemical[]>([])
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterWorkplace, setFilterWorkplace] = useState('')
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'severity'>('name')

  useEffect(() => {
    fetch('/api/workplaces').then(r => r.json()).then(d => setWorkplaces(d.workplaces || []))
  }, [])

  useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (filterWorkplace) params.set('workplaceId', filterWorkplace)
    fetch(`/api/risk-assessment/chemicals?${params}`)
      .then(r => r.json())
      .then(d => { setChemicals(d.chemicals || []); setIsLoading(false) })
  }, [filterWorkplace])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 화학제품을 삭제하시겠습니까?\n연결된 구성성분 정보도 함께 삭제됩니다.`)) return
    const res = await fetch(`/api/risk-assessment/chemicals/${id}`, { method: 'DELETE' })
    if (res.ok) setChemicals(prev => prev.filter(c => c.id !== id))
  }

  const filtered = useMemo(() => {
    let list = chemicals
    if (searchText) {
      const q = searchText.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.manufacturer?.toLowerCase().includes(q) ?? false) ||
        (c.description?.toLowerCase().includes(q) ?? false)
      )
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'severity') return (b.severityScore ?? 0) - (a.severityScore ?? 0)
      return a.name.localeCompare(b.name)
    })
    return list
  }, [chemicals, searchText, sortBy])

  const stats = useMemo(() => ({
    total: chemicals.length,
    high: chemicals.filter(c => (c.severityScore ?? 0) >= 4).length,
    mid: chemicals.filter(c => (c.severityScore ?? 0) === 3).length,
    low: chemicals.filter(c => (c.severityScore ?? 0) <= 2).length,
  }), [chemicals])

  function severityBadge(score: number | null) {
    if (!score) return <span className="text-xs text-gray-300">—</span>
    const colors: Record<number, string> = {
      5: 'bg-red-100 text-red-700', 4: 'bg-orange-100 text-orange-700',
      3: 'bg-yellow-100 text-yellow-700', 2: 'bg-blue-100 text-blue-700', 1: 'bg-gray-100 text-gray-600',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[score] || 'bg-gray-100 text-gray-600'}`}>
        {score}점
      </span>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">화학물질 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">사업장에서 사용하는 화학제품 및 구성성분 관리</p>
        </div>
        <Link
          href="/risk-assessment/chemicals/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> 새 화학제품 등록
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-gray-500 mb-1">전체 등록</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-gray-500 mb-1">고위험 (4~5점)</p>
          <p className="text-2xl font-bold text-red-600">{stats.high}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-gray-500 mb-1">중위험 (3점)</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.mid}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-gray-500 mb-1">저위험 (1~2점)</p>
          <p className="text-2xl font-bold text-blue-600">{stats.low}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterWorkplace} onChange={e => setFilterWorkplace(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">전체 사업장</option>
          {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
            placeholder="제품명, 제조사 검색..." className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-56" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'name' | 'severity')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="name">이름순</option>
          <option value="severity">중대성 높은순</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length}건</span>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {chemicals.length === 0 ? (
                <div className="space-y-2">
                  <FlaskConical className="w-10 h-10 mx-auto text-gray-300" />
                  <p>등록된 화학제품이 없습니다.</p>
                  <Link href="/risk-assessment/chemicals/new" className="text-blue-600 hover:underline text-sm">새 화학제품 등록하기</Link>
                </div>
              ) : '검색 결과가 없습니다.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">제품명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">제조사</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">사업장</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">구성성분</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">사용 평가단위</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">중대성 점수</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/risk-assessment/chemicals/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {c.name}
                      </Link>
                      {c.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.manufacturer || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.workplace.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{c._count.components}종</td>
                    <td className="px-4 py-3 text-center text-gray-600">{c._count.unitLinks}개</td>
                    <td className="px-4 py-3 text-center">{severityBadge(c.severityScore)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/risk-assessment/chemicals/${c.id}`} className="p-1.5 text-gray-400 hover:text-blue-600" title="상세보기">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/risk-assessment/chemicals/${c.id}/edit`} className="p-1.5 text-gray-400 hover:text-green-600" title="수정">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-gray-400 hover:text-red-500" title="삭제">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
