import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 사업장 목록 조회
export async function GET(request: NextRequest) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    const workplaces = await prisma.workplace.findMany({
      where,
      include: {
        _count: {
          select: { users: true, contacts: true, organizations: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ workplaces })
  } catch (error) {
    console.error('[Workplaces] 조회 오류:', error)
    return NextResponse.json(
      { error: '사업장 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 사업장 생성
export async function POST(request: NextRequest) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, address, industry, products, employeeCount } = body

    if (!name) {
      return NextResponse.json({ error: '사업장 이름은 필수입니다.' }, { status: 400 })
    }

    const workplace = await prisma.workplace.create({
      data: {
        name,
        address,
        industry,
        products,
        employeeCount: employeeCount ? parseInt(employeeCount) : null,
      },
    })

    return NextResponse.json({
      success: true,
      message: '사업장이 생성되었습니다.',
      workplace,
    })
  } catch (error) {
    console.error('[Workplaces] 생성 오류:', error)
    return NextResponse.json(
      { error: '사업장 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
