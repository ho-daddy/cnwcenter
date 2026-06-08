import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSurveyAccess } from '@/lib/auth-utils'

type Params = { params: { surveyId: string; responseId: string } }

// GET /api/surveys/[surveyId]/responses/[responseId] — 응답 상세 (STAFF+)
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireSurveyAccess(params.surveyId)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const response = await prisma.surveyResponse.findUnique({
    where: { id: params.responseId },
    include: {
      answers: {
        include: {
          question: {
            select: {
              id: true,
              questionCode: true,
              questionText: true,
              questionType: true,
              options: true,
            },
          },
        },
      },
    },
  })

  if (!response) {
    return NextResponse.json({ error: '응답을 찾을 수 없습니다.' }, { status: 404 })
  }

  if (response.surveyId !== params.surveyId) {
    return NextResponse.json({ error: '해당 설문의 응답이 아닙니다.' }, { status: 400 })
  }

  return NextResponse.json(response)
}

// PATCH /api/surveys/[surveyId]/responses/[responseId] — 응답 수정 (STAFF+)
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireSurveyAccess(params.surveyId)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const response = await prisma.surveyResponse.findUnique({
    where: { id: params.responseId },
  })

  if (!response) return NextResponse.json({ error: '응답을 찾을 수 없습니다.' }, { status: 404 })
  if (response.surveyId !== params.surveyId) return NextResponse.json({ error: '해당 설문의 응답이 아닙니다.' }, { status: 400 })

  const body = await req.json()
  const { respondentName, answers } = body as {
    respondentName?: string
    answers?: { id: string; value: unknown }[]
  }

  await prisma.$transaction(async (tx) => {
    if (respondentName !== undefined) {
      await tx.surveyResponse.update({
        where: { id: params.responseId },
        data: { respondentName },
      })
    }
    if (answers?.length) {
      await Promise.all(
        answers.map((a) =>
          tx.surveyAnswer.update({
            where: { id: a.id },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { value: a.value as any },
          })
        )
      )
    }
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/surveys/[surveyId]/responses/[responseId] — 응답 삭제 (STAFF+)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireSurveyAccess(params.surveyId)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const response = await prisma.surveyResponse.findUnique({
    where: { id: params.responseId },
  })

  if (!response) {
    return NextResponse.json({ error: '응답을 찾을 수 없습니다.' }, { status: 404 })
  }

  if (response.surveyId !== params.surveyId) {
    return NextResponse.json({ error: '해당 설문의 응답이 아닙니다.' }, { status: 400 })
  }

  await prisma.surveyResponse.delete({ where: { id: params.responseId } })

  return NextResponse.json({ success: true })
}
