'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Save,
  X,
} from 'lucide-react'
import { OrganizationUnitWithChildren } from '@/types/workplace'
import type { DropPreview } from './organization-tree'
import { ArrowRight, CornerDownRight } from 'lucide-react'

interface OrganizationUnitItemProps {
  unit: OrganizationUnitWithChildren
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  onToggle: () => void
  levelColor: string
  workplaceId: string
  orgId: string
  onRefresh: () => void
  nestPreview?: DropPreview | null
}

export function OrganizationUnitItem({
  unit,
  depth,
  isExpanded,
  hasChildren,
  onToggle,
  levelColor,
  workplaceId,
  orgId,
  onRefresh,
  nestPreview,
}: OrganizationUnitItemProps) {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)

  const [editForm, setEditForm] = useState({
    name: unit.name,
    isLeaf: unit.isLeaf,
  })

  const [addForm, setAddForm] = useState({
    name: '',
    isLeaf: false,
  })

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleUpdate = async () => {
    if (!editForm.name.trim()) {
      alert('단위명은 필수입니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/organizations/${orgId}/units/${unit.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        }
      )

      if (res.ok) {
        setEditing(false)
        onRefresh()
      } else {
        const data = await res.json()
        alert(data.error || '수정에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const childCount = unit.children.length
    const message = childCount > 0
      ? `이 단위와 하위 ${childCount}개 단위를 모두 삭제하시겠습니까?`
      : '이 단위를 삭제하시겠습니까?'

    if (!confirm(message)) return

    setLoading(true)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/organizations/${orgId}/units/${unit.id}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        onRefresh()
      } else {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddChild = async () => {
    if (!addForm.name.trim()) {
      alert('단위명은 필수입니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/organizations/${orgId}/units`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: addForm.name,
            parentId: unit.id,
            isLeaf: addForm.isLeaf,
          }),
        }
      )

      if (res.ok) {
        setAdding(false)
        setAddForm({ name: '', isLeaf: false })
        onRefresh()
      } else {
        const data = await res.json()
        alert(data.error || '추가에 실패했습니다.')
      }
    } catch (error) {
      alert('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (editing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`p-3 rounded-lg border ${levelColor}`}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="flex-1 px-2 py-1 border rounded text-sm"
            autoFocus
          />
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={editForm.isLeaf}
              onChange={(e) => setEditForm({ ...editForm, isLeaf: e.target.checked })}
              className="rounded"
            />
            평가 대상
          </label>
          <Button size="sm" onClick={handleUpdate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`p-2 rounded-lg border ${levelColor} flex items-center gap-2 transition-shadow ${
        nestPreview ? (nestPreview.error ? 'ring-2 ring-red-300' : 'ring-2 ring-blue-400 shadow-md') : ''
      }`}>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-gray-200 rounded p-1"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>

        {hasChildren ? (
          <button onClick={onToggle} className="p-1 hover:bg-gray-200 rounded">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        <div className="flex-1 flex items-center gap-2">
          <span className="font-medium text-sm">{unit.name}</span>
          <span className="text-xs text-gray-500">{unit.level}단계</span>
          {unit.isLeaf && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              대상
            </span>
          )}
        </div>

        <div className="flex gap-1">
          {unit.level < 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdding(!adding)}
              title="하위 단위 추가"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditForm({ name: unit.name, isLeaf: unit.isLeaf })
              setEditing(true)
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-red-500" />
            )}
          </Button>
        </div>
      </div>

      {/* 드롭 대상 미리보기 인디케이터 */}
      {nestPreview && (
        <div className={`ml-6 mt-1 p-2 rounded-lg border-2 border-dashed text-sm flex items-center gap-2 transition-all ${
          nestPreview.error
            ? 'border-red-300 bg-red-50 text-red-600'
            : 'border-blue-300 bg-blue-50 text-blue-700'
        }`}>
          <CornerDownRight className="h-4 w-4 flex-shrink-0" />
          {nestPreview.error ? (
            <span>{nestPreview.error}</span>
          ) : (
            <span>
              하위 단위로 이동
              {nestPreview.levelDelta !== 0 && (
                <span className="ml-1 inline-flex items-center gap-0.5">
                  (<ArrowRight className="h-3 w-3 inline" /> {nestPreview.newLevel}단계)
                </span>
              )}
              {nestPreview.descendantCount > 0 && (
                <span className="text-gray-500 ml-1">
                  (+{nestPreview.descendantCount}개 하위 단위 포함)
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* 하위 단위 추가 폼 */}
      {adding && (
        <div className="ml-8 mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="하위 단위명"
              className="flex-1 px-2 py-1 border rounded text-sm"
              autoFocus
            />
            <span className="px-2 py-1 bg-white border rounded text-sm text-gray-600">
              {unit.level + 1}단계
            </span>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={addForm.isLeaf}
                onChange={(e) => setAddForm({ ...addForm, isLeaf: e.target.checked })}
                className="rounded"
              />
              평가 대상
            </label>
            <Button size="sm" onClick={handleAddChild} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '추가'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
