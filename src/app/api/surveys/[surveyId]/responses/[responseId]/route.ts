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
//
// 동기화 방식: 클라이언트가 가시 질문들의 (questionId, value) 목록을 보낸다.
// 서버는 기존 answer row와 비교해서 업데이트/생성/삭제로 동기화한다.
// - 받은 항목 중 기존 answer 있음 → update
// - 받은 항목 중 기존 answer 없음 → create
// - 받지 않은 기존 answer (= 가시성 false 된 질문) → delete
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
    answers?: { questionId: string; value: unknown }[]
  }

  await prisma.$transaction(async (tx) => {
    if (respondentName !== undefined) {
      await tx.surveyResponse.update({
        where: { id: params.responseId },
        data: { respondentName },
      })
    }

    if (answers) {
      // 입력 정규화: questionId 중복 제거 (마지막 값 유지)
      const incoming = new Map<string, unknown>()
      for (const a of answers) {
        if (a.questionId) incoming.set(a.questionId, a.value)
      }

      // 현재 응답에 매달린 모든 answer 조회
      const existing = await tx.surveyAnswer.findMany({
        where: { responseId: params.responseId },
        select: { id: true, questionId: true },
      })
      const existingByQ = new Map(existing.map(e => [e.questionId, e.id]))

      const ops: Promise<unknown>[] = []

      // 1) 받은 항목: update or create
      for (const [questionId, value] of incoming.entries()) {
        const existId = existingByQ.get(questionId)
        if (existId) {
          ops.push(
            tx.surveyAnswer.update({
              where: { id: existId },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: { value: value as any },
            })
          )
        } else {
          ops.push(
            tx.surveyAnswer.create({
              data: {
                responseId: params.responseId,
                questionId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value: value as any,
              },
            })
          )
        }
      }

      // 2) 받지 않은 기존 answer: 삭제 (가시성 false 된 질문)
      const toDelete: string[] = []
      for (const e of existing) {
        if (!incoming.has(e.questionId)) toDelete.push(e.id)
      }
      if (toDelete.length > 0) {
        ops.push(tx.surveyAnswer.deleteMany({ where: { id: { in: toDelete } } }))
      }

      await Promise.all(ops)
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
