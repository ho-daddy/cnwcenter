import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QuestionType } from '@prisma/client'
import { requireSurveyAccess } from '@/lib/auth-utils'

type Params = { params: { surveyId: string } }

// GET /api/surveys/[surveyId]/analytics — 설문 분석 (STAFF+)
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireSurveyAccess(params.surveyId)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

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

  // ─── 추가 분석: 근속기간 합산 + 근골격계 부위별 판정 ───

  const BODY_PARTS = [
    { key: 'neck', label: '목' },
    { key: 'shoulder', label: '어깨' },
    { key: 'arm', label: '팔/팔꿈치' },
    { key: 'hand', label: '손/손목/손가락' },
    { key: 'back', label: '허리' },
    { key: 'leg', label: '다리/발' },
  ]

  // questionCode → questionId 매핑
  const codeToId = new Map<string, string>()
  for (const [qId, q] of questionMap) {
    if (q.questionCode) codeToId.set(q.questionCode, qId)
  }

  // 증상조사 부위 질문 코드 prefix 탐지 (Q4-1 표준, Q2-1 구형 대응)
  const SYMPTOM_PREFIX = codeToId.has('Q4-1') ? 'Q4-1' : (codeToId.has('Q2-1') ? 'Q2-1' : 'Q4-1')

  // 숨길 질문 ID (개별 표시 대신 합산/판정으로 대체)
  const hiddenCodes = new Set([
    'S0-serviceYears', 'S0-serviceMonths',
    'S0-deptYears', 'S0-deptMonths',
    ...BODY_PARTS.flatMap((bp) => [
      `${SYMPTOM_PREFIX}-${bp.key}-period`,
      `${SYMPTOM_PREFIX}-${bp.key}-level`,
      `${SYMPTOM_PREFIX}-${bp.key}-freq`,
    ]),
  ])
  const hiddenQuestionIds: string[] = []
  for (const code of hiddenCodes) {
    const id = codeToId.get(code)
    if (id) hiddenQuestionIds.push(id)
  }

  // ─── 근속기간 합산 통계 ───
  function formatMonths(m: number): string {
    const years = Math.floor(m / 12)
    const months = Math.round(m % 12)
    return `${years}년 ${months}개월`
  }

  function computeTenure(yearsCode: string, monthsCode: string, label: string) {
    const totalMonths: number[] = []
    const yearsId = codeToId.get(yearsCode)
    const monthsId = codeToId.get(monthsCode)

    for (const response of responses) {
      if (!response.completedAt) continue
      const ansMap = new Map(response.answers.map((a) => [a.questionId, a.value]))
      const y = yearsId ? Number(ansMap.get(yearsId)) : NaN
      const mo = monthsId ? Number(ansMap.get(monthsId)) : NaN
      if (!isNaN(y) || !isNaN(mo)) {
        totalMonths.push((isNaN(y) ? 0 : y) * 12 + (isNaN(mo) ? 0 : mo))
      }
    }
    if (totalMonths.length === 0) return null

    const sorted = [...totalMonths].sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

    return {
      label,
      min: formatMonths(sorted[0]),
      max: formatMonths(sorted[sorted.length - 1]),
      avg: formatMonths(sum / sorted.length),
      median: formatMonths(median),
      count: sorted.length,
    }
  }

  const combinedStats = {
    tenure: computeTenure('S0-serviceYears', 'S0-serviceMonths', '근속기간'),
    deptTenure: computeTenure('S0-deptYears', 'S0-deptMonths', '부서 근속기간'),
  }

  // ─── 근골격계 부위별 판정 ───
  type AssessmentLevel = '정상' | '관리대상자' | '통증호소자'

  function assessBodyPart(
    level: string | null,
    period: string | null,
    freq: string | null
  ): AssessmentLevel {
    if (!level) return '정상'

    const severeLevel = level === '심함' || level === '매우 심함'
    const highLevel = level === '중간' || level === '심함' || level === '매우 심함'
    const longPeriod = period === '1주일~1달' || period === '1달~6개월' || period === '6개월 이상'
    const highFreq = freq === '1개월에 1번' || freq === '1주일에 1번' || freq === '매일'

    // 통증호소자: 기간 AND 빈도 AND 심함 이상 (3개 모두 충족)
    if (severeLevel && longPeriod && highFreq) return '통증호소자'
    // 관리대상자: 중간 이상 AND (기간 OR 빈도) 중 하나 충족
    if (highLevel && (longPeriod || highFreq)) return '관리대상자'
    // 약함이거나 기간/빈도 조건 미충족 → 정상
    return '정상'
  }

  const bodyPartSummary: Record<string, Record<AssessmentLevel, number>> = {}
  const totalSummary: Record<AssessmentLevel, number> = { 정상: 0, 관리대상자: 0, 통증호소자: 0 }
  let respondentCount = 0

  for (const bp of BODY_PARTS) {
    bodyPartSummary[bp.label] = { 정상: 0, 관리대상자: 0, 통증호소자: 0 }
  }

  for (const response of responses) {
    if (!response.completedAt) continue
    respondentCount++

    const ansMap = new Map(response.answers.map((a) => [a.questionId, a.value]))
    const bodyPartQId = codeToId.get(SYMPTOM_PREFIX)
    const selectedParts = bodyPartQId ? (ansMap.get(bodyPartQId) as string[] | undefined) || [] : []

    let worstLevel: AssessmentLevel = '정상'

    for (const bp of BODY_PARTS) {
      if (Array.isArray(selectedParts) && selectedParts.includes(bp.label)) {
        const periodId = codeToId.get(`${SYMPTOM_PREFIX}-${bp.key}-period`)
        const levelId = codeToId.get(`${SYMPTOM_PREFIX}-${bp.key}-level`)
        const freqId = codeToId.get(`${SYMPTOM_PREFIX}-${bp.key}-freq`)

        const period = periodId ? String(ansMap.get(periodId) ?? '') || null : null
        const level = levelId ? String(ansMap.get(levelId) ?? '') || null : null
        const freq = freqId ? String(ansMap.get(freqId) ?? '') || null : null

        const result = assessBodyPart(level, period, freq)
        bodyPartSummary[bp.label][result]++

        if (result === '통증호소자') worstLevel = '통증호소자'
        else if (result === '관리대상자' && worstLevel !== '통증호소자') worstLevel = '관리대상자'
      } else {
        bodyPartSummary[bp.label]['정상']++
      }
    }

    totalSummary[worstLevel]++
  }

  const bodyPartAssessment = {
    summary: bodyPartSummary,
    totalSummary,
    respondentCount,
  }

  return NextResponse.json({
    totalResponses,
    completedResponses,
    questionStats,
    bodyPartAssessment,
    combinedStats,
    hiddenQuestionIds,
  })
}
