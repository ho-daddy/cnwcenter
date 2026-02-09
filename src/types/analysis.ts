import { PriorityLevel } from './briefing'

// 3대 핵심 이슈
export interface TopIssue {
  rank: number
  title: string
  summary: string
  sourceArticles: string[]
  priority: PriorityLevel
}

// 상세 분석
export interface DetailedAnalysis {
  issueTitle: string
  background: string
  implications: string
  recommendations: string
}

// Claude API 응답 파싱 결과
export interface AnalysisResult {
  topIssues: TopIssue[]
  detailedAnalysis: DetailedAnalysis[]
  practicalInsights: string
}

// 일일 브리핑 (DB 저장용)
export interface DailyBriefing extends AnalysisResult {
  date: Date
  articleCount: number
  filteredCount: number
}

// 마크다운 리포트
export interface BriefingReport {
  date: string
  markdown: string
  filePath: string
}
