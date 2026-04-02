import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

type Params = { params: { id: string } }

// POST /api/board/[id]/comments — 댓글 작성
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const post = await prisma.boardPost.findUnique({ where: { id: params.id } })
  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const body = await req.json()
  const content = body.content?.trim()
  if (!content) {
    return NextResponse.json({ error: '댓글 내용을 입력해주세요.' }, { status: 400 })
  }

  const comment = await prisma.boardComment.create({
    data: {
      postId: params.id,
      authorId: auth.user!.id,
      content,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
