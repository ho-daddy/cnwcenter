import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { parseJsonBody, ApiError } from '@/lib/api-utils'

type Params = { params: { caseId: string } }

// POST /api/counseling/[caseId]/consultations
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const c = await prisma.counselingCase.findUnique({ where: { id: params.caseId } })
  if (!c) return NextResponse.json({ error: '케이스를 찾을 수 없습니다.' }, { status: 404 })

  if (auth.user!.role === 'WORKPLACE_USER' && c.assignedTo !== auth.user!.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  try {
    const body = await parseJsonBody(req)
    const { consultDate, consultType, content, nextAction } = body

    if (!consultDate || !consultType || !content) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }

    const consultation = await prisma.consultation.create({
      data: {
        caseId: params.caseId,
        consultDate: new Date(consultDate),
        consultType,
        content,
        nextAction: nextAction || null,
      },
    })

    return NextResponse.json(consultation, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
