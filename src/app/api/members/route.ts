import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// GET /api/members
export async function GET(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const search = searchParams.get('search') ?? ''
  const groupId = searchParams.get('groupId') ?? ''
  const skip = (page - 1) * limit

  const where = {
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
      ],
    } : {}),
    ...(groupId ? { groups: { some: { groupId } } } : {}),
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      include: {
        groups: { include: { group: { select: { id: true, name: true } } } },
      },
    }),
    prisma.member.count({ where }),
  ])

  return NextResponse.json({ members, total, page, limit })
}

// POST /api/members
export async function POST(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { name, phone, email, address, notes, groupIds } = body

    if (!name?.trim()) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
    if (!phone?.trim()) return NextResponse.json({ error: '전화번호를 입력해주세요.' }, { status: 400 })

    const normalizedPhone = phone.replace(/[^0-9]/g, '')

    const member = await prisma.member.create({
      data: {
        name: name.trim(),
        phone: normalizedPhone,
        email: email?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        groups: groupIds?.length
          ? { create: groupIds.map((gid: string) => ({ groupId: gid })) }
          : undefined,
      },
      include: {
        groups: { include: { group: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json({ error: '이미 등록된 전화번호입니다.' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
