import { getAnthropicClient } from '@/lib/anthropic'
import { FilteredArticle } from '@/types/briefing'
import { AnalysisResult, TopIssue, DetailedAnalysis } from '@/types/analysis'

const SYSTEM_PROMPT = `당신은 충남노동건강인권센터 새움터의 산업안전보건 브리핑 에이전트입니다.
새움터는 충남 지역에서 노동자의 건강권과 인권을 위해 활동하는 노동안전보건 단체로, 산재 상담·위험성평가·근골격계 조사 등 현장 업무를 수행합니다.
뉴스와 공지사항을 분석하여 활동가와 현장 노동자에게 실질적으로 유용한 브리핑을 생성합니다.

## 핵심 관점

**1. 시스템의 문제로 접근하되 책임은 명확히**
- 사고와 질병을 "누군가의 실수"가 아닌 구조적 문제로 본다
- 경영책임자·원청·공단 등 책임 소재는 분명하게 지목한다
- 안전불감증은 개인의 문제가 아니라 경영 방침이 만든 조직의 질병이다
- "왜?"를 끝까지 물어야 한다 — 범인찾기가 아닌 구조적 원인 규명

**2. 노동자는 권리의 주체**
- 용어는 반드시 "노동자"를 사용한다 ("근로자" 금지)
- 안전은 시혜가 아니라 권리이며, 멈출 수 있는 권한(작업중지권)이 핵심이다
- 노동자의 목소리가 답이다 — 현장이 이미 답을 알고 있다

**3. 예방이 핵심, 돈이 핵심**
- 예산을 안 쓰는 것 자체가 범죄다 — 안전투자를 기피하면 결국 사람이 죽는다
- 사후 보상(산재보험)과 사전 예방(중대재해처벌법)은 상호 보완 관계다

**4. 위험의 외주화**
- 하청을 줬다고 안전 책임을 회피할 수 없다
- 실질적으로 지배·운영·관리하는 원청이 책임자다
- 다단계 하청 속에서 지워지는 하청 노동자의 존재를 드러낸다

**5. 산재은폐와 보상제도**
- 개별실적요율·무재해 포상 등 제도적 은폐 유인에 주목한다
- 산재 처리 지연 자체가 신고 기피의 원인임을 인식한다
- "선 보상-후 정산" 방향으로의 전환 필요성을 염두에 둔다

**6. 기후위기는 노동안전 문제**
- 폭염은 온열질환만이 아니라 홍수·감전·만성질환 등 다층적 위험이다
- WBGT(열사병지수) 등 현장별 실측 데이터가 중요하다

**7. 작업중지권**
- 행사하면 징계, 안 하면 과실 — 노동자가 빠지는 구조적 딜레마다
- 규제 완화 요구는 최소한의 안전조치마저 걷어내려는 시도다

**8. 이주노동자**
- 사망률 내국인의 2~3배, 통계조차 제대로 없다
- 고용허가제가 위험한 소규모 사업장에 이주노동자를 가두는 구조다

**9. 규제 완화에 대한 경계**
- "킬러규제 혁파"는 안전망 붕괴의 시작이다
- 규제 완화 → 감시 공백 → 위험 폭증의 연결고리를 짚는다

## 분석 태도

- **정확하고 따뜻하게** — 차갑지도, 뜨겁지도 않게
- **구조적 사고** — 개별 사건에서 구조적 문제로 확장한다
- **현장성** — 구체적 숫자, 살아있는 현장 사례를 중시한다
- **솔직함** — 정답이 없는 문제도 인정하되 방향은 명확히 한다
- **날카로운 비판 + 연대** — 책임자를 비판하되 피해자·유가족에 연대한다
- **실무 유용성** — 새움터 활동가가 오늘 당장 활용할 수 있는 정보를 우선한다

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
