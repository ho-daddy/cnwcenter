/**
 * 설문 무작위 응답 100건 생성 스크립트
 * Usage: npx tsx scripts/seed-responses.ts <token>
 */

import { prisma } from '../src/lib/prisma'

const TOKEN = process.argv[2]
if (!TOKEN) {
  console.error('Usage: npx tsx scripts/seed-responses.ts <token>')
  process.exit(1)
}

// ── 랜덤 유틸 ──
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randFloat = (min: number, max: number, step: number) => {
  const steps = Math.floor((max - min) / step)
  return min + Math.floor(Math.random() * (steps + 1)) * step
}

// 한국 이름 생성
const LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']
const FIRST_NAMES = ['민수', '영희', '철수', '지영', '성호', '미영', '준혁', '수진', '동현', '혜진', '승민', '소연', '재원', '유진', '태현', '하나', '상호', '은정', '진우', '서연']
const randomName = () => pick(LAST_NAMES) + pick(FIRST_NAMES)

const DEPARTMENTS = ['생산1팀', '생산2팀', '품질관리팀', '설비팀', '안전환경팀', '물류팀', '포장팀', '도장팀', '조립팀', '검사팀']
const PROCESSES = ['프레스', '용접', '도장', '조립', '검사', '포장', '설비보전', '원료투입', '혼합', '가공', '절단', '연마']

// ── 질문 타입별 랜덤 답변 생성 ──
function generateAnswer(q: {
  questionType: string
  questionCode: string | null
  options: unknown
  required: boolean
}): unknown {
  // 필수가 아니면 30% 확률로 건너뛰기
  if (!q.required && Math.random() < 0.3) return undefined

  const opts = q.options as Record<string, unknown> | Array<{ value: string }> | null

  switch (q.questionType) {
    case 'CONSENT':
      return true

    case 'TEXT': {
      const code = q.questionCode || ''
      if (code === 'S0-name') return randomName()
      if (code === 'S0-department') return pick(DEPARTMENTS)
      if (code === 'S0-process') return pick(PROCESSES)
      if (code.includes('other') || code.includes('Other') || code.includes('desc')) {
        return pick(['특이사항 없음', '해당 없음', '기타 의견입니다', '개선 필요'])
      }
      return pick(['해당 없음', '특이사항 없음', ''])
    }

    case 'NUMBER': {
      const numOpts = opts as { min?: number; max?: number } | null
      const min = numOpts?.min ?? 0
      const max = numOpts?.max ?? 50
      const code = q.questionCode || ''
      if (code === 'S0-age') return randInt(22, 58)
      if (code === 'S0-serviceYears') return randInt(0, 25)
      if (code === 'S0-serviceMonths') return randInt(0, 11)
      if (code === 'S0-deptYears') return randInt(0, 15)
      if (code === 'S0-deptMonths') return randInt(0, 11)
      if (code === 'S0-workHours') return randInt(40, 60)
      if (code.includes('count')) return randInt(1, 3)
      if (code.includes('days')) return randInt(1, 30)
      return randInt(min, Math.min(max, 100))
    }

    case 'RADIO': {
      const radioOpts = opts as Array<{ value: string }> | null
      if (!Array.isArray(radioOpts) || radioOpts.length === 0) return null
      // '기타' 선택 확률을 낮춤
      const filtered = radioOpts.filter(o => o.value !== '기타')
      if (filtered.length > 0 && Math.random() < 0.9) return pick(filtered).value
      return pick(radioOpts).value
    }

    case 'CHECKBOX': {
      const cbOpts = opts as Array<{ value: string }> | null
      if (!Array.isArray(cbOpts) || cbOpts.length === 0) return []
      // 1~3개 랜덤 선택
      const count = randInt(1, Math.min(3, cbOpts.length))
      const shuffled = [...cbOpts].sort(() => Math.random() - 0.5)
      return shuffled.slice(0, count).map(o => o.value)
    }

    case 'DROPDOWN': {
      const ddOpts = opts as Array<{ value: string }> | null
      if (!Array.isArray(ddOpts) || ddOpts.length === 0) return null
      return pick(ddOpts).value
    }

    case 'RANGE': {
      const rangeOpts = opts as { min?: number; max?: number; step?: number } | null
      const min = rangeOpts?.min ?? 0
      const max = rangeOpts?.max ?? 100
      const step = rangeOpts?.step ?? 5
      return randFloat(min, max, step)
    }

    case 'TABLE': {
      const tableOpts = opts as { columns?: Array<{ key: string }>; rowCount?: number } | null
      const cols = tableOpts?.columns || []
      const rowCount = tableOpts?.rowCount || 3
      const rows: Record<string, string>[] = []
      const usedRows = randInt(0, rowCount)
      for (let i = 0; i < usedRows; i++) {
        const row: Record<string, string> = {}
        for (const col of cols) {
          if (col.key === 'name') row[col.key] = pick(['시너', '세척제', '접착제', ''])
          else if (col.key === 'use') row[col.key] = pick(['세척', '도장', '접합', ''])
          else row[col.key] = ''
        }
        rows.push(row)
      }
      return rows
    }

    case 'RANKED_CHOICE': {
      const rcOpts = opts as { choices?: Array<{ value: string }>; rankCount?: number } | null
      const choices = rcOpts?.choices || []
      const rankCount = rcOpts?.rankCount || 3
      const shuffled = [...choices].sort(() => Math.random() - 0.5)
      return shuffled.slice(0, rankCount).map(c => c.value)
    }

    default:
      return null
  }
}

async function main() {
  const survey = await prisma.survey.findUnique({
    where: { accessToken: TOKEN },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          questions: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  })

  if (!survey) {
    console.error('❌ 설문을 찾을 수 없습니다:', TOKEN)
    process.exit(1)
  }

  console.log(`📋 설문: ${survey.title}`)
  console.log(`   섹션: ${survey.sections.length}개`)
  const totalQuestions = survey.sections.reduce((sum, s) => sum + s.questions.length, 0)
  console.log(`   질문: ${totalQuestions}개`)
  console.log()

  const TOTAL = 100

  for (let i = 0; i < TOTAL; i++) {
    const answers: Record<string, unknown> = {}
    const name = randomName()

    for (const section of survey.sections) {
      for (const question of section.questions) {
        // 조건부 로직이 있는 질문은 간단하게 처리
        const answer = generateAnswer({
          questionType: question.questionType,
          questionCode: question.questionCode,
          options: question.options,
          required: question.required,
        })
        if (answer !== undefined) {
          answers[question.id] = answer
        }
      }
    }

    await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        respondentName: name,
        respondentInfo: {},
        completedAt: new Date(Date.now() - randInt(0, 7 * 24 * 60 * 60 * 1000)), // 최근 7일 내
        answers: {
          create: Object.entries(answers).map(([questionId, value]) => ({
            questionId,
            value: value as any,
          })),
        },
      },
    })

    if ((i + 1) % 10 === 0) {
      console.log(`✅ ${i + 1}/${TOTAL}건 완료`)
    }
  }

  console.log(`\n🎉 ${TOTAL}건 응답 생성 완료!`)
}

main()
  .catch((e) => {
    console.error('오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
