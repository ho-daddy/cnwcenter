import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 조직 단위 순서/부모/레벨 변경 (드래그앤드롭용)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string } }
) {
  // WORKPLACE_USER도 할당된 사업장의 조직 단위 순서 변경 가능
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { unitId, newParentId, newIndex } = body
    // newParentId: string (부모 아래로 이동) | null (최상위로 이동) | undefined (부모 변경 없음)

    if (!unitId) {
      return NextResponse.json({ error: 'unitId는 필수입니다.' }, { status: 400 })
    }

    // 모든 유닛 한 번에 로드 (N+1 방지)
    const allUnits = await prisma.organizationUnit.findMany({
      where: { organizationId: params.orgId },
    })

    const unit = allUnits.find((u) => u.id === unitId)
    if (!unit) {
      return NextResponse.json({ error: '조직 단위를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 하위 단위 ID 수집 (재귀)
    const getDescendants = (parentId: string): typeof allUnits => {
      const children = allUnits.filter((u) => u.parentId === parentId)
      return children.flatMap((c) => [c, ...getDescendants(c.id)])
    }

    const descendants = getDescendants(unitId)
    const descendantIds = new Set(descendants.map((d) => d.id))

    // 대상 부모 결정
    const targetParentId = newParentId !== undefined ? (newParentId || null) : unit.parentId

    // 자기 자신의 하위로 이동 불가
    if (targetParentId && descendantIds.has(targetParentId)) {
      return NextResponse.json(
        { error: '자신의 하위 조직으로 이동할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 새 레벨 계산
    let newLevel: number

    if (targetParentId === null) {
      // 최상위로 이동 - 기존 루트 레벨과 일치시킴
      const rootUnits = allUnits.filter((u) => !u.parentId && u.id !== unitId)
      newLevel = rootUnits.length > 0 ? rootUnits[0].level : unit.level
    } else {
      const newParent = allUnits.find((u) => u.id === targetParentId)
      if (!newParent) {
        return NextResponse.json({ error: '부모 조직을 찾을 수 없습니다.' }, { status: 400 })
      }
      newLevel = newParent.level + 1
    }

    // 하위 트리 최대 깊이 검사 (5단계 초과 방지)
    const maxRelativeDepth = descendants.length > 0
      ? Math.max(...descendants.map((d) => d.level - unit.level))
      : 0

    if (newLevel + maxRelativeDepth > 5) {
      return NextResponse.json(
        { error: `하위 단위 포함 시 최대 5단계를 초과합니다. (현재 하위 깊이: ${maxRelativeDepth}단계)` },
        { status: 400 }
      )
    }

    const levelDelta = newLevel - unit.level

    // 같은 부모 아래 형제들 가져오기 (이동 대상 제외)
    const siblings = allUnits
      .filter((u) => {
        const pid = u.parentId || null
        return pid === targetParentId && u.id !== unitId
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const insertIndex = Math.min(Math.max(0, newIndex ?? siblings.length), siblings.length)

    // sortOrder 재정렬 + 부모/레벨 변경
    const updates: ReturnType<typeof prisma.organizationUnit.update>[] = []
    let order = 0

    for (let i = 0; i <= siblings.length; i++) {
      if (i === insertIndex) {
        updates.push(
          prisma.organizationUnit.update({
            where: { id: unitId },
            data: {
              parentId: targetParentId,
              level: newLevel,
              sortOrder: order++,
            },
          })
        )
      }
      if (i < siblings.length) {
        updates.push(
          prisma.organizationUnit.update({
            where: { id: siblings[i].id },
            data: { sortOrder: order++ },
          })
        )
      }
    }

    // 하위 단위 레벨 일괄 조정
    if (levelDelta !== 0) {
      for (const desc of descendants) {
        updates.push(
          prisma.organizationUnit.update({
            where: { id: desc.id },
            data: { level: desc.level + levelDelta },
          })
        )
      }
    }

    await prisma.$transaction(updates)

    return NextResponse.json({
      success: true,
      message: '조직 단위가 이동되었습니다.',
    })
  } catch (error) {
    console.error('[Units Reorder] 오류:', error)
    return NextResponse.json(
      { error: '이동 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
