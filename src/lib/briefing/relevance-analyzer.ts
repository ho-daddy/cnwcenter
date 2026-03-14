import { getAnthropicClient } from '@/lib/anthropic'

const RELEVANCE_THRESHOLD = 70

interface RelevanceResult {
  score: number
  reason: string
}

/**
 * AI로 기사의 산업안전보건 관련성을 분석 (0-100점)
 * 배치 처리: 여러 기사를 한 번의 API 호출로 분석
 */
export async function analyzeRelevanceBatch(
  articles: { title: string; content: string }[]
): Promise<RelevanceResult[]> {
  if (articles.length === 0) return []

  const client = getAnthropicClient()

  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] 제목: ${a.title}\n내용: ${(a.content || '').slice(0, 300)}`
    )
    .join('\n\n')

  const prompt = `다음 기사들이 산업안전보건(산재, 작업장 안전, 노동자 건강, 노동재해, 중대재해, 직업병, 안전보건 정책/법규, 근로감독, 산업안전보건법 등)과 얼마나 관련이 있는지 각각 0-100점으로 평가해주세요.

## 평가 기준
- 90-100: 산재 사고, 중대재해, 직업병 등 직접 관련 기사
- 70-89: 안전보건 정책, 법규, 근로환경 개선 등 간접 관련 기사
- 40-69: 노동 일반, 고용 관련이나 안전보건과 직접 연결은 약한 기사
- 0-39: 산업안전보건과 무관한 기사

## 기사 목록
${articleList}

## 응답 형식 (JSON 배열만 반환)
[
  {"index": 1, "score": 85, "reason": "중대재해 관련 판결 기사"},
  {"index": 2, "score": 30, "reason": "일반 경제 뉴스"}
]`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('예상치 못한 응답 형식')
    }

    let jsonText = content.text.trim()
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonText) as {
      index: number
      score: number
      reason: string
    }[]

    // 인덱스 순서대로 결과 매핑
    return articles.map((_, i) => {
      const found = parsed.find((p) => p.index === i + 1)
      return found
        ? { score: found.score, reason: found.reason }
        : { score: 100, reason: 'AI 분석 결과 누락 - 기본값 적용' }
    })
  } catch (error) {
    console.error('[RelevanceAnalyzer] AI 분석 오류:', error)
    // 실패 시 모든 기사에 기본값 100점 (필터링하지 않음)
    return articles.map(() => ({
      score: 100,
      reason: 'AI 분석 실패 - 기본값 적용',
    }))
  }
}

/**
 * 관련성 점수로 isRelevant 판단
 */
export function isScoreRelevant(score: number): boolean {
  return score >= RELEVANCE_THRESHOLD
}

export { RELEVANCE_THRESHOLD }
