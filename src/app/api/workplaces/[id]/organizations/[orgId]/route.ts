import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess, requireStaffOrAbove } from '@/lib/auth-utils'
import { OrganizationUnitWithChildren } from '@/types/workplace'

// 평면 배열을 트리 구조로 변환
function buildTree(units: any[]): OrganizationUnitWithChildren[] {
  const unitMap = new Map<string, OrganizationUnitWithChildren>()
  const roots: OrganizationUnitWithChildren[] = []

  // 맵 초기화
  units.forEach((unit) => {
    unitMap.set(unit.id, {
      id: unit.id,
      name: unit.name,
      level: unit.level,
      sortOrder: unit.sortOrder,
      isLeaf: unit.isLeaf,
      parentId: unit.parentId,
      children: [],
    })
  })

  // 부모-자식 관계 구성
  units.forEach((unit) => {
    const node = unitMap.get(unit.id)!
    if (unit.parentId) {
      const parent = unitMap.get(unit.parentId)
      parent?.children.push(node)
    } else {
      roots.push(node)
    }
  })

  // 각 노드의 children을 sortOrder로 정렬
  const sortChildren = (nodes: OrganizationUnitWithChildren[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder)
    nodes.forEach((node) => sortChildren(node.children))
  }
  sortChildren(roots)

  return roots
}

// 조직도 상세 조회 (트리 포함)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string } }
) {
  // WORKPLACE_USER도 할당된 사업장의 조직도 상세 조회 가능
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: params.orgId },
    })

    if (!organization) {
      return NextResponse.json({ error: '조직도를 찾을 수 없습니다.' }, { status: 404 })
    }

    const units = await prisma.organizationUnit.findMany({
      where: { organizationId: params.orgId },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    })

    const tree = buildTree(units)

    return NextResponse.json({
      organization,
      units: tree,
      flatUnits: units,
    })
  } catch (error) {
    console.error('[Organization] 조회 오류:', error)
    return NextResponse.json(
      { error: '조직도 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 조직도 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, isActive } = body

    // 활성화 설정 시 기존 활성 조직도 비활성화
    if (isActive) {
      await prisma.organization.updateMany({
        where: { workplaceId: params.id, isActive: true, id: { not: params.orgId } },
        data: { isActive: false },
      })
    }

    const organization = await prisma.organization.update({
      where: { id: params.orgId },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({
      success: true,
      message: '조직도가 수정되었습니다.',
      organization,
    })
  } catch (error) {
    console.error('[Organization] 수정 오류:', error)
    return NextResponse.json(
      { error: '조직도 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 조직도 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    await prisma.organization.delete({
      where: { id: params.orgId },
    })

    return NextResponse.json({
      success: true,
      message: '조직도가 삭제되었습니다.',
    })
  } catch (error) {
    console.error('[Organization] 삭제 오류:', error)
    return NextResponse.json(
      { error: '조직도 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
