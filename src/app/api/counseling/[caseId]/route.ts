import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { CaseStatus } from '@prisma/client'

type Params = { params: { caseId: string } }

// GET /api/counseling/[caseId]
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const c = await prisma.counselingCase.findUnique({
    where: { id: params.caseId },
    include: {
      user: { select: { id: true, name: true } },
      consultations: { orderBy: { consultDate: 'desc' } },
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  })

  if (!c) return NextResponse.json({ error: '케이스를 찾을 수 없습니다.' }, { status: 404 })

  // WORKPLACE_USER는 자신이 담당자인 케이스만
  if (auth.user!.role === 'WORKPLACE_USER' && c.assignedTo !== auth.user!.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  return NextResponse.json(c)
}

// PUT /api/counseling/[caseId]
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const c = await prisma.counselingCase.findUnique({ where: { id: params.caseId } })
  if (!c) return NextResponse.json({ error: '케이스를 찾을 수 없습니다.' }, { status: 404 })

  if (auth.user!.role === 'WORKPLACE_USER' && c.assignedTo !== auth.user!.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json()
  const updated = await prisma.counselingCase.update({
    where: { id: params.caseId },
    data: {
      victimName: body.victimName ?? c.victimName,
      victimContact: body.victimContact ?? c.victimContact,
      workplaceName: body.workplaceName !== undefined ? (body.workplaceName || null) : c.workplaceName,
      caseType: body.caseType !== undefined ? (body.caseType || null) : c.caseType,
      diseaseCategory: body.diseaseCategory !== undefined ? (body.diseaseCategory || null) : c.diseaseCategory,
      accidentDate: body.accidentDate ? new Date(body.accidentDate) : c.accidentDate,
      accidentType: body.accidentType ?? c.accidentType,
      diagnosisDate: body.diagnosisDate !== undefined ? (body.diagnosisDate ? new Date(body.diagnosisDate) : null) : c.diagnosisDate,
      diagnosisName: body.diagnosisName !== undefined ? (body.diagnosisName || null) : c.diagnosisName,
      guardianName: body.guardianName !== undefined ? (body.guardianName || null) : c.guardianName,
      guardianContact: body.guardianContact !== undefined ? (body.guardianContact || null) : c.guardianContact,
      status: (body.status as CaseStatus) ?? c.status,
      assignedTo: body.assignedTo ?? c.assignedTo,
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/counseling/[caseId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  // STAFF 이상만 삭제 가능
  if (auth.user!.role === 'WORKPLACE_USER') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const c = await prisma.counselingCase.findUnique({ where: { id: params.caseId } })
  if (!c) return NextResponse.json({ error: '케이스를 찾을 수 없습니다.' }, { status: 404 })

  await prisma.counselingCase.delete({ where: { id: params.caseId } })
  return NextResponse.json({ success: true })
}
