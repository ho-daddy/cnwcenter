import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { fetchReportData } from '@/lib/report/report-data'
import { generatePdf } from '@/lib/report/pdf-generator'
import { wrapInDocument } from '@/lib/report/templates/base-layout'
import { buildSummaryReportHtml } from '@/lib/report/templates/summary-report'
import { buildHazardListHtml } from '@/lib/report/templates/hazard-list'
import { buildImprovementPlanHtml } from '@/lib/report/templates/improvement-plan'

const REPORT_TYPES = {
  summary: { title: '위험성평가 요약 보고서', builder: buildSummaryReportHtml },
  'hazard-list': { title: '위험요인 목록표', builder: buildHazardListHtml },
  'improvement-plan': { title: '개선계획서', builder: buildImprovementPlanHtml },
} as const

type ReportType = keyof typeof REPORT_TYPES

// GET /api/risk-assessment/report?type=summary&year=2025&workplaceId=xxx
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') as ReportType | null
  const year = searchParams.get('year')
  const workplaceId = searchParams.get('workplaceId')

  if (!type || !REPORT_TYPES[type]) {
    return NextResponse.json(
      { error: `유효하지 않은 보고서 유형입니다. (summary, hazard-list, improvement-plan)` },
      { status: 400 }
    )
  }
  if (!year || !workplaceId) {
    return NextResponse.json(
      { error: '연도와 사업장을 선택해주세요.' },
      { status: 400 }
    )
  }

  // 접근 권한 확인
  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)
  if (accessibleIds !== null && !accessibleIds.includes(workplaceId)) {
    return NextResponse.json({ error: '접근 권한이 없는 사업장입니다.' }, { status: 403 })
  }

  try {
    const data = await fetchReportData(parseInt(year), workplaceId)

    const { title, builder } = REPORT_TYPES[type]
    const bodyHtml = builder(data)

    const today = new Date().toISOString().slice(0, 10)
    const fullHtml = wrapInDocument(title, bodyHtml, {
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
    console.error('보고서 생성 오류:', e)
    const message = e instanceof Error ? e.message : '보고서 생성 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
