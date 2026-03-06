import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { requireStaffOrAbove } from '@/lib/auth-utils'

type Params = { params: { surveyId: string } }

const BODY_PARTS = [
  { key: 'neck', label: '목' },
  { key: 'shoulder', label: '어깨' },
  { key: 'arm', label: '팔/팔꿈치' },
  { key: 'hand', label: '손/손목/손가락' },
  { key: 'back', label: '허리' },
  { key: 'leg', label: '다리/발' },
]

type AssessmentLevel = '정상' | '관리대상자' | '통증호소자'

function assessBodyPart(
  level: string | null,
  period: string | null,
  freq: string | null
): AssessmentLevel {
  if (!level) return '정상'
  const longPeriod = period === '1주일~1달' || period === '1달 이상'
  const highFreq = freq === '1개월에 1번' || freq === '1주일에 1번' || freq === '매일'
  if (level === '매우 심함' && longPeriod && highFreq) return '통증호소자'
  if (level === '중간' && (longPeriod || highFreq)) return '관리대상자'
  return '정상'
}

// GET /api/surveys/[surveyId]/analytics/export-assessment
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: { questions: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: params.surveyId, completedAt: { not: null } },
    orderBy: { createdAt: 'asc' },
    include: { answers: true },
  })

  // questionCode → questionId 매핑
  const allQuestions = survey.sections.flatMap((s) => s.questions)
  const codeToId = new Map<string, string>()
  for (const q of allQuestions) {
    if (q.questionCode) codeToId.set(q.questionCode, q.id)
  }

  // ─── 개인별 판정 계산 ───
  interface PersonResult {
    name: string
    department: string
    process: string
    bodyParts: Record<string, {
      level: AssessmentLevel
      period: string
      painLevel: string
      frequency: string
    }>
    overallLevel: AssessmentLevel
  }

  const personResults: PersonResult[] = []

  for (const response of responses) {
    const ansMap = new Map(response.answers.map((a) => [a.questionId, a.value]))

    const getStr = (code: string): string => {
      const id = codeToId.get(code)
      if (!id) return ''
      const val = ansMap.get(id)
      return val != null ? String(val) : ''
    }

    const name = response.respondentName || getStr('S0-name') || '미입력'
    const department = getStr('S0-department')
    const process = getStr('S0-process')

    const q41Id = codeToId.get('Q4-1')
    const selectedParts = q41Id ? (ansMap.get(q41Id) as string[] | undefined) || [] : []

    let worstLevel: AssessmentLevel = '정상'
    const bodyParts: PersonResult['bodyParts'] = {}

    for (const bp of BODY_PARTS) {
      if (Array.isArray(selectedParts) && selectedParts.includes(bp.label)) {
        const period = getStr(`Q4-1-${bp.key}-period`)
        const painLevel = getStr(`Q4-1-${bp.key}-level`)
        const frequency = getStr(`Q4-1-${bp.key}-freq`)
        const level = assessBodyPart(painLevel || null, period || null, frequency || null)

        bodyParts[bp.label] = { level, period, painLevel, frequency }

        if (level === '통증호소자') worstLevel = '통증호소자'
        else if (level === '관리대상자' && worstLevel !== '통증호소자') worstLevel = '관리대상자'
      } else {
        bodyParts[bp.label] = { level: '정상', period: '', painLevel: '', frequency: '' }
      }
    }

    personResults.push({ name, department, process, bodyParts, overallLevel: worstLevel })
  }

  // ─── 워크북 생성 ───
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '새움터'
  workbook.created = new Date()

  // ─── Sheet 1: 판정결과 ───
  const sheet = workbook.addWorksheet('근골격계 판정결과')

  // 헤더
  const headers = ['번호', '응답자', '부서', '담당공정']
  for (const bp of BODY_PARTS) {
    headers.push(`${bp.label}\n판정`)
  }
  headers.push('종합판정')

  const headerRow = sheet.addRow(headers)
  headerRow.height = 30
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF4472C4' } } }
  })

  // 데이터
  const levelColors: Record<AssessmentLevel, string> = {
    '정상': 'FFD5F5D5',
    '관리대상자': 'FFFFF2CC',
    '통증호소자': 'FFFFD7D5',
  }
  const levelFontColors: Record<AssessmentLevel, string> = {
    '정상': 'FF2E7D32',
    '관리대상자': 'FFB8860B',
    '통증호소자': 'FFC62828',
  }

  personResults.forEach((person, idx) => {
    const rowData: (string | number)[] = [
      idx + 1,
      person.name,
      person.department,
      person.process,
    ]
    for (const bp of BODY_PARTS) {
      rowData.push(person.bodyParts[bp.label].level)
    }
    rowData.push(person.overallLevel)

    const row = sheet.addRow(rowData)
    row.eachCell((cell, colNumber) => {
      cell.font = { size: 9 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }

      // 판정 열 색상 (5열부터 부위별 판정, 마지막 열 종합판정)
      if (colNumber >= 5) {
        const level = String(cell.value) as AssessmentLevel
        if (levelColors[level]) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: levelColors[level] } }
          cell.font = { size: 9, bold: true, color: { argb: levelFontColors[level] } }
        }
      }
    })

    if (idx % 2 === 1) {
      for (let c = 1; c <= 4; c++) {
        const cell = row.getCell(c)
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor === undefined) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } }
        }
      }
    }
  })

  // 열 너비
  sheet.getColumn(1).width = 6
  sheet.getColumn(2).width = 10
  sheet.getColumn(3).width = 14
  sheet.getColumn(4).width = 16
  for (let i = 5; i <= 4 + BODY_PARTS.length; i++) {
    sheet.getColumn(i).width = 14
  }
  sheet.getColumn(5 + BODY_PARTS.length).width = 14

  // 필터
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }
  sheet.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }]

  // ─── Sheet 2: 상세 데이터 (부위별 원본 응답 포함) ───
  const detailSheet = workbook.addWorksheet('상세 데이터')
  const detailHeaders = ['번호', '응답자', '부서', '담당공정']
  for (const bp of BODY_PARTS) {
    detailHeaders.push(`${bp.label}\n지속기간`, `${bp.label}\n아픈정도`, `${bp.label}\n빈도`, `${bp.label}\n판정`)
  }
  detailHeaders.push('종합판정')

  const detailHeaderRow = detailSheet.addRow(detailHeaders)
  detailHeaderRow.height = 35
  detailHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, size: 9 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
  })

  personResults.forEach((person, idx) => {
    const rowData: (string | number)[] = [idx + 1, person.name, person.department, person.process]
    for (const bp of BODY_PARTS) {
      const bpData = person.bodyParts[bp.label]
      rowData.push(bpData.period, bpData.painLevel, bpData.frequency, bpData.level)
    }
    rowData.push(person.overallLevel)

    const row = detailSheet.addRow(rowData)
    row.eachCell((cell, colNumber) => {
      cell.font = { size: 9 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }

      // 판정 열 색상 (매 4번째 열이 판정, colNumber=8,12,16,20,24,28 + 마지막)
      const isAssessmentCol = colNumber >= 5 && ((colNumber - 4) % 4 === 0 || colNumber === detailHeaders.length)
      if (isAssessmentCol) {
        const level = String(cell.value) as AssessmentLevel
        if (levelColors[level]) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: levelColors[level] } }
          cell.font = { size: 9, bold: true, color: { argb: levelFontColors[level] } }
        }
      }
    })
  })

  // 상세 시트 열 너비
  detailSheet.getColumn(1).width = 6
  detailSheet.getColumn(2).width = 10
  detailSheet.getColumn(3).width = 14
  detailSheet.getColumn(4).width = 16
  for (let i = 5; i <= detailHeaders.length; i++) {
    detailSheet.getColumn(i).width = 13
  }
  detailSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: detailHeaders.length },
  }
  detailSheet.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }]

  // ─── Sheet 3: 요약 통계 ───
  const summarySheet = workbook.addWorksheet('요약 통계')
  summarySheet.addRow(['설문 제목', survey.title])
  summarySheet.addRow(['분석 대상', `${personResults.length}명 (완료 응답만)`])
  summarySheet.addRow([])

  // 부위별 통계
  summarySheet.addRow(['부위별 판정 현황'])
  const summaryHeader = summarySheet.addRow(['부위', '정상', '관리대상자', '통증호소자'])
  summaryHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
  })

  for (const bp of BODY_PARTS) {
    const counts: Record<AssessmentLevel, number> = { '정상': 0, '관리대상자': 0, '통증호소자': 0 }
    for (const person of personResults) {
      counts[person.bodyParts[bp.label].level]++
    }
    const row = summarySheet.addRow([bp.label, counts['정상'], counts['관리대상자'], counts['통증호소자']])
    // 색상
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5F5D5' } }
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
    row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD7D5' } }
  }

  summarySheet.addRow([])
  summarySheet.addRow(['종합 판정 현황'])
  const totalHeader = summarySheet.addRow(['구분', '인원수', '비율'])
  totalHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
  })

  const totalCounts: Record<AssessmentLevel, number> = { '정상': 0, '관리대상자': 0, '통증호소자': 0 }
  for (const person of personResults) {
    totalCounts[person.overallLevel]++
  }
  const totalN = personResults.length
  for (const level of ['정상', '관리대상자', '통증호소자'] as AssessmentLevel[]) {
    const row = summarySheet.addRow([level, totalCounts[level], totalN > 0 ? `${Math.round((totalCounts[level] / totalN) * 100)}%` : '0%'])
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: levelColors[level] } }
    row.getCell(1).font = { bold: true, color: { argb: levelFontColors[level] } }
  }

  summarySheet.getColumn(1).width = 20
  summarySheet.getColumn(2).width = 12
  summarySheet.getColumn(3).width = 12
  summarySheet.getColumn(4).width = 12

  // ─── 버퍼 생성 및 응답 ───
  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `${survey.title}_근골격계_판정결과_${formatDate(new Date())}.xlsx`
  const encodedFilename = encodeURIComponent(filename)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  })
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}
