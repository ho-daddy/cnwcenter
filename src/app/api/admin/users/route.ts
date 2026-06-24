import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 사용자 목록 조회
export async function GET(request: NextRequest) {
  const authCheck = await requireStaffOrAbove()
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

    // STAFF는 SUPER_ADMIN 계정 조회 불가 (role 필터가 있어도 SUPER_ADMIN은 항상 제외)
    if (authCheck.user!.role === 'STAFF') {
      if (role === 'SUPER_ADMIN') {
        where.role = { in: [] as any }
      } else if (role) {
        where.role = role
      } else {
        where.role = { not: 'SUPER_ADMIN' as any }
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        phone: true,
        organization: true,
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

// 어드민 직접 사용자 등록
export async function POST(request: NextRequest) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { name, email, password, role, workplaceId } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: '이름, 이메일, 비밀번호는 필수입니다.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'WORKPLACE_USER',
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: authCheck.user!.id,
        ...(workplaceId && {
          workplaces: { create: { workplaceId } },
        }),
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('[Admin Users POST] 오류:', error)
    return NextResponse.json({ error: '사용자 등록 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
