'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tag, Plus, Pencil, Trash2, X, Users } from 'lucide-react'

interface Group {
  id: string
  name: string
  description: string | null
  _count: { members: number }
}

export default function MemberGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Group | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchGroups = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/member-groups')
      if (res.ok) setGroups(await res.json())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const openNew = () => { setEditing(null); setName(''); setDescription(''); setError(''); setShowForm(true) }
  const openEdit = (g: Group) => { setEditing(g); setName(g.name); setDescription(g.description ?? ''); setError(''); setShowForm(true) }

  const handleSave = async () => {
    if (!name.trim()) { setError('그룹명을 입력해주세요.'); return }
    setSaving(true); setError('')
    try {
      const url = editing ? `/api/member-groups/${editing.id}` : '/api/member-groups'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description }) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? '저장 실패'); return }
      setShowForm(false)
      fetchGroups()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, groupName: string, count: number) => {
    if (count > 0 && !confirm(`${groupName} 그룹에는 회원 ${count}명이 있습니다. 그룹을 삭제하면 회원은 이 그룹에서 해제됩니다. 계속하시겠습니까?`)) return
    if (count === 0 && !confirm(`${groupName} 그룹을 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/member-groups/${id}`, { method: 'DELETE' })
    if (res.ok) fetchGroups()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Tag className="w-6 h-6 text-blue-600" />
          그룹 관리
        </h1>
        <button onClick={openNew} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> 그룹 추가
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">등록된 그룹이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {groups.map(g => (
              <li key={g.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{g.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Users className="w-3 h-3" />{g._count.members}명
                    </span>
                  </div>
                  {g.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{g.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(g)} className="text-gray-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(g.id, g.name, g._count.members)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{editing ? '그룹 편집' : '그룹 추가'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">그룹명 *</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="예: 후원회원" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">설명</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="그룹 설명 (선택)" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">취소</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
