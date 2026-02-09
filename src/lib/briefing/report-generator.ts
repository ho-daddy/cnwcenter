import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { promises as fs } from 'fs'
import path from 'path'
import { AnalysisResult } from '@/types/analysis'
import { FilteredArticle } from '@/types/briefing'

const PRIORITY_LABELS: Record<string, string> = {
  critical: '🔴 긴급',
  high: '🟠 높음',
  medium: '🟡 보통',
  low: '🟢 낮음',
  none: '⚪ 일반',
}

/**
 * 마크다운 리포트 생성기
 */
export class ReportGenerator {
  private outputDir: string

  constructor(outputDir?: string) {
    this.outputDir = outputDir || path.join(process.cwd(), 'data', 'reports')
  }

  /**
   * 일일 브리핑 마크다운 생성 및 저장
   */
  async generate(
    analysis: AnalysisResult,
    articles: FilteredArticle[],
    date: Date = new Date()
  ): Promise<{ markdown: string; filePath: string }> {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dateKo = format(date, 'yyyy년 M월 d일 (EEEE)', { locale: ko })

    const markdown = this.buildMarkdown(analysis, articles, dateKo)

    // 디렉토리 생성
    await fs.mkdir(this.outputDir, { recursive: true })

    // 파일 저장
    const filePath = path.join(this.outputDir, `${dateStr}.md`)
    await fs.writeFile(filePath, markdown, 'utf-8')

    return { markdown, filePath }
  }

  /**
   * 마크다운 문자열 생성
   */
  private buildMarkdown(
    analysis: AnalysisResult,
    articles: FilteredArticle[],
    dateKo: string
  ): string {
    const sections: string[] = []

    // 헤더
    sections.push(`# 🏭 산업안전보건 일일 브리핑`)
    sections.push(`**${dateKo}**`)
    sections.push('')
    sections.push('---')
    sections.push('')

    // 3대 핵심 이슈
    if (analysis.topIssues.length > 0) {
      sections.push(`## 📌 오늘의 핵심 이슈`)
      sections.push('')

      for (const issue of analysis.topIssues) {
        sections.push(`### ${issue.rank}. ${issue.title}`)
        sections.push('')
        sections.push(issue.summary)
        sections.push('')
        if (issue.sourceArticles.length > 0) {
          sections.push(
            `> 📰 관련 기사: ${issue.sourceArticles.slice(0, 2).join(', ')}`
          )
          sections.push('')
        }
      }

      sections.push('---')
      sections.push('')
    }

    // 상세 분석
    if (analysis.detailedAnalysis.length > 0) {
      sections.push(`## 📋 상세 분석`)
      sections.push('')

      for (const detail of analysis.detailedAnalysis) {
        sections.push(`### ${detail.issueTitle}`)
        sections.push('')
        sections.push(`**📚 배경**`)
        sections.push(detail.background)
        sections.push('')
        sections.push(`**💡 시사점**`)
        sections.push(detail.implications)
        sections.push('')
        sections.push(`**✅ 권장 조치**`)
        sections.push(detail.recommendations)
        sections.push('')
        sections.push('---')
        sections.push('')
      }
    }

    // 시민단체 시사점
    if (analysis.practicalInsights) {
      sections.push(`## 🎯 시민단체 시사점`)
      sections.push('')
      sections.push(analysis.practicalInsights)
      sections.push('')
      sections.push('---')
      sections.push('')
    }

    // 수집된 기사 목록
    sections.push(`## 📰 수집된 기사 목록 (${articles.length}건)`)
    sections.push('')
    sections.push('| 출처 | 제목 | 우선순위 | 키워드 |')
    sections.push('|------|------|:--------:|--------|')

    for (const article of articles) {
      const priority = PRIORITY_LABELS[article.priority] || article.priority
      const keywords = article.matchedKeywords.slice(0, 3).join(', ') || '-'
      const title = article.url
        ? `[${article.title}](${article.url})`
        : article.title

      sections.push(`| ${article.sourceName} | ${title} | ${priority} | ${keywords} |`)
    }

    sections.push('')
    sections.push('---')
    sections.push('')
    sections.push('*본 브리핑은 AI(Claude)에 의해 자동 생성되었습니다.*')
    sections.push('')

    return sections.join('\n')
  }

  /**
   * 저장된 리포트 읽기
   */
  async readReport(date: Date): Promise<string | null> {
    const dateStr = format(date, 'yyyy-MM-dd')
    const filePath = path.join(this.outputDir, `${dateStr}.md`)

    try {
      return await fs.readFile(filePath, 'utf-8')
    } catch {
      return null
    }
  }

  /**
   * 리포트 목록 조회
   */
  async listReports(): Promise<{ date: string; filePath: string }[]> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true })
      const files = await fs.readdir(this.outputDir)

      return files
        .filter((f) => f.endsWith('.md'))
        .map((f) => ({
          date: f.replace('.md', ''),
          filePath: path.join(this.outputDir, f),
        }))
        .sort((a, b) => b.date.localeCompare(a.date)) // 최신순
    } catch {
      return []
    }
  }
}

// 싱글톤 인스턴스
let reportGenerator: ReportGenerator | null = null

export function getReportGenerator(): ReportGenerator {
  if (!reportGenerator) {
    reportGenerator = new ReportGenerator()
  }
  return reportGenerator
}
