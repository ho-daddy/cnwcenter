import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTodayFilteredArticles } from '@/lib/briefing/collector'
import { generateBriefingAnalysis } from '@/lib/briefing/analysis-service'
import { getReportGenerator } from '@/lib/briefing/report-generator'
import { startOfDay } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    // API 키 인증
    const apiKey = request.headers.get('x-api-key')
    const referer = request.headers.get('referer')
    const secret = process.env.BRIEFING_COLLECT_SECRET

    const isInternal = referer?.includes(request.headers.get('host') || 'localhost')
    const isValidKey = secret && apiKey === secret

    if (!isInternal && !isValidKey) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 오늘 날짜의 시작
    const today = startOfDay(new Date())

    // 기존 리포트가 있으면 삭제 (덮어쓰기)
    const existingReport = await prisma.dailyReport.findUnique({
      where: { date: today },
    })

    if (existingReport) {
      await prisma.dailyReport.delete({
        where: { date: today },
      })
    }

    // 오늘 수집된 필터링된 기사 조회
    const articles = await getTodayFilteredArticles()

    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: '분석할 기사가 없습니다. 먼저 수집을 실행해주세요.',
      })
    }

    // Claude API로 분석
    const analysis = await generateBriefingAnalysis(articles)

    // 마크다운 리포트 생성
    const reportGenerator = getReportGenerator()
    const { markdown, filePath } = await reportGenerator.generate(
      analysis,
      articles,
      today
    )

    // DB에 저장
    const report = await prisma.dailyReport.create({
      data: {
        date: today,
        topIssuesJson: JSON.stringify(analysis.topIssues),
        analysisJson: JSON.stringify(analysis.detailedAnalysis),
        insightsText: analysis.practicalInsights,
        markdownPath: filePath,
        articleCount: articles.length,
        filteredCount: articles.filter((a) => a.priority !== 'none').length,
      },
    })

    return NextResponse.json({
      success: true,
      reportId: report.id,
      topIssues: analysis.topIssues,
      articleCount: articles.length,
      markdownPath: filePath,
    })
  } catch (error) {
    console.error('[Analyze] 오류:', error)
    return NextResponse.json(
      {
        error: '분석 중 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
