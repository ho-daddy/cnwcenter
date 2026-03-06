import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireAuth, requireStaffOrAbove } from '@/lib/auth-utils'

// GET /api/notices/[id] — 공지사항 상세 + 댓글
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const notice = await prisma.notice.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!notice) {
    return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(notice)
}

// PUT /api/notices/[id] — 공지사항 수정 (STAFF+ 전용)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { title, content, isPinned } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
    }

    const existing = await prisma.notice.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })
    }

    const notice = await prisma.notice.update({
      where: { id: params.id },
      data: {
        title: title.trim(),
        content: content ?? null,
        isPinned: isPinned === true,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(notice)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE /api/notices/[id] — 공지사항 삭제 (STAFF+ 전용)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const existing = await prisma.notice.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })
  }

  await prisma.notice.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
