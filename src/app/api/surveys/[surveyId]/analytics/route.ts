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
        questionStats[questionId] = { ...baseStat, data: counts }
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
        questionStats[questionId] = { ...baseStat, data: counts }
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
            data: {
              min: sorted[0],
              max: sorted[sorted.length - 1],
              avg: Math.round((sum / numbers.length) * 100) / 100,
              median,
            },
          }
        } else {
          questionStats[questionId] = {
            ...baseStat,
            data: { min: null, max: null, avg: null, median: null },
          }
        }
        break
      }

      case 'TEXT': {
        // 텍스트 응답을 빈도수 기반 Record로 집계
        const textCounts: Record<string, number> = {}
        for (const val of values) {
          const strVal = String(val)
          if (strVal && strVal !== 'null' && strVal !== 'undefined') {
            textCounts[strVal] = (textCounts[strVal] || 0) + 1
          }
        }
        questionStats[questionId] = { ...baseStat, data: textCounts }
        break
      }

      case 'RANKED_CHOICE': {
        // 가중 점수 방식: 1순위 = N점, 2순위 = N-1점, ...
        const weightedScores: Record<string, number> = {}
        for (const val of values) {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            // { "1": "항목A", "2": "항목B", "3": "항목C" } 형태
            const ranked = val as Record<string, string>
            const totalRanks = Object.keys(ranked).length
            for (const [rankStr, item] of Object.entries(ranked)) {
              const rank = parseInt(rankStr)
              if (isNaN(rank) || !item) continue
              const weight = totalRanks - rank + 1
              weightedScores[item] = (weightedScores[item] || 0) + weight
            }
          } else if (Array.isArray(val)) {
            const totalRanks = val.length
            val.forEach((item, idx) => {
              const strItem = String(item)
              const weight = totalRanks - idx
              weightedScores[strItem] = (weightedScores[strItem] || 0) + weight
            })
          }
        }
        questionStats[questionId] = { ...baseStat, data: weightedScores }
        break
      }

      case 'CONSENT': {
        const consentCounts: Record<string, number> = { 'true': 0, 'false': 0 }
        for (const val of values) {
          if (val === true || val === 'true') {
            consentCounts['true']++
          } else {
            consentCounts['false']++
          }
        }
        // 0건인 키 제거
        if (consentCounts['false'] === 0) delete consentCounts['false']
        if (consentCounts['true'] === 0) delete consentCounts['true']
        questionStats[questionId] = { ...baseStat, data: consentCounts }
        break
      }

      case 'TABLE': {
        questionStats[questionId] = {
          ...baseStat,
          data: null,
        }
        break
      }

      default: {
        questionStats[questionId] = { ...baseStat, data: null }
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
