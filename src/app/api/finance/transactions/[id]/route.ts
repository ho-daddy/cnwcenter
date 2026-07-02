import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'
import { parseJsonBody, handleApiError } from '@/lib/api-utils'

type Params = { params: { id: string } }

// PATCH /api/finance/transactions/[id] — 수정 또는 결재 처리
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { approvalStatus, secretaryApproverId, directorApproverId, ...editable } = body

    const data: Record<string, unknown> = {}

    // 결재 처리
    if (approvalStatus) {
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
        return NextResponse.json({ error: '결재 상태가 올바르지 않습니다.' }, { status: 400 })
      }
      data.approvalStatus = approvalStatus
      data.approvedAt = approvalStatus === 'APPROVED' ? new Date() : null
    }
    if (secretaryApproverId !== undefined) data.secretaryApproverId = secretaryApproverId || null
    if (directorApproverId !== undefined) data.directorApproverId = directorApproverId || null

    // 내용 수정
    if (editable.kind) data.kind = editable.kind
    if (editable.accountType) data.accountType = editable.accountType
    if (editable.date) data.date = new Date(editable.date)
    if (editable.amount) data.amount = parseInt(editable.amount)
    if (editable.categoryId !== undefined) data.categoryId = editable.categoryId || null
    if (editable.description !== undefined) data.description = editable.description?.trim() || null
    if (editable.counterparty !== undefined) data.counterparty = editable.counterparty?.trim() || null
    if (editable.payMethod !== undefined) data.payMethod = editable.payMethod?.trim() || null

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data,
      include: {
        category: { select: { id: true, name: true, level: true } },
        createdBy: { select: { id: true, name: true } },
        secretaryApprover: { select: { id: true, name: true } },
        directorApprover: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/finance/transactions/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    await prisma.transaction.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
