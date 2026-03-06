import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireAuth, requireStaffOrAbove } from '@/lib/auth-utils'

// GET /api/notices — 공지사항 목록 (고정글 우선, 최신순)
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const [notices, total] = await Promise.all([
    prisma.notice.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.notice.count(),
  ])

  return NextResponse.json({ notices, total, page, limit })
}

// POST /api/notices — 공지사항 작성 (STAFF+ 전용)
export async function POST(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { title, content, isPinned } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
    }

    const notice = await prisma.notice.create({
      data: {
        title: title.trim(),
        content: content ?? null,
        isPinned: isPinned === true,
        authorId: auth.user!.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(notice, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
