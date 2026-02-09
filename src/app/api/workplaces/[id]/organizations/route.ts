import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 조직도 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const organizations = await prisma.organization.findMany({
      where: { workplaceId: params.id },
      include: {
        _count: { select: { units: true } },
      },
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('[Organizations] 조회 오류:', error)
    return NextResponse.json(
      { error: '조직도 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 조직도 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { year, name, isActive } = body

    if (!year) {
      return NextResponse.json({ error: '연도는 필수입니다.' }, { status: 400 })
    }

    // 활성화 설정 시 기존 활성 조직도 비활성화
    if (isActive) {
      await prisma.organization.updateMany({
        where: { workplaceId: params.id, isActive: true },
        data: { isActive: false },
      })
    }

    const organization = await prisma.organization.create({
      data: {
        workplaceId: params.id,
        year: parseInt(year),
        name: name || '기본 조직도',
        isActive: isActive || false,
      },
    })

    return NextResponse.json({
      success: true,
      message: '조직도가 생성되었습니다.',
      organization,
    })
  } catch (error: any) {
    // 중복 키 오류 처리
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '해당 연도에 동일한 이름의 조직도가 이미 존재합니다.' },
        { status: 400 }
      )
    }
    console.error('[Organizations] 생성 오류:', error)
    return NextResponse.json(
      { error: '조직도 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
