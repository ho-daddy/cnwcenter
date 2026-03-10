'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { OrganizationUnitWithChildren } from '@/types/workplace'
import { OrganizationUnitItem } from './organization-unit-item'
import { ArrowRight } from 'lucide-react'

interface OrganizationTreeProps {
  workplaceId: string
  orgId: string
  units: OrganizationUnitWithChildren[]
  onRefresh: () => void
}

export interface DropPreview {
  targetId: string
  action: 'reorder' | 'nest' | 'root'
  newLevel: number
  levelDelta: number
  descendantCount: number
  error?: string
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-blue-50 border-blue-200',
  2: 'bg-green-50 border-green-200',
  3: 'bg-yellow-50 border-yellow-200',
  4: 'bg-orange-50 border-orange-200',
  5: 'bg-red-50 border-red-200',
}

function RootDropZone({ preview }: { preview: DropPreview | null }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'root-drop-zone' })
  const isTarget = preview?.targetId === 'root-drop-zone'
  const hasError = isTarget && preview?.error

  return (
    <div
      ref={setNodeRef}
      className={`mb-3 p-3 border-2 border-dashed rounded-lg text-center text-sm transition-all ${
        isOver
          ? hasError
            ? 'border-red-400 bg-red-50 text-red-600'
            : 'border-blue-400 bg-blue-50 text-blue-600 scale-[1.01]'
          : 'border-gray-300 text-gray-400'
      }`}
    >
      {isOver && isTarget && !hasError ? (
        <span>
          최상위 단위로 이동 ({preview!.newLevel}단계)
          {preview!.descendantCount > 0 && (
            <span className="ml-1 text-gray-500">
              (+{preview!.descendantCount}개 하위 단위 포함)
            </span>
          )}
        </span>
      ) : isOver && hasError ? (
        <span>{preview!.error}</span>
      ) : (
        '이 곳에 놓으면 최상위 단위로 이동'
      )}
    </div>
  )
}

export function OrganizationTree({
  workplaceId,
  orgId,
  units,
  onRefresh,
}: OrganizationTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [moveError, setMoveError] = useState<string | null>(null)
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const findUnit = (
    items: OrganizationUnitWithChildren[],
    id: string
  ): OrganizationUnitWithChildren | null => {
    for (const item of items) {
      if (item.id === id) return item
      const found = findUnit(item.children, id)
      if (found) return found
    }
    return null
  }

  // 전체 하위 단위 수 세기
  const countDescendants = (unit: OrganizationUnitWithChildren): number => {
    return unit.children.reduce(
      (sum, child) => sum + 1 + countDescendants(child),
      0
    )
  }

  // 하위 트리의 최대 상대 깊이
  const getMaxRelativeDepth = (unit: OrganizationUnitWithChildren): number => {
    if (unit.children.length === 0) return 0
    return Math.max(...unit.children.map((c) => 1 + getMaxRelativeDepth(c)))
  }

  // 자신의 하위인지 확인
  const isDescendantOf = (
    parentId: string,
    targetId: string
  ): boolean => {
    const parent = findUnit(units, parentId)
    if (!parent) return false
    for (const child of parent.children) {
      if (child.id === targetId) return true
      if (isDescendantOf(child.id, targetId)) return true
    }
    return false
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setMoveError(null)
    setDropPreview(null)
  }

  // 드래그 중 미리보기 계산
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || !activeId) {
      setDropPreview(null)
      return
    }

    if (active.id === over.id) {
      setDropPreview(null)
      return
    }

    const activeUnit = findUnit(units, active.id as string)
    if (!activeUnit) return

    const descendantCount = countDescendants(activeUnit)
    const maxDepth = getMaxRelativeDepth(activeUnit)

    // 최상위 드롭존
    if (over.id === 'root-drop-zone') {
      if (activeUnit.parentId === null) {
        setDropPreview(null)
        return
      }
      const rootLevel = units.length > 0 ? units[0].level : 1
      const newLevel = rootLevel
      const levelDelta = newLevel - activeUnit.level
      const error = newLevel + maxDepth > 5
        ? `하위 단위 포함 시 최대 5단계를 초과합니다.`
        : undefined

      setDropPreview({
        targetId: 'root-drop-zone',
        action: 'root',
        newLevel,
        levelDelta,
        descendantCount,
        error,
      })
      return
    }

    const overUnit = findUnit(units, over.id as string)
    if (!overUnit) return

    // 같은 부모 → 순서 변경
    if (activeUnit.parentId === overUnit.parentId) {
      setDropPreview({
        targetId: over.id as string,
        action: 'reorder',
        newLevel: activeUnit.level,
        levelDelta: 0,
        descendantCount,
      })
      return
    }

    // 다른 부모 → 하위로 이동
    const newLevel = overUnit.level + 1
    const levelDelta = newLevel - activeUnit.level

    let error: string | undefined
    if (isDescendantOf(active.id as string, over.id as string)) {
      error = '자신의 하위 조직으로 이동할 수 없습니다.'
    } else if (newLevel + maxDepth > 5) {
      error = `하위 단위 포함 시 최대 5단계를 초과합니다.`
    }

    setDropPreview({
      targetId: over.id as string,
      action: 'nest',
      newLevel,
      levelDelta,
      descendantCount,
      error,
    })
  }

  const callReorderAPI = async (data: {
    unitId: string
    newParentId: string | null
    newIndex: number
  }) => {
    const res = await fetch(
      `/api/workplaces/${workplaceId}/organizations/${orgId}/units/reorder`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    )
    if (!res.ok) {
      const result = await res.json()
      throw new Error(result.error || '이동에 실패했습니다.')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const currentPreview = dropPreview
    setActiveId(null)
    setDropPreview(null)

    if (!over || active.id === over.id) return

    // 에러가 있는 미리보기면 실행하지 않음
    if (currentPreview?.error) {
      setMoveError(currentPreview.error)
      setTimeout(() => setMoveError(null), 3000)
      return
    }

    const activeUnit = findUnit(units, active.id as string)
    if (!activeUnit) return

    try {
      // 최상위 드롭존에 놓은 경우
      if (over.id === 'root-drop-zone') {
        if (activeUnit.parentId === null) return
        await callReorderAPI({
          unitId: active.id as string,
          newParentId: null,
          newIndex: units.length,
        })
        onRefresh()
        return
      }

      const overUnit = findUnit(units, over.id as string)
      if (!overUnit) return

      // 같은 부모 → 형제 순서 변경
      if (activeUnit.parentId === overUnit.parentId) {
        const siblings =
          activeUnit.parentId === null
            ? units
            : findUnit(units, activeUnit.parentId)?.children || []

        const oldIndex = siblings.findIndex((s) => s.id === active.id)
        const newIndex = siblings.findIndex((s) => s.id === over.id)

        if (oldIndex !== newIndex) {
          await callReorderAPI({
            unitId: active.id as string,
            newParentId: activeUnit.parentId,
            newIndex,
          })
          onRefresh()
        }
      }
      // 다른 부모 → 드롭 대상의 하위로 이동
      else {
        await callReorderAPI({
          unitId: active.id as string,
          newParentId: over.id as string,
          newIndex: overUnit.children.length,
        })

        // 드롭 대상 자동 펼침
        setExpandedIds((prev) => {
          const next = new Set(prev)
          next.add(over.id as string)
          return next
        })
        onRefresh()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '이동에 실패했습니다.'
      setMoveError(message)
      setTimeout(() => setMoveError(null), 3000)
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setDropPreview(null)
  }

  const activeUnit = activeId ? findUnit(units, activeId) : null

  const renderTree = (
    items: OrganizationUnitWithChildren[],
    depth: number = 0
  ) => {
    return (
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {items.map((item) => {
            const isExpanded = expandedIds.has(item.id)
            const hasChildren = item.children.length > 0

            // 이 아이템이 nest 드롭 대상인지 확인
            const nestPreview =
              dropPreview?.targetId === item.id && dropPreview.action === 'nest'
                ? dropPreview
                : null

            return (
              <div key={item.id}>
                <OrganizationUnitItem
                  unit={item}
                  depth={depth}
                  isExpanded={isExpanded}
                  hasChildren={hasChildren}
                  onToggle={() => toggleExpand(item.id)}
                  levelColor={LEVEL_COLORS[item.level] || 'bg-gray-50'}
                  workplaceId={workplaceId}
                  orgId={orgId}
                  onRefresh={onRefresh}
                  nestPreview={nestPreview}
                />
                {hasChildren && isExpanded && (
                  <div className="ml-6 border-l-2 border-gray-200 pl-2">
                    {renderTree(item.children, depth + 1)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SortableContext>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* 에러 메시지 */}
      {moveError && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {moveError}
        </div>
      )}

      {/* 드래그 중일 때 최상위 이동 드롭존 (상단) */}
      {activeId && <RootDropZone preview={dropPreview} />}

      {renderTree(units)}

      <DragOverlay>
        {activeUnit && (
          <div
            className={`p-3 rounded-lg border shadow-lg ${
              LEVEL_COLORS[
                dropPreview && dropPreview.action !== 'reorder' && !dropPreview.error
                  ? dropPreview.newLevel
                  : activeUnit.level
              ] || 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{activeUnit.name}</span>
              {/* 레벨 변경 미리보기 */}
              {dropPreview && dropPreview.action !== 'reorder' && dropPreview.levelDelta !== 0 && (
                <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                  dropPreview.error
                    ? 'bg-red-100 text-red-700'
                    : 'bg-white/90 text-gray-700 border border-gray-200'
                }`}>
                  {activeUnit.level}단계
                  <ArrowRight className="h-3 w-3" />
                  {dropPreview.newLevel}단계
                </span>
              )}
              {dropPreview?.error && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                  이동 불가
                </span>
              )}
            </div>
            {activeUnit.children.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                +{countDescendants(activeUnit)}개 하위 단위 함께 이동
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
