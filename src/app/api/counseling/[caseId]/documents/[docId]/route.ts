import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { unlink } from 'fs/promises'
import path from 'path'

type Params = { params: { caseId: string; docId: string } }

// DELETE /api/counseling/[caseId]/documents/[docId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const doc = await prisma.document.findUnique({
    where: { id: params.docId },
    include: { case: { select: { assignedTo: true } } },
  })
  if (!doc || doc.caseId !== params.caseId) {
    return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
  }

  // WORKPLACE_USER는 자신이 담당자인 케이스의 문서만
  if (auth.user!.role === 'WORKPLACE_USER' && doc.case.assignedTo !== auth.user!.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  // 파일 시스템에서 삭제
  try {
    const filePath = path.join(process.cwd(), 'public', doc.fileUrl)
    await unlink(filePath)
  } catch {
    // 파일이 이미 없어도 DB 레코드는 삭제
  }

  await prisma.document.delete({ where: { id: params.docId } })

  return NextResponse.json({ success: true })
}
