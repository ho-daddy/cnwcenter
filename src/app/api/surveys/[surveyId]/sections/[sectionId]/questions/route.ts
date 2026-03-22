import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QuestionType } from '@prisma/client'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireSurveyAccess } from '@/lib/auth-utils'

type Params = { params: { surveyId: string; sectionId: string } }

const VALID_QUESTION_TYPES: QuestionType[] = [
  'TEXT',
  'NUMBER',
  'RADIO',
  'CHECKBOX',
  'RANGE',
  'DROPDOWN',
  'TABLE',
  'RANKED_CHOICE',
  'CONSENT',
]

// POST /api/surveys/[surveyId]/sections/[sectionId]/questions — 질문 추가
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
    const { questionCode, questionText, questionType, required, options, conditionalLogic } = body

    if (!questionText || typeof questionText !== 'string' || questionText.trim().length === 0) {
      return NextResponse.json({ error: '질문 내용을 입력해주세요.' }, { status: 400 })
    }

    if (!questionType || !VALID_QUESTION_TYPES.includes(questionType as QuestionType)) {
      return NextResponse.json({ error: '유효하지 않은 질문 유형입니다.' }, { status: 400 })
    }

    // 현재 섹션 내 최대 sortOrder 조회
    const maxQuestion = await prisma.surveyQuestion.findFirst({
      where: { sectionId: params.sectionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const sortOrder = maxQuestion ? maxQuestion.sortOrder + 1 : 0

    const question = await prisma.surveyQuestion.create({
      data: {
        sectionId: params.sectionId,
        questionCode: questionCode?.trim() || null,
        questionText: questionText.trim(),
        questionType: questionType as QuestionType,
        required: required ?? false,
        sortOrder,
        options: options ?? null,
        conditionalLogic: conditionalLogic ?? null,
      },
    })

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
