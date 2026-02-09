'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { OrganizationUnitWithChildren, LEVEL_LABELS } from '@/types/workplace'
import { OrganizationUnitItem } from './organization-unit-item'

interface OrganizationTreeProps {
  workplaceId: string
  orgId: string
  units: OrganizationUnitWithChildren[]
  onRefresh: () => void
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-blue-50 border-blue-200',
  2: 'bg-green-50 border-green-200',
  3: 'bg-yellow-50 border-yellow-200',
  4: 'bg-orange-50 border-orange-200',
  5: 'bg-red-50 border-red-200',
}

export function OrganizationTree({
  workplaceId,
  orgId,
  units,
  onRefresh,
}: OrganizationTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // 모든 유닛 ID를 평면화
  const getAllIds = (items: OrganizationUnitWithChildren[]): string[] => {
    return items.flatMap((item) => [item.id, ...getAllIds(item.children)])
  }

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeUnit = findUnit(units, active.id as string)
    const overUnit = findUnit(units, over.id as string)

    if (!activeUnit || !overUnit) return

    // 같은 부모 내에서 순서 변경
    if (activeUnit.parentId === overUnit.parentId) {
      try {
        const siblings =
          activeUnit.parentId === null
            ? units
            : findUnit(units, activeUnit.parentId)?.children || []

        const oldIndex = siblings.findIndex((s) => s.id === active.id)
        const newIndex = siblings.findIndex((s) => s.id === over.id)

        if (oldIndex !== newIndex) {
          await fetch(
            `/api/workplaces/${workplaceId}/organizations/${orgId}/units/reorder`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                unitId: active.id,
                newParentId: activeUnit.parentId,
                newIndex,
              }),
            }
          )
          onRefresh()
        }
      } catch (error) {
        console.error('Failed to reorder:', error)
      }
    }
    // 다른 부모로 이동 (레벨이 맞아야 함)
    else if (overUnit.level < activeUnit.level) {
      try {
        await fetch(
          `/api/workplaces/${workplaceId}/organizations/${orgId}/units/reorder`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unitId: active.id,
              newParentId: over.id,
              newIndex: 0,
            }),
          }
        )
        onRefresh()
      } catch (error) {
        console.error('Failed to move:', error)
      }
    }
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
      onDragEnd={handleDragEnd}
    >
      {renderTree(units)}

      <DragOverlay>
        {activeUnit && (
          <div
            className={`p-3 rounded-lg border shadow-lg ${
              LEVEL_COLORS[activeUnit.level] || 'bg-gray-50'
            }`}
          >
            <span className="font-medium">{activeUnit.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
