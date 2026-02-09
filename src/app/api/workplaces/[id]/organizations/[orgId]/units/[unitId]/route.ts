import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 조직 단위 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string; unitId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, parentId, sortOrder, isLeaf } = body

    // 부모 변경 시 레벨 유효성 검사
    if (parentId !== undefined) {
      const currentUnit = await prisma.organizationUnit.findUnique({
        where: { id: params.unitId },
      })

      if (parentId) {
        const newParent = await prisma.organizationUnit.findUnique({
          where: { id: parentId },
        })
        if (!newParent) {
          return NextResponse.json({ error: '부모 조직을 찾을 수 없습니다.' }, { status: 400 })
        }
        if (currentUnit && newParent.level >= currentUnit.level) {
          return NextResponse.json(
            { error: '상위 조직의 단계가 현재 단계보다 낮아야 합니다.' },
            { status: 400 }
          )
        }
      }
    }

    const unit = await prisma.organizationUnit.update({
      where: { id: params.unitId },
      data: {
        ...(name !== undefined && { name }),
        ...(parentId !== undefined && { parentId }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isLeaf !== undefined && { isLeaf }),
      },
    })

    return NextResponse.json({
      success: true,
      message: '조직 단위가 수정되었습니다.',
      unit,
    })
  } catch (error) {
    console.error('[Unit] 수정 오류:', error)
    return NextResponse.json(
      { error: '조직 단위 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 조직 단위 삭제 (하위 단위도 함께)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string; unitId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    // 하위 단위들 먼저 삭제 (재귀적으로)
    const deleteChildren = async (parentId: string) => {
      const children = await prisma.organizationUnit.findMany({
        where: { parentId },
        select: { id: true },
      })

      for (const child of children) {
        await deleteChildren(child.id)
        await prisma.organizationUnit.delete({ where: { id: child.id } })
      }
    }

    await deleteChildren(params.unitId)
    await prisma.organizationUnit.delete({ where: { id: params.unitId } })

    return NextResponse.json({
      success: true,
      message: '조직 단위 및 하위 단위가 삭제되었습니다.',
    })
  } catch (error) {
    console.error('[Unit] 삭제 오류:', error)
    return NextResponse.json(
      { error: '조직 단위 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
