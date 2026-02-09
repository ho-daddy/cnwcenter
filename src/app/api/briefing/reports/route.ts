import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getReportGenerator } from '@/lib/briefing/report-generator'
import { format, parseISO } from 'date-fns'

/**
 * GET /api/briefing/reports
 * 리포트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // 특정 날짜 리포트 조회
    if (dateParam) {
      const date = parseISO(dateParam)
      const report = await prisma.dailyReport.findUnique({
        where: { date },
      })

      if (!report) {
        // DB에 없으면 파일에서 직접 읽기 시도
        const reportGenerator = getReportGenerator()
        const markdown = await reportGenerator.readReport(date)

        if (markdown) {
          return NextResponse.json({
            date: dateParam,
            markdown,
            fromFile: true,
          })
        }

        return NextResponse.json(
          { error: '해당 날짜의 리포트를 찾을 수 없습니다' },
          { status: 404 }
        )
      }

      // 마크다운 파일 읽기
      let markdown = null
      if (report.markdownPath) {
        const reportGenerator = getReportGenerator()
        markdown = await reportGenerator.readReport(date)
      }

      return NextResponse.json({
        id: report.id,
        date: format(report.date, 'yyyy-MM-dd'),
        topIssues: JSON.parse(report.topIssuesJson),
        detailedAnalysis: JSON.parse(report.analysisJson),
        practicalInsights: report.insightsText,
        articleCount: report.articleCount,
        filteredCount: report.filteredCount,
        markdown,
        createdAt: report.createdAt,
      })
    }

    // 리포트 목록 조회
    const reports = await prisma.dailyReport.findMany({
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        articleCount: true,
        filteredCount: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        date: format(r.date, 'yyyy-MM-dd'),
        articleCount: r.articleCount,
        filteredCount: r.filteredCount,
        createdAt: r.createdAt,
      })),
      total: reports.length,
    })
  } catch (error) {
    console.error('[Reports] 조회 오류:', error)
    return NextResponse.json(
      { error: '리포트 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
