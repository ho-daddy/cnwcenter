import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/notices — 공지사항 목록 (고정글 우선, 최신순)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

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
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'STAFF') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json()
  const { title, content, isPinned } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
  }

  const notice = await prisma.notice.create({
    data: {
      title: title.trim(),
      content: content ?? null,
      isPinned: isPinned === true,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(notice, { status: 201 })
}
