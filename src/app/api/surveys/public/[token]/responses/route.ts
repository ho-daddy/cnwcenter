import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { parseJsonBody, ApiError } from '@/lib/api-utils'

type Params = { params: { token: string } }

// POST /api/surveys/public/[token]/responses — 설문 응답 제출 (인증 불필요)
export async function POST(req: NextRequest, { params }: Params) {
  const survey = await prisma.survey.findUnique({
    where: {
      accessToken: params.token,
    },
    include: {
      sections: {
        include: {
          questions: true,
        },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 })
  }

  if (survey.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: '현재 응답할 수 없는 설문입니다.' },
      { status: 400 }
    )
  }

  try {
    const body = await parseJsonBody(req)
    const { respondentName, respondentInfo, answers } = body as {
      respondentName?: string
      respondentInfo?: Record<string, unknown>
      answers: Record<string, unknown>
    }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: '응답 데이터가 필요합니다.' }, { status: 400 })
    }

    // 유효한 questionId 목록 수집
    const validQuestionIds = new Set<string>()
    for (const section of survey.sections) {
      for (const question of section.questions) {
        validQuestionIds.add(question.id)
      }
    }

    // 유효하지 않은 questionId 필터링
    const validAnswers = Object.entries(answers).filter(([questionId]) =>
      validQuestionIds.has(questionId)
    )

    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        respondentName: respondentName || null,
        respondentInfo: respondentInfo
          ? (respondentInfo as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        completedAt: new Date(),
        answers: {
          create: validAnswers.map(([questionId, value]) => ({
            questionId,
            value: value as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        _count: { select: { answers: true } },
      },
    })

    return NextResponse.json(
      {
        id: response.id,
        completedAt: response.completedAt,
        answerCount: response._count.answers,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
