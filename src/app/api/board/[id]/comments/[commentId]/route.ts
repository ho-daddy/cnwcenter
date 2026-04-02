import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

type Params = { params: { id: string; commentId: string } }

// DELETE /api/board/[id]/comments/[commentId] — 댓글 삭제 (작성자 또는 STAFF+)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const comment = await prisma.boardComment.findUnique({ where: { id: params.commentId } })
  if (!comment) {
    return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const isStaff = auth.user!.role === 'SUPER_ADMIN' || auth.user!.role === 'STAFF'
  if (comment.authorId !== auth.user!.id && !isStaff) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  }

  await prisma.boardComment.delete({ where: { id: params.commentId } })

  return NextResponse.json({ success: true })
}
