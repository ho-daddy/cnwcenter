import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 조직도 복사 (과거 조직도를 새 연도로 복사)
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
    const { targetYear, newName } = body

    if (!targetYear) {
      return NextResponse.json({ error: '대상 연도는 필수입니다.' }, { status: 400 })
    }

    // 원본 조직도 확인
    const sourceOrg = await prisma.organization.findUnique({
      where: { id: params.orgId },
    })

    if (!sourceOrg) {
      return NextResponse.json({ error: '원본 조직도를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 새 조직도 생성
    const newOrg = await prisma.organization.create({
      data: {
        workplaceId: params.id,
        year: parseInt(targetYear),
        name: newName || `${targetYear}년 조직도`,
        isActive: false,
      },
    })

    // 기존 Unit들 조회 (레벨 순으로)
    const sourceUnits = await prisma.organizationUnit.findMany({
      where: { organizationId: params.orgId },
      orderBy: { level: 'asc' },
    })

    // ID 매핑 (old -> new)
    const idMap = new Map<string, string>()

    // 레벨 순서대로 복사 (부모가 먼저 생성되어야 함)
    for (const unit of sourceUnits) {
      const newUnit = await prisma.organizationUnit.create({
        data: {
          organizationId: newOrg.id,
          parentId: unit.parentId ? idMap.get(unit.parentId) || null : null,
          name: unit.name,
          level: unit.level,
          sortOrder: unit.sortOrder,
          isLeaf: unit.isLeaf,
        },
      })
      idMap.set(unit.id, newUnit.id)
    }

    return NextResponse.json({
      success: true,
      message: `조직도가 ${targetYear}년으로 복사되었습니다.`,
      organization: newOrg,
      copiedUnitsCount: sourceUnits.length,
    })
  } catch (error: any) {
    // 중복 키 오류 처리
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '해당 연도에 동일한 이름의 조직도가 이미 존재합니다.' },
        { status: 400 }
      )
    }
    console.error('[Organization Copy] 복사 오류:', error)
    return NextResponse.json(
      { error: '조직도 복사 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
