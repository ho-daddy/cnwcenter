import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/notices/[id]/comments/[commentId] — 댓글 삭제 (본인 또는 STAFF+)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const comment = await prisma.noticeComment.findUnique({
    where: { id: params.commentId },
  })

  if (!comment) {
    return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const isOwner = comment.authorId === session.user.id
  const isStaff = session.user.role === 'SUPER_ADMIN' || session.user.role === 'STAFF'

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  await prisma.noticeComment.delete({ where: { id: params.commentId } })

  return NextResponse.json({ success: true })
}
