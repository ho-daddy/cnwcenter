import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/auth-utils'

// 사용자 목록 조회
export async function GET(request: NextRequest) {
  const authCheck = await requireSuperAdmin()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    const where: any = {}

    if (status) {
      where.status = status
    }
    if (role) {
      where.role = role
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        approvedAt: true,
        approvedBy: true,
        rejectedAt: true,
        rejectedReason: true,
        createdAt: true,
        updatedAt: true,
        workplaces: {
          select: {
            workplace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING 먼저
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('[Admin Users] 오류:', error)
    return NextResponse.json(
      { error: '사용자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
