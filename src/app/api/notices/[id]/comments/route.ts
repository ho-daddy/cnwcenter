import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/notices/[id]/comments — 댓글 작성 (로그인 사용자)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const notice = await prisma.notice.findUnique({ where: { id: params.id } })
  if (!notice) {
    return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })
  }

  const body = await req.json()
  const { content } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: '댓글 내용을 입력해주세요.' }, { status: 400 })
  }

  const comment = await prisma.noticeComment.create({
    data: {
      noticeId: params.id,
      authorId: session.user.id,
      content: content.trim(),
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
