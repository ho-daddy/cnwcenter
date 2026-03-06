import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

type Params = { params: { surveyId: string; sectionId: string } }

// PUT /api/surveys/[surveyId]/sections/[sectionId] — 섹션 수정
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
    return NextResponse.json({ error: '작성 중 상태의 설문만 수정할 수 있습니다.' }, { status: 400 })
  }

  const section = await prisma.surveySection.findUnique({
    where: { id: params.sectionId },
  })

  if (!section || section.surveyId !== params.surveyId) {
    return NextResponse.json({ error: '섹션을 찾을 수 없습니다.' }, { status: 404 })
  }

  try {
    const body = await parseJsonBody(req)
    const { title, description } = body

    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      return NextResponse.json({ error: '섹션 제목을 입력해주세요.' }, { status: 400 })
    }

    const updated = await prisma.surveySection.update({
      where: { id: params.sectionId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
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

// DELETE /api/surveys/[surveyId]/sections/[sectionId] — 섹션 삭제 (질문 포함 cascade)
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
    return NextResponse.json({ error: '작성 중 상태의 설문만 수정할 수 있습니다.' }, { status: 400 })
  }

  const section = await prisma.surveySection.findUnique({
    where: { id: params.sectionId },
  })

  if (!section || section.surveyId !== params.surveyId) {
    return NextResponse.json({ error: '섹션을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 섹션 삭제 (onDelete: Cascade로 질문도 자동 삭제)
  await prisma.surveySection.delete({
    where: { id: params.sectionId },
  })

  return NextResponse.json({ success: true })
}
