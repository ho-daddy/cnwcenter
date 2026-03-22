import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireSurveyAccess } from '@/lib/auth-utils'

type Params = { params: { surveyId: string; sectionId: string } }

// POST /api/surveys/[surveyId]/sections/[sectionId]/questions/reorder — 질문 순서 변경
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireSurveyAccess(params.surveyId)
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
    const { questionIds } = body

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: '질문 ID 목록이 필요합니다.' }, { status: 400 })
    }

    // 해당 섹션의 모든 질문이 포함되었는지 검증
    const existingQuestions = await prisma.surveyQuestion.findMany({
      where: { sectionId: params.sectionId },
      select: { id: true },
    })

    const existingIds = new Set(existingQuestions.map((q) => q.id))
    const providedIds = new Set(questionIds as string[])

    if (existingIds.size !== providedIds.size || ![...existingIds].every((id) => providedIds.has(id))) {
      return NextResponse.json({ error: '모든 질문 ID가 정확히 포함되어야 합니다.' }, { status: 400 })
    }

    // 트랜잭션으로 순서 업데이트
    await prisma.$transaction(
      (questionIds as string[]).map((id, index) =>
        prisma.surveyQuestion.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )

    const updatedQuestions = await prisma.surveyQuestion.findMany({
      where: { sectionId: params.sectionId },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ questions: updatedQuestions })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
