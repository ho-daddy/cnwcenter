import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// PATCH /api/member-groups/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { name, description } = body

    const group = await prisma.memberGroup.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
      },
      include: { _count: { select: { members: true } } },
    })

    return NextResponse.json(group)
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    if ((error as any)?.code === 'P2025') return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 })
    if ((error as any)?.code === 'P2002') return NextResponse.json({ error: '이미 존재하는 그룹명입니다.' }, { status: 409 })
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE /api/member-groups/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    await prisma.memberGroup.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if ((error as any)?.code === 'P2025') return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 })
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
