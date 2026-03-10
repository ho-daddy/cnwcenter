import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess, requireStaffOrAbove } from '@/lib/auth-utils'

// 조직 단위 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string } }
) {
  // WORKPLACE_USER도 할당된 사업장의 조직 단위 조회 가능
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const units = await prisma.organizationUnit.findMany({
      where: { organizationId: params.orgId },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    })

    return NextResponse.json({ units })
  } catch (error) {
    console.error('[Units] 조회 오류:', error)
    return NextResponse.json(
      { error: '조직 단위 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 조직 단위 추가
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
    const { name, level, parentId, isLeaf } = body

    if (!name) {
      return NextResponse.json(
        { error: '이름은 필수입니다.' },
        { status: 400 }
      )
    }

    let finalLevel: number

    if (parentId) {
      // 하위 단위: 부모 레벨 + 1로 자동 설정
      const parent = await prisma.organizationUnit.findUnique({
        where: { id: parentId },
      })
      if (!parent) {
        return NextResponse.json({ error: '부모 조직을 찾을 수 없습니다.' }, { status: 400 })
      }
      finalLevel = parent.level + 1
      if (finalLevel > 5) {
        return NextResponse.json(
          { error: '최대 5단계까지만 생성할 수 있습니다.' },
          { status: 400 }
        )
      }
    } else {
      // 최상위 단위: 기존 루트와 동일한 레벨 강제
      const existingRoots = await prisma.organizationUnit.findMany({
        where: { organizationId: params.orgId, parentId: null },
        select: { level: true },
        take: 1,
      })

      if (existingRoots.length > 0) {
        finalLevel = existingRoots[0].level
      } else {
        // 첫 루트 단위: 사용자가 지정한 레벨 사용 (기본값 1)
        finalLevel = parseInt(level) || 1
        if (finalLevel < 1 || finalLevel > 5) {
          return NextResponse.json(
            { error: '단계는 1~5 사이여야 합니다.' },
            { status: 400 }
          )
        }
      }
    }

    // 같은 부모 아래 형제들의 최대 sortOrder 조회
    const maxSortOrder = await prisma.organizationUnit.aggregate({
      where: { organizationId: params.orgId, parentId: parentId || null },
      _max: { sortOrder: true },
    })

    const unit = await prisma.organizationUnit.create({
      data: {
        organizationId: params.orgId,
        parentId: parentId || null,
        name,
        level: finalLevel,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
        isLeaf: isLeaf || false,
      },
    })

    return NextResponse.json({
      success: true,
      message: '조직 단위가 추가되었습니다.',
      unit,
    })
  } catch (error) {
    console.error('[Units] 추가 오류:', error)
    return NextResponse.json(
      { error: '조직 단위 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
