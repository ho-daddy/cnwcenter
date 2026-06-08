import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth-utils'
import { parseJsonBody } from '@/lib/api-utils'

export const runtime = 'nodejs'

// POST /api/paper-ocr/submit — accessToken + answers(코드 기반) → 응답 저장
// 코드→questionId 변환 후 saeum.space 공개 응답 저장 로직과 동일하게 DB에 기록
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await parseJsonBody(req)
  const { accessToken, respondentName, answers, codeToId, responseId } = body as {
    accessToken?: string
    respondentName?: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    answers?: Record<string, any>
    codeToId?: Record<string, string>
    responseId?: string | null
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'accessToken이 필요합니다.' }, { status: 400 })
  }
  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: '응답 데이터가 필요합니다.' }, { status: 400 })
  }

  const survey = await prisma.survey.findUnique({
    where: { accessToken },
    include: { sections: { include: { questions: true } } },
  })
  if (!survey) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (survey.status !== 'PUBLISHED') {
    return NextResponse.json({ error: '현재 응답할 수 없는 설문입니다.' }, { status: 400 })
  }

  // questionCode → questionId 변환 (codeToId 우선, 없으면 구조에서 재구성)
  const mapping: Record<string, string> = { ...(codeToId ?? {}) }
  if (Object.keys(mapping).length === 0) {
    for (const section of survey.sections) {
      for (const q of section.questions) {
        if (q.questionCode) mapping[q.questionCode] = q.id
      }
    }
  }

  const validQuestionIds = new Set<string>()
  for (const section of survey.sections) {
    for (const q of section.questions) validQuestionIds.add(q.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answersById: Array<[string, any]> = []
  for (const [code, value] of Object.entries(answers)) {
    const qid = mapping[code]
    if (qid && validQuestionIds.has(qid) && value !== null && value !== undefined) {
      answersById.push([qid, value])
    }
  }

  try {
    // responseId가 있고 해당 응답이 이 설문에 속하면 기존 응답을 수정(재제출),
    // 없으면 새로 생성. → 제출 후 수정/재제출 지원
    let existingId: string | null = null
    if (responseId) {
      const existing = await prisma.surveyResponse.findUnique({
        where: { id: responseId },
        select: { id: true, surveyId: true },
      })
      if (existing && existing.surveyId === survey.id) existingId = existing.id
    }

    const answersCreate = answersById.map(([questionId, value]) => ({
      questionId,
      value: value as Prisma.InputJsonValue,
    }))

    let response: { id: string; completedAt: Date | null; _count: { answers: number } }

    if (existingId) {
      // 기존 답변 전체 삭제 후 재생성 (in-place update)
      response = await prisma.$transaction(async (tx) => {
        await tx.surveyAnswer.deleteMany({ where: { responseId: existingId! } })
        return tx.surveyResponse.update({
          where: { id: existingId! },
          data: {
            respondentName: respondentName || null,
            completedAt: new Date(),
            answers: { create: answersCreate },
          },
          include: { _count: { select: { answers: true } } },
        })
      })
    } else {
      response = await prisma.surveyResponse.create({
        data: {
          surveyId: survey.id,
          respondentName: respondentName || null,
          respondentInfo: Prisma.JsonNull,
          completedAt: new Date(),
          answers: { create: answersCreate },
        },
        include: { _count: { select: { answers: true } } },
      })
    }

    return NextResponse.json(
      {
        id: response.id,
        completedAt: response.completedAt,
        answerCount: response._count.answers,
        updated: !!existingId,
      },
      { status: existingId ? 200 : 201 }
    )
  } catch (e) {
    console.error('[paper-ocr submit]', e)
    return NextResponse.json({ error: '응답 저장에 실패했습니다.' }, { status: 500 })
  }
}
