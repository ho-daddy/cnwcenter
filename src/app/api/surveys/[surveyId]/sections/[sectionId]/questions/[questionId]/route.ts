import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { QuestionType } from '@prisma/client'

type Params = { params: { surveyId: string; sectionId: string; questionId: string } }

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

// PUT /api/surveys/[surveyId]/sections/[sectionId]/questions/[questionId] — 질문 수정
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
    return NextResponse.json({ error: '작성 중 상태의 설문만 수정할 수 있습니다.' }, { status: 400 })
  }

  const question = await prisma.surveyQuestion.findUnique({
    where: { id: params.questionId },
    include: { section: true },
  })

  if (!question || question.sectionId !== params.sectionId || question.section.surveyId !== params.surveyId) {
    return NextResponse.json({ error: '질문을 찾을 수 없습니다.' }, { status: 404 })
  }

  const body = await req.json()
  const { questionCode, questionText, questionType, required, options, conditionalLogic } = body

  if (questionText !== undefined && (typeof questionText !== 'string' || questionText.trim().length === 0)) {
    return NextResponse.json({ error: '질문 내용을 입력해주세요.' }, { status: 400 })
  }

  if (questionType !== undefined && !VALID_QUESTION_TYPES.includes(questionType as QuestionType)) {
    return NextResponse.json({ error: '유효하지 않은 질문 유형입니다.' }, { status: 400 })
  }

  const updated = await prisma.surveyQuestion.update({
    where: { id: params.questionId },
    data: {
      ...(questionCode !== undefined && { questionCode: questionCode?.trim() || null }),
      ...(questionText !== undefined && { questionText: questionText.trim() }),
      ...(questionType !== undefined && { questionType: questionType as QuestionType }),
      ...(required !== undefined && { required }),
      ...(options !== undefined && { options: options ?? null }),
      ...(conditionalLogic !== undefined && { conditionalLogic: conditionalLogic ?? null }),
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/surveys/[surveyId]/sections/[sectionId]/questions/[questionId] — 질문 삭제
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
    return NextResponse.json({ error: '작성 중 상태의 설문만 수정할 수 있습니다.' }, { status: 400 })
  }

  const question = await prisma.surveyQuestion.findUnique({
    where: { id: params.questionId },
    include: { section: true },
  })

  if (!question || question.sectionId !== params.sectionId || question.section.surveyId !== params.surveyId) {
    return NextResponse.json({ error: '질문을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 질문 삭제 (onDelete: Cascade로 답변도 자동 삭제)
  await prisma.surveyQuestion.delete({
    where: { id: params.questionId },
  })

  return NextResponse.json({ success: true })
}
