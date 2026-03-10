import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { fetchMSReportData } from '@/lib/musculoskeletal/report-data'
import { generatePdf } from '@/lib/report/pdf-generator'
import {
  buildMSSummaryHtml,
  buildMSDetailHtml,
  buildMSImprovementHtml,
  wrapMSDocument,
} from '@/lib/musculoskeletal/report-templates'
import ExcelJS from 'exceljs'

const REPORT_TYPES = {
  summary: { title: '근골격계유해요인조사 종합보고서', builder: buildMSSummaryHtml },
  detail: { title: '부위별 상세 조사표', builder: buildMSDetailHtml },
  improvement: { title: '개선대책 보고서', builder: buildMSImprovementHtml },
} as const

type ReportType = keyof typeof REPORT_TYPES

const BODY_PART_ORDER = [
  'HAND_WRIST', 'ELBOW_FOREARM', 'SHOULDER_ARM', 'NECK', 'BACK_HIP', 'KNEE_ANKLE',
] as const

const BODY_PART_KO: Record<string, string> = {
  HAND_WRIST: '손/손목', ELBOW_FOREARM: '팔꿈치/아래팔', SHOULDER_ARM: '어깨/위팔',
  NECK: '목', BACK_HIP: '허리/고관절', KNEE_ANKLE: '무릎/발목',
}

// GET /api/musculoskeletal/report?type=summary&year=2025&workplaceId=xxx&format=pdf|excel
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') as ReportType | null
  const year = searchParams.get('year')
  const workplaceId = searchParams.get('workplaceId')
  const format = searchParams.get('format') || 'pdf'

  if (format === 'pdf' && (!type || !REPORT_TYPES[type])) {
    return NextResponse.json(
      { error: '유효하지 않은 보고서 유형입니다. (summary, detail, improvement)' },
      { status: 400 }
    )
  }
  if (!year || !workplaceId) {
    return NextResponse.json(
      { error: '연도와 사업장을 선택해주세요.' },
      { status: 400 }
    )
  }

  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)
  if (accessibleIds !== null && !accessibleIds.includes(workplaceId)) {
    return NextResponse.json({ error: '접근 권한이 없는 사업장입니다.' }, { status: 403 })
  }

  try {
    const data = await fetchMSReportData(parseInt(year), workplaceId)

    if (format === 'excel') {
      return generateExcel(data)
    }

    // PDF 생성
    const { title, builder } = REPORT_TYPES[type!]
    const bodyHtml = builder(data)
    const today = new Date().toISOString().slice(0, 10)
    const fullHtml = wrapMSDocument(title, bodyHtml, {
      workplaceName: data.workplace.name,
      year: parseInt(year),
      generatedAt: today,
    })

    const pdfBuffer = await generatePdf(fullHtml)
    const todayCompact = today.replace(/-/g, '')
    const filename = `${title}_${data.workplace.name}_${year}_${todayCompact}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (e: unknown) {
    console.error('[MS Report] 생성 오류:', e)
    const message = e instanceof Error ? e.message : '보고서 생성 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Excel 내보내기
async function generateExcel(data: typeof import('@/lib/musculoskeletal/report-data').fetchMSReportData extends (...args: never[]) => Promise<infer R> ? R : never) {
  const wb = new ExcelJS.Workbook()
  wb.creator = '새움터'
  wb.created = new Date()

  const today = new Date().toISOString().slice(0, 10)
  const todayCompact = today.replace(/-/g, '')

  // --- Sheet 1: 조사 현황 ---
  const ws1 = wb.addWorksheet('조사현황')

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 9 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  }

  const cellStyle: Partial<ExcelJS.Style> = {
    font: { size: 9 },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    },
    alignment: { vertical: 'middle', wrapText: true },
  }

  // 조직도 레벨별 열 생성 (1단계~최대 단계)
  const LEVEL_NAMES: Record<number, string> = {
    1: '1단계(본부)', 2: '2단계(부서)', 3: '3단계(공정)',
    4: '4단계(세부)', 5: '5단계(작업)',
  }
  const { min: lvlMin, max: lvlMax } = data.orgLevelRange
  const orgLevelCols = Array.from(
    { length: lvlMax - lvlMin + 1 },
    (_, i) => lvlMin + i
  )

  const headers = [
    'No',
    ...orgLevelCols.map((l) => LEVEL_NAMES[l] || `${l}단계`),
    '조사유형', '상태', '관리수준', '최고점수',
    ...BODY_PART_ORDER.map((bp) => BODY_PART_KO[bp]),
    'RULA', 'REBA', '작업자', '조사자',
  ]

  const headerRow = ws1.addRow(headers)
  headerRow.eachCell((cell) => { cell.style = headerStyle })
  headerRow.height = 28

  // 열 너비 설정
  const colWidths = [
    4, // No
    ...orgLevelCols.map(() => 14), // 조직도 레벨별
    8, 8, 8, 8, // 조사유형, 상태, 관리수준, 최고점수
    8, 8, 8, 6, 8, 8, // 6부위
    7, 7, // RULA, REBA
    10, 10, // 작업자, 조사자
  ]
  ws1.columns = colWidths.map((w) => ({ width: w }))

  // 관리수준 열 인덱스 (1-based)
  const mlColIdx = 1 + orgLevelCols.length + 3 // No + levels + 조사유형 + 상태 + 관리수준

  data.assessments.forEach((a, idx) => {
    const bpMax: Record<string, number> = {}
    BODY_PART_ORDER.forEach((bp) => { bpMax[bp] = 0 })
    a.elementWorks.forEach((ew) => {
      ew.bodyPartScores.forEach((bp) => {
        if (bp.totalScore > (bpMax[bp.bodyPart] || 0)) bpMax[bp.bodyPart] = bp.totalScore
      })
    })

    const maxScore = a.elementWorks.length > 0
      ? Math.max(...a.elementWorks.map((ew) =>
          ew.bodyPartScores.length > 0
            ? Math.max(...ew.bodyPartScores.map((bp) => bp.totalScore))
            : 0
        ))
      : 0

    const rulaMax = Math.max(0, ...a.elementWorks.map((ew) => ew.rulaScore || 0))
    const rebaMax = Math.max(0, ...a.elementWorks.map((ew) => ew.rebaScore || 0))

    const mlLabel: Record<string, string> = {
      HIGH: '상', MEDIUM_HIGH: '중상', MEDIUM: '중', LOW: '하',
    }

    // 조직도 경로를 레벨별 열에 배치
    const levelValues = orgLevelCols.map((lvl) => {
      const unit = a.unitPath.find((p) => p.level === lvl)
      return unit?.name || ''
    })

    const row = ws1.addRow([
      idx + 1,
      ...levelValues,
      a.assessmentType === 'REGULAR' ? '정기조사' : '수시조사',
      { DRAFT: '작성중', IN_PROGRESS: '조사중', COMPLETED: '완료', REVIEWED: '검토완료' }[a.status] || a.status,
      a.managementLevel ? mlLabel[a.managementLevel] || a.managementLevel : '',
      maxScore || '',
      ...BODY_PART_ORDER.map((bp) => bpMax[bp] || ''),
      rulaMax || '',
      rebaMax || '',
      a.workerName || '',
      a.investigatorName || '',
    ])
    row.eachCell((cell) => { cell.style = cellStyle })

    // 관리수준 셀 색상
    const mlColors: Record<string, string> = {
      HIGH: 'FFFEE2E2', MEDIUM_HIGH: 'FFFFEDD5', MEDIUM: 'FFFEF9C3', LOW: 'FFDCFCE7',
    }
    if (a.managementLevel && mlColors[a.managementLevel]) {
      row.getCell(mlColIdx).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: mlColors[a.managementLevel] },
      }
    }
  })

  ws1.autoFilter = { from: { row: 1, column: 1 }, to: { row: data.assessments.length + 1, column: headers.length } }

  // --- Sheet 2: 부위별 상세 ---
  const ws2 = wb.addWorksheet('부위별상세')

  const detailHeaders = [
    'No', '평가단위', '요소작업', '부위', '자세점수', '부가점수', '총점',
    'RULA점수', 'RULA수준', 'REBA점수', 'REBA수준',
    '밀기/당기기(팔)', '밀기/당기기(손)', '종합평가',
  ]
  const dHeaderRow = ws2.addRow(detailHeaders)
  dHeaderRow.eachCell((cell) => { cell.style = headerStyle })
  dHeaderRow.height = 28

  ws2.columns = [
    { width: 4 }, { width: 16 }, { width: 16 }, { width: 12 },
    { width: 8 }, { width: 8 }, { width: 6 },
    { width: 8 }, { width: 10 }, { width: 8 }, { width: 10 },
    { width: 12 }, { width: 12 }, { width: 30 },
  ]

  let rowNum = 0
  data.assessments.forEach((a, aIdx) => {
    a.elementWorks.forEach((ew) => {
      BODY_PART_ORDER.forEach((bp) => {
        rowNum++
        const score = ew.bodyPartScores.find((s) => s.bodyPart === bp)
        const row = ws2.addRow([
          rowNum,
          a.organizationUnit.name,
          ew.name,
          BODY_PART_KO[bp],
          score?.postureScore ?? '',
          score?.additionalScore ?? '',
          score?.totalScore ?? '',
          ew.rulaScore ?? '',
          ew.rulaLevel || '',
          ew.rebaScore ?? '',
          ew.rebaLevel || '',
          ew.pushPullArm || '',
          ew.pushPullHand || '',
          ew.evaluationResult || '',
        ])
        row.eachCell((cell) => { cell.style = cellStyle })

        // 총점 셀 색상
        if (score && score.totalScore > 0) {
          const totalCell = row.getCell(7)
          const scoreColors: Record<string, string> = {}
          if (score.totalScore >= 7) scoreColors.c = 'FFFEE2E2'
          else if (score.totalScore >= 5) scoreColors.c = 'FFFFEDD5'
          else if (score.totalScore >= 3) scoreColors.c = 'FFFEF9C3'
          else scoreColors.c = 'FFDCFCE7'
          totalCell.fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: scoreColors.c },
          }
        }
      })
    })
  })

  ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: rowNum + 1, column: detailHeaders.length } }

  // --- Sheet 3: 개선대책 ---
  const ws3 = wb.addWorksheet('개선대책')

  const impHeaders = [
    'No', '평가단위', '관리수준', '요소작업', '문제점', '개선방안',
    '담당자', '상태', '일자', '비고',
  ]
  const iHeaderRow = ws3.addRow(impHeaders)
  iHeaderRow.eachCell((cell) => { cell.style = headerStyle })
  iHeaderRow.height = 28

  ws3.columns = [
    { width: 4 }, { width: 16 }, { width: 8 }, { width: 16 },
    { width: 30 }, { width: 30 }, { width: 10 }, { width: 8 },
    { width: 12 }, { width: 16 },
  ]

  let impIdx = 0
  data.assessments.forEach((a) => {
    const mlLabel: Record<string, string> = {
      HIGH: '상', MEDIUM_HIGH: '중상', MEDIUM: '중', LOW: '하',
    }
    a.improvements.forEach((imp) => {
      impIdx++
      const statusText = imp.status === 'COMPLETED' ? '완료' : imp.status === 'PLANNED' ? '예정' : ''
      const row = ws3.addRow([
        impIdx,
        a.organizationUnit.name,
        a.managementLevel ? mlLabel[a.managementLevel] || '' : '',
        imp.elementWorkName || '',
        imp.problem,
        imp.improvement,
        imp.responsiblePerson || '',
        statusText,
        imp.updateDate ? new Date(imp.updateDate).toLocaleDateString('ko-KR') : '',
        imp.remarks || '',
      ])
      row.eachCell((cell) => { cell.style = cellStyle })
    })
  })

  if (impIdx > 0) {
    ws3.autoFilter = { from: { row: 1, column: 1 }, to: { row: impIdx + 1, column: impHeaders.length } }
  }

  // Buffer 생성
  const buffer = await wb.xlsx.writeBuffer()
  const filename = `근골격계유해요인조사_${data.workplace.name}_${data.year}_${todayCompact}.xlsx`

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
