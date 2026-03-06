import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

// DELETE /api/notices/[id]/comments/[commentId] — 댓글 삭제 (본인 또는 STAFF+)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const comment = await prisma.noticeComment.findUnique({
    where: { id: params.commentId },
  })

  if (!comment) {
    return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const isOwner = comment.authorId === auth.user!.id
  const isStaff = auth.user!.role === 'SUPER_ADMIN' || auth.user!.role === 'STAFF'

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  await prisma.noticeComment.delete({ where: { id: params.commentId } })

  return NextResponse.json({ success: true })
}
