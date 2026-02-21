import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

type Params = { params: { surveyId: string } }

// GET /api/surveys/[surveyId]/analytics/export — 설문 원본 데이터 Excel 내보내기
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'STAFF')) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
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
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 모든 응답 + 답변 가져오기
  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: params.surveyId },
    orderBy: { createdAt: 'asc' },
    include: {
      answers: true,
    },
  })

  // 질문 목록 (순서대로)
  const allQuestions = survey.sections.flatMap((s) => s.questions)
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]))

  // ─── 워크북 생성 ───
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '새움터'
  workbook.created = new Date()

  // ─── Sheet 1: 원본 데이터 (응답자 × 질문 매트릭스) ───
  const rawSheet = workbook.addWorksheet('원본 데이터')

  // 헤더: 번호 | 응답자 | 응답일시 | 질문1 | 질문2 | ...
  const headerRow1 = ['번호', '응답자', '응답일시']
  const headerRow2 = ['', '', '']
  for (const section of survey.sections) {
    for (const q of section.questions) {
      headerRow1.push(q.questionCode || '')
      headerRow2.push(q.questionText)
    }
  }

  // 섹션 구분 행
  const sectionRow = ['', '', '']
  for (const section of survey.sections) {
    for (let i = 0; i < section.questions.length; i++) {
      sectionRow.push(i === 0 ? section.title : '')
    }
  }

  rawSheet.addRow(sectionRow)
  rawSheet.addRow(headerRow1)
  rawSheet.addRow(headerRow2)

  // 스타일: 섹션 행
  const sectionRowObj = rawSheet.getRow(1)
  sectionRowObj.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FF4472C4' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FB' } }
  })

  // 스타일: 코드 행
  const codeRowObj = rawSheet.getRow(2)
  codeRowObj.eachCell((cell) => {
    cell.font = { bold: true, size: 9, color: { argb: 'FF666666' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    }
  })

  // 스타일: 질문 텍스트 행
  const textRowObj = rawSheet.getRow(3)
  textRowObj.eachCell((cell) => {
    cell.font = { bold: true, size: 9 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF4472C4' } },
    }
  })
  textRowObj.height = 40

  // 데이터 행
  responses.forEach((response, idx) => {
    const answerMap = new Map(response.answers.map((a) => [a.questionId, a.value]))
    const row: (string | number | boolean)[] = [
      idx + 1,
      response.respondentName || `응답자${idx + 1}`,
      response.completedAt
        ? formatDateTime(response.completedAt)
        : formatDateTime(response.createdAt),
    ]

    for (const q of allQuestions) {
      const val = answerMap.get(q.id)
      row.push(formatValue(val, q.questionType))
    }

    const dataRow = rawSheet.addRow(row)
    // 짝수행 배경
    if (idx % 2 === 1) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } }
      })
    }
    dataRow.eachCell((cell) => {
      cell.font = { size: 9 }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
  })

  // 열 너비 설정
  rawSheet.getColumn(1).width = 6
  rawSheet.getColumn(2).width = 10
  rawSheet.getColumn(3).width = 18
  for (let i = 4; i <= 3 + allQuestions.length; i++) {
    rawSheet.getColumn(i).width = 20
  }

  // 섹션 머지: 같은 섹션에 속하는 열 범위
  let colIdx = 4 // 1-based, 4번째부터 질문 시작
  for (const section of survey.sections) {
    if (section.questions.length > 1) {
      const startCol = colIdx
      const endCol = colIdx + section.questions.length - 1
      rawSheet.mergeCells(1, startCol, 1, endCol)
    }
    colIdx += section.questions.length
  }

  // 필터 설정
  rawSheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: 3 + allQuestions.length },
  }

  // 틀 고정 (3행, 3열)
  rawSheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 3 }]

  // ─── Sheet 2: 요약 통계 ───
  const summarySheet = workbook.addWorksheet('요약 통계')
  summarySheet.addRow(['설문 제목', survey.title])
  summarySheet.addRow(['연도', survey.year])
  summarySheet.addRow(['총 응답수', responses.length])
  summarySheet.addRow(['완료 응답수', responses.filter((r) => r.completedAt).length])
  summarySheet.addRow([])
  summarySheet.addRow(['질문코드', '질문', '유형', '응답수', '요약'])

  // 요약 헤더 스타일
  const summaryHeaderRow = summarySheet.getRow(6)
  summaryHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF4472C4' } } }
  })

  for (const q of allQuestions) {
    const values = responses
      .map((r) => {
        const a = r.answers.find((a) => a.questionId === q.id)
        return a?.value
      })
      .filter((v) => v !== undefined && v !== null)

    const summary = generateSummary(values, q.questionType)
    summarySheet.addRow([
      q.questionCode || '',
      q.questionText,
      q.questionType,
      values.length,
      summary,
    ])
  }

  summarySheet.getColumn(1).width = 18
  summarySheet.getColumn(2).width = 50
  summarySheet.getColumn(3).width = 15
  summarySheet.getColumn(4).width = 10
  summarySheet.getColumn(5).width = 60

  // 메타 정보 스타일
  for (let i = 1; i <= 4; i++) {
    const row = summarySheet.getRow(i)
    row.getCell(1).font = { bold: true, size: 10 }
    row.getCell(2).font = { size: 10 }
  }

  // ─── 버퍼 생성 및 응답 ───
  const buffer = await workbook.xlsx.writeBuffer()

  const filename = `${survey.title}_응답데이터_${formatDate(new Date())}.xlsx`
  const encodedFilename = encodeURIComponent(filename)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  })
}

// ─── 헬퍼 함수 ───

function formatValue(val: unknown, questionType: string): string {
  if (val === null || val === undefined) return ''

  switch (questionType) {
    case 'CONSENT':
      return val === true || val === 'true' ? '동의' : '미동의'

    case 'CHECKBOX':
      if (Array.isArray(val)) return val.join(', ')
      return String(val)

    case 'RANKED_CHOICE':
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const ranked = val as Record<string, string>
        return Object.entries(ranked)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([rank, item]) => `${rank}순위: ${item}`)
          .join(', ')
      }
      if (Array.isArray(val)) {
        return val.map((item, idx) => `${idx + 1}순위: ${item}`).join(', ')
      }
      return String(val)

    case 'TABLE':
      if (Array.isArray(val)) {
        return val
          .map((row: Record<string, string>) =>
            Object.entries(row)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' / ')
          )
          .join(' | ')
      }
      return String(val)

    default:
      if (typeof val === 'object') return JSON.stringify(val)
      return String(val)
  }
}

function generateSummary(values: unknown[], questionType: string): string {
  if (values.length === 0) return '응답 없음'

  switch (questionType) {
    case 'RADIO':
    case 'DROPDOWN': {
      const counts: Record<string, number> = {}
      for (const v of values) {
        const s = String(v)
        counts[s] = (counts[s] || 0) + 1
      }
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
      return sorted.map(([label, count]) => `${label}(${count})`).join(', ')
    }

    case 'CHECKBOX': {
      const counts: Record<string, number> = {}
      for (const v of values) {
        const arr = Array.isArray(v) ? v : [v]
        for (const item of arr) counts[String(item)] = (counts[String(item)] || 0) + 1
      }
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
      return sorted.map(([label, count]) => `${label}(${count})`).join(', ')
    }

    case 'NUMBER':
    case 'RANGE': {
      const nums = values.map(Number).filter((n) => !isNaN(n))
      if (nums.length === 0) return '유효한 숫자 없음'
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length
      const min = Math.min(...nums)
      const max = Math.max(...nums)
      return `평균: ${avg.toFixed(1)}, 최소: ${min}, 최대: ${max}`
    }

    case 'CONSENT': {
      const agree = values.filter((v) => v === true || v === 'true').length
      return `동의: ${agree}, 미동의: ${values.length - agree}`
    }

    case 'TEXT':
      return `${values.length}건 텍스트 응답`

    case 'RANKED_CHOICE':
      return `${values.length}건 순위 응답`

    case 'TABLE':
      return `${values.length}건 표 응답`

    default:
      return `${values.length}건`
  }
}

function formatDateTime(date: Date): string {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}
