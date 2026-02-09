import { getAnthropicClient } from '@/lib/anthropic'
import { FilteredArticle } from '@/types/briefing'
import { AnalysisResult, TopIssue, DetailedAnalysis } from '@/types/analysis'

const SYSTEM_PROMPT = `당신은 산업안전보건 전문 브리핑 에이전트입니다.
노동안전보건 관련 활동을 하는 시민사회단체를 위해 뉴스와 공지사항을 분석하여 핵심 정보를 전달합니다.
분석 시 다음 관점을 중시합니다:
- 현장 노동자의 안전과 건강권 보장
- 중대재해처벌법 적용 및 기업 책임 강화 동향
- 산업안전보건법 개정 및 정책 변화
- 노동자 권익 보호와 시민단체 활동에 필요한 정보

반드시 요청된 JSON 형식으로만 응답하세요.`

/**
 * 수집된 기사를 Claude API로 분석하여 일일 브리핑 생성
 */
export async function generateBriefingAnalysis(
  articles: FilteredArticle[]
): Promise<AnalysisResult> {
  if (articles.length === 0) {
    return {
      topIssues: [],
      detailedAnalysis: [],
      practicalInsights: '오늘 수집된 관련 기사가 없습니다.',
    }
  }

  const client = getAnthropicClient()

  // 기사 목록 포맷팅
  const articleList = articles
    .map(
      (a, i) =>
        `${i + 1}. [${a.sourceName}] ${a.title}
   우선순위: ${a.priority}
   키워드: ${a.matchedKeywords.join(', ') || '없음'}
   URL: ${a.url}
   ${a.content ? `요약: ${a.content.slice(0, 200)}...` : ''}`
    )
    .join('\n\n')

  const userPrompt = `## 분석 대상 기사 (총 ${articles.length}건)

${articleList}

## 요청 사항
위 기사들을 분석하여 다음 형식의 JSON으로 응답해주세요:

{
  "topIssues": [
    {
      "rank": 1,
      "title": "이슈 제목 (간결하게)",
      "summary": "2-3문장으로 핵심 내용 요약",
      "sourceArticles": ["관련 기사 제목1", "관련 기사 제목2"],
      "priority": "critical 또는 high 또는 medium"
    }
  ],
  "detailedAnalysis": [
    {
      "issueTitle": "이슈 제목",
      "background": "배경 및 맥락 설명",
      "implications": "현장 노동자와 시민단체 관점의 시사점",
      "recommendations": "시민단체 활동에 필요한 조치사항 또는 참고사항"
    }
  ],
  "practicalInsights": "현장 노동자와 산업안전보건 시민단체 관점의 종합 시사점 (2-3문장)"
}

주의사항:
- topIssues는 최대 3개까지만 선정
- 기사가 적을 경우 실제 이슈 수만큼만 포함
- 모든 텍스트는 한국어로 작성
- JSON만 응답하고 다른 설명은 포함하지 마세요`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // 응답 파싱
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('예상치 못한 응답 형식')
    }

    // JSON 추출 (코드 블록이 있을 수 있음)
    let jsonText = content.text.trim()
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    const result = JSON.parse(jsonText) as AnalysisResult

    // 유효성 검증
    if (!result.topIssues || !Array.isArray(result.topIssues)) {
      result.topIssues = []
    }
    if (!result.detailedAnalysis || !Array.isArray(result.detailedAnalysis)) {
      result.detailedAnalysis = []
    }
    if (!result.practicalInsights) {
      result.practicalInsights = ''
    }

    return result
  } catch (error) {
    console.error('[AnalysisService] Claude API 오류:', error)
    throw error
  }
}

/**
 * 테스트용 더미 분석 결과 생성
 */
export function generateDummyAnalysis(
  articles: FilteredArticle[]
): AnalysisResult {
  const topIssues: TopIssue[] = articles.slice(0, 3).map((article, index) => ({
    rank: index + 1,
    title: article.title.slice(0, 50),
    summary: `${article.sourceName}에서 보도된 ${article.title}에 대한 요약입니다.`,
    sourceArticles: [article.title],
    priority: article.priority === 'none' ? 'medium' : article.priority,
  }))

  const detailedAnalysis: DetailedAnalysis[] = topIssues.map((issue) => ({
    issueTitle: issue.title,
    background: `${issue.title}에 대한 배경 설명입니다.`,
    implications: '현장 노동자와 시민단체 관점에서의 시사점입니다.',
    recommendations: '시민단체 활동에 참고할 사항입니다.',
  }))

  return {
    topIssues,
    detailedAnalysis,
    practicalInsights: `오늘 총 ${articles.length}건의 기사가 수집되었습니다. 주요 이슈를 확인하고 필요한 조치를 취해주세요.`,
  }
}
