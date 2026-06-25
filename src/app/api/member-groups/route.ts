import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// GET /api/member-groups
export async function GET(_req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const groups = await prisma.memberGroup.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { members: true } },
    },
  })

  return NextResponse.json(groups)
}

// POST /api/member-groups
export async function POST(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { name, description } = body

    if (!name?.trim()) return NextResponse.json({ error: '그룹명을 입력해주세요.' }, { status: 400 })

    const group = await prisma.memberGroup.create({
      data: { name: name.trim(), description: description?.trim() || null },
      include: { _count: { select: { members: true } } },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    if ((error as any)?.code === 'P2002') return NextResponse.json({ error: '이미 존재하는 그룹명입니다.' }, { status: 409 })
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
