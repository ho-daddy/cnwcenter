import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

type Params = { params: { surveyId: string } }

// GET /api/surveys/[surveyId] — 설문조사 상세
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
    include: {
      workplace: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      _count: {
        select: { responses: true },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(survey)
}

// PUT /api/surveys/[surveyId] — 설문조사 수정 (DRAFT 상태만)
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (survey.status !== 'DRAFT') {
    return NextResponse.json(
      { error: '작성중(DRAFT) 상태의 설문만 수정할 수 있습니다.' },
      { status: 400 }
    )
  }

  try {
    const body = await parseJsonBody(req)
    const { title, description, year, purpose, workplaceId } = body

    const updated = await prisma.survey.update({
      where: { id: params.surveyId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(year !== undefined && { year: parseInt(year) }),
        ...(purpose !== undefined && { purpose }),
        ...(workplaceId !== undefined && { workplaceId: workplaceId || null }),
      },
      include: {
        workplace: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE /api/surveys/[surveyId] — 설문조사 삭제 (DRAFT 상태만)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (survey.status !== 'DRAFT') {
    return NextResponse.json(
      { error: '작성중(DRAFT) 상태의 설문만 삭제할 수 있습니다.' },
      { status: 400 }
    )
  }

  await prisma.survey.delete({ where: { id: params.surveyId } })

  return NextResponse.json({ success: true })
}
