import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// GET /api/members/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    include: {
      groups: { include: { group: true } },
      smsLogs: { include: { smsLog: { select: { id: true, content: true, sentAt: true } } }, orderBy: { smsLog: { sentAt: 'desc' } }, take: 10 },
    },
  })

  if (!member) return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(member)
}

// PATCH /api/members/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { name, phone, email, address, notes, isActive, groupIds } = body

    const data: any = {}
    if (name !== undefined) data.name = name.trim()
    if (phone !== undefined) data.phone = phone.replace(/[^0-9]/g, '')
    if (email !== undefined) data.email = email?.trim() || null
    if (address !== undefined) data.address = address?.trim() || null
    if (notes !== undefined) data.notes = notes?.trim() || null
    if (isActive !== undefined) data.isActive = isActive

    if (groupIds !== undefined) {
      data.groups = {
        deleteMany: {},
        create: groupIds.map((gid: string) => ({ groupId: gid })),
      }
    }

    const member = await prisma.member.update({
      where: { id: params.id },
      data,
      include: {
        groups: { include: { group: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    if ((error as any)?.code === 'P2002') return NextResponse.json({ error: '이미 등록된 전화번호입니다.' }, { status: 409 })
    if ((error as any)?.code === 'P2025') return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 })
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE /api/members/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    await prisma.member.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if ((error as any)?.code === 'P2025') return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 })
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
