import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: { surveyId: string } }

// GET /api/surveys/[surveyId] — 설문조사 상세
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'STAFF')) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

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
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'STAFF')) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

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

  const body = await req.json()
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
}

// DELETE /api/surveys/[surveyId] — 설문조사 삭제 (DRAFT 상태만)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'STAFF')) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

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
