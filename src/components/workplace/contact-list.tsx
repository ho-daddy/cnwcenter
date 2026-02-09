'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Phone,
  Mail,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Star,
  User,
  Users,
  X,
  Save,
} from 'lucide-react'
import { ContactType } from '@prisma/client'
import { CONTACT_TYPE_LABELS } from '@/types/workplace'

interface Contact {
  id: string
  contactType: ContactType
  name: string
  position: string | null
  phone: string | null
  email: string | null
  isPrimary: boolean
}

interface ContactListProps {
  workplaceId: string
  initialContacts: Contact[]
}

export function ContactList({ workplaceId, initialContacts }: ContactListProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const [form, setForm] = useState({
    contactType: 'SAFETY_OFFICER' as ContactType,
    name: '',
    position: '',
    phone: '',
    email: '',
    isPrimary: false,
  })

  const resetForm = () => {
    setForm({
      contactType: 'SAFETY_OFFICER',
      name: '',
      position: '',
      phone: '',
      email: '',
      isPrimary: false,
    })
  }

  const handleAdd = async () => {
    if (!form.name.trim()) {
      alert('담당자명은 필수입니다.')
      return
    }

    setLoading('add')
    try {
      const res = await fetch(`/api/workplaces/${workplaceId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (res.ok) {
        // isPrimary로 추가된 경우 기존 대표 담당자 해제
        if (form.isPrimary) {
          setContacts((prev) =>
            prev.map((c) =>
              c.contactType === form.contactType ? { ...c, isPrimary: false } : c
            )
          )
        }
        setContacts((prev) => [...prev, data.contact])
        setAdding(false)
        resetForm()
      } else {
        alert(data.error || '추가에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoading(null)
    }
  }

  const handleUpdate = async (contactId: string) => {
    if (!form.name.trim()) {
      alert('담당자명은 필수입니다.')
      return
    }

    setLoading(contactId)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/contacts/${contactId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )

      const data = await res.json()
      if (res.ok) {
        // isPrimary로 변경된 경우 기존 대표 담당자 해제
        if (form.isPrimary) {
          setContacts((prev) =>
            prev.map((c) =>
              c.id !== contactId && c.contactType === form.contactType
                ? { ...c, isPrimary: false }
                : c
            )
          )
        }
        setContacts((prev) =>
          prev.map((c) => (c.id === contactId ? data.contact : c))
        )
        setEditingId(null)
        resetForm()
      } else {
        alert(data.error || '수정에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (contactId: string) => {
    if (!confirm('이 담당자를 삭제하시겠습니까?')) return

    setLoading(contactId)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/contacts/${contactId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId))
      } else {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoading(null)
    }
  }

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setForm({
      contactType: contact.contactType,
      name: contact.name,
      position: contact.position || '',
      phone: contact.phone || '',
      email: contact.email || '',
      isPrimary: contact.isPrimary,
    })
    setAdding(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setAdding(false)
    resetForm()
  }

  const safetyOfficers = contacts.filter((c) => c.contactType === 'SAFETY_OFFICER')
  const unionReps = contacts.filter((c) => c.contactType === 'UNION_REPRESENTATIVE')

  const renderContactRow = (contact: Contact) => {
    const isEditing = editingId === contact.id
    const isLoading = loading === contact.id

    if (isEditing) {
      return (
        <div key={contact.id} className="p-3 bg-blue-50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="담당자명 *"
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="직책"
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="전화번호"
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="이메일"
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                className="rounded"
              />
              <Star className="h-4 w-4 text-yellow-500" />
              대표 담당자
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleUpdate(contact.id)} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-gray-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{contact.name}</span>
              {contact.position && (
                <span className="text-sm text-gray-500">({contact.position})</span>
              )}
              {contact.isPrimary && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {contact.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => startEdit(contact)} disabled={isLoading}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(contact.id)} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
          </Button>
        </div>
      </div>
    )
  }

  const renderAddForm = (type: ContactType) => (
    <div className="p-3 bg-blue-50 rounded-lg space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="담당자명 *"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
          placeholder="직책"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="전화번호"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="이메일"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
            className="rounded"
          />
          <Star className="h-4 w-4 text-yellow-500" />
          대표 담당자
        </label>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAdd} disabled={loading === 'add'}>
            {loading === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : '추가'}
          </Button>
          <Button variant="ghost" size="sm" onClick={cancelEdit}>
            취소
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          담당자
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 안전보건업무 담당자 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              {CONTACT_TYPE_LABELS.SAFETY_OFFICER}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(true)
                setEditingId(null)
                setForm({ ...form, contactType: 'SAFETY_OFFICER' })
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </div>
          <div className="space-y-2">
            {safetyOfficers.map(renderContactRow)}
            {adding && form.contactType === 'SAFETY_OFFICER' && renderAddForm('SAFETY_OFFICER')}
            {safetyOfficers.length === 0 && !adding && (
              <p className="text-sm text-gray-400 py-2">등록된 담당자가 없습니다.</p>
            )}
          </div>
        </div>

        <hr />

        {/* 노동조합 안전보건담당자 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              {CONTACT_TYPE_LABELS.UNION_REPRESENTATIVE}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(true)
                setEditingId(null)
                setForm({ ...form, contactType: 'UNION_REPRESENTATIVE' })
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </div>
          <div className="space-y-2">
            {unionReps.map(renderContactRow)}
            {adding && form.contactType === 'UNION_REPRESENTATIVE' && renderAddForm('UNION_REPRESENTATIVE')}
            {unionReps.length === 0 && !adding && (
              <p className="text-sm text-gray-400 py-2">등록된 담당자가 없습니다.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
