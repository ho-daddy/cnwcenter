import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

type Params = { params: { caseId: string; consultationId: string } }

// PATCH /api/counseling/[caseId]/consultations/[consultationId]
export async function PATCH(req: NextRequest, { params }: Params) {
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

  const body = await req.json()
  const updated = await prisma.consultation.update({
    where: { id: params.consultationId },
    data: {
      consultDate: body.consultDate ? new Date(body.consultDate) : consultation.consultDate,
      consultType: body.consultType ?? consultation.consultType,
      content: body.content ?? consultation.content,
      nextAction: body.nextAction !== undefined ? (body.nextAction || null) : consultation.nextAction,
    },
  })

  return NextResponse.json(updated)
}

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
