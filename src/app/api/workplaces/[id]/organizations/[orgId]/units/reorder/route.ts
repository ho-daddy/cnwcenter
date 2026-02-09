import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 조직 단위 순서/부모 변경 (드래그앤드롭용)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { unitId, newParentId, newIndex } = body

    if (!unitId) {
      return NextResponse.json({ error: 'unitId는 필수입니다.' }, { status: 400 })
    }

    const unit = await prisma.organizationUnit.findUnique({
      where: { id: unitId },
    })

    if (!unit) {
      return NextResponse.json({ error: '조직 단위를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 부모 변경 시 레벨 유효성 검사
    if (newParentId !== undefined && newParentId !== unit.parentId) {
      if (newParentId) {
        const newParent = await prisma.organizationUnit.findUnique({
          where: { id: newParentId },
        })
        if (!newParent) {
          return NextResponse.json({ error: '부모 조직을 찾을 수 없습니다.' }, { status: 400 })
        }
        if (newParent.level >= unit.level) {
          return NextResponse.json(
            { error: '상위 조직의 단계가 현재 단계보다 낮아야 합니다.' },
            { status: 400 }
          )
        }
        // 자기 자신의 하위로 이동 불가
        const isDescendant = async (parentId: string, targetId: string): Promise<boolean> => {
          if (parentId === targetId) return true
          const children = await prisma.organizationUnit.findMany({
            where: { parentId },
            select: { id: true },
          })
          for (const child of children) {
            if (await isDescendant(child.id, targetId)) return true
          }
          return false
        }
        if (await isDescendant(unitId, newParentId)) {
          return NextResponse.json(
            { error: '자신의 하위 조직으로 이동할 수 없습니다.' },
            { status: 400 }
          )
        }
      }
    }

    const targetParentId = newParentId !== undefined ? newParentId : unit.parentId

    // 같은 부모 아래 형제들 가져오기
    const siblings = await prisma.organizationUnit.findMany({
      where: {
        organizationId: params.orgId,
        parentId: targetParentId || null,
        id: { not: unitId },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // 새 위치에 삽입
    const insertIndex = Math.min(Math.max(0, newIndex ?? siblings.length), siblings.length)

    // sortOrder 재정렬
    const updates: Promise<any>[] = []
    let order = 0

    for (let i = 0; i < siblings.length + 1; i++) {
      if (i === insertIndex) {
        updates.push(
          prisma.organizationUnit.update({
            where: { id: unitId },
            data: {
              parentId: targetParentId || null,
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

    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      message: '조직 단위 순서가 변경되었습니다.',
    })
  } catch (error) {
    console.error('[Units Reorder] 오류:', error)
    return NextResponse.json(
      { error: '순서 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
