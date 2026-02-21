import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { QuestionType } from '@prisma/client'

type Params = { params: { surveyId: string } }

// GET /api/surveys/[surveyId]/analytics — 설문 분석 (STAFF+)
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'STAFF')) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
    include: {
      sections: {
        include: {
          questions: true,
        },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 전체 응답 가져오기
  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: params.surveyId },
    include: {
      answers: true,
    },
  })

  const totalResponses = responses.length
  const completedResponses = responses.filter((r) => r.completedAt !== null).length

  // 질문별 통계 계산
  const questionStats: Record<string, unknown> = {}

  // 질문 맵 구성
  const questionMap = new Map<string, { questionType: QuestionType; questionText: string; questionCode: string | null }>()
  for (const section of survey.sections) {
    for (const question of section.questions) {
      questionMap.set(question.id, {
        questionType: question.questionType,
        questionText: question.questionText,
        questionCode: question.questionCode,
      })
    }
  }

  // 질문별 답변 수집
  const answersByQuestion = new Map<string, unknown[]>()
  for (const response of responses) {
    if (!response.completedAt) continue // 완료된 응답만
    for (const answer of response.answers) {
      if (!answersByQuestion.has(answer.questionId)) {
        answersByQuestion.set(answer.questionId, [])
      }
      answersByQuestion.get(answer.questionId)!.push(answer.value)
    }
  }

  // 각 질문에 대해 통계 계산
  for (const [questionId, question] of questionMap) {
    const values = answersByQuestion.get(questionId) || []
    const responseCount = values.length

    const baseStat = {
      questionCode: question.questionCode,
      questionText: question.questionText,
      questionType: question.questionType,
      responseCount,
    }

    switch (question.questionType) {
      case 'RADIO':
      case 'DROPDOWN': {
        const counts: Record<string, number> = {}
        for (const val of values) {
          const strVal = String(val)
          counts[strVal] = (counts[strVal] || 0) + 1
        }
        questionStats[questionId] = { ...baseStat, optionCounts: counts }
        break
      }

      case 'CHECKBOX': {
        const counts: Record<string, number> = {}
        for (const val of values) {
          const arr = Array.isArray(val) ? val : [val]
          for (const item of arr) {
            const strItem = String(item)
            counts[strItem] = (counts[strItem] || 0) + 1
          }
        }
        questionStats[questionId] = { ...baseStat, optionCounts: counts }
        break
      }

      case 'NUMBER':
      case 'RANGE': {
        const numbers = values
          .map((v) => {
            const n = Number(v)
            return isNaN(n) ? null : n
          })
          .filter((n): n is number => n !== null)

        if (numbers.length > 0) {
          const sorted = [...numbers].sort((a, b) => a - b)
          const sum = numbers.reduce((acc, n) => acc + n, 0)
          const mid = Math.floor(sorted.length / 2)
          const median =
            sorted.length % 2 === 0
              ? (sorted[mid - 1] + sorted[mid]) / 2
              : sorted[mid]

          questionStats[questionId] = {
            ...baseStat,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            avg: Math.round((sum / numbers.length) * 100) / 100,
            median,
            validCount: numbers.length,
          }
        } else {
          questionStats[questionId] = {
            ...baseStat,
            min: null,
            max: null,
            avg: null,
            median: null,
            validCount: 0,
          }
        }
        break
      }

      case 'TEXT': {
        questionStats[questionId] = {
          ...baseStat,
          textValues: values.map((v) => String(v)),
        }
        break
      }

      case 'RANKED_CHOICE': {
        // 각 순위별로 선택된 값 카운트
        const rankCounts: Record<string, Record<string, number>> = {}
        for (const val of values) {
          if (Array.isArray(val)) {
            val.forEach((item, idx) => {
              const rank = `rank_${idx + 1}`
              if (!rankCounts[rank]) rankCounts[rank] = {}
              const strItem = String(item)
              rankCounts[rank][strItem] = (rankCounts[rank][strItem] || 0) + 1
            })
          }
        }
        questionStats[questionId] = { ...baseStat, rankCounts }
        break
      }

      case 'CONSENT': {
        let trueCount = 0
        let falseCount = 0
        for (const val of values) {
          if (val === true || val === 'true') {
            trueCount++
          } else {
            falseCount++
          }
        }
        questionStats[questionId] = {
          ...baseStat,
          trueCount,
          falseCount,
        }
        break
      }

      case 'TABLE': {
        // TABLE 타입은 복합적이므로 건너뜀
        questionStats[questionId] = {
          ...baseStat,
          note: 'TABLE 타입은 통계 분석을 지원하지 않습니다.',
        }
        break
      }

      default: {
        questionStats[questionId] = baseStat
        break
      }
    }
  }

  return NextResponse.json({
    totalResponses,
    completedResponses,
    questionStats,
  })
}
