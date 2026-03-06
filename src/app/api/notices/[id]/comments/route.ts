import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireAuth } from '@/lib/auth-utils'

// POST /api/notices/[id]/comments — 댓글 작성 (로그인 사용자)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const notice = await prisma.notice.findUnique({ where: { id: params.id } })
  if (!notice) {
    return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })
  }

  try {
    const body = await parseJsonBody(req)
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: '댓글 내용을 입력해주세요.' }, { status: 400 })
    }

    const comment = await prisma.noticeComment.create({
      data: {
        noticeId: params.id,
        authorId: auth.user!.id,
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
