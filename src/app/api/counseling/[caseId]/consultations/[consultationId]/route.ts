import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

type Params = { params: { caseId: string; consultationId: string } }

// DELETE /api/counseling/[caseId]/consultations/[consultationId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const consultation = await prisma.consultation.findUnique({
    where: { id: params.consultationId },
    include: { case: { select: { assignedTo: true } } },
  })

  if (!consultation || consultation.caseId !== params.caseId) {
    return NextResponse.json({ error: '상담기록을 찾을 수 없습니다.' }, { status: 404 })
  }

  if (auth.user!.role === 'WORKPLACE_USER' && consultation.case.assignedTo !== auth.user!.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  await prisma.consultation.delete({ where: { id: params.consultationId } })
  return NextResponse.json({ success: true })
}
