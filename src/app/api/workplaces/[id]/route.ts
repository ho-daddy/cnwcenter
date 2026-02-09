import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 사업장 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const workplace = await prisma.workplace.findUnique({
      where: { id: params.id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
              },
            },
          },
        },
        contacts: {
          orderBy: [{ contactType: 'asc' }, { isPrimary: 'desc' }, { name: 'asc' }],
        },
        organizations: {
          orderBy: [{ year: 'desc' }, { name: 'asc' }],
          include: {
            _count: { select: { units: true } },
          },
        },
      },
    })

    if (!workplace) {
      return NextResponse.json({ error: '사업장을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ workplace })
  } catch (error) {
    console.error('[Workplace] 조회 오류:', error)
    return NextResponse.json(
      { error: '사업장 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 사업장 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, address, industry, products, employeeCount } = body

    const workplace = await prisma.workplace.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(industry !== undefined && { industry }),
        ...(products !== undefined && { products }),
        ...(employeeCount !== undefined && {
          employeeCount: employeeCount ? parseInt(employeeCount) : null,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: '사업장이 수정되었습니다.',
      workplace,
    })
  } catch (error) {
    console.error('[Workplace] 수정 오류:', error)
    return NextResponse.json(
      { error: '사업장 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 사업장 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    await prisma.workplace.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: '사업장이 삭제되었습니다.',
    })
  } catch (error) {
    console.error('[Workplace] 삭제 오류:', error)
    return NextResponse.json(
      { error: '사업장 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
