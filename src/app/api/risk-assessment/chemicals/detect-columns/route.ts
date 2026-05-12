import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { getAnthropicClient } from '@/lib/anthropic'

// 휴리스틱 자동 매핑 confidence가 낮을 때 Claude haiku로 컬럼 의미 추론
// POST /api/risk-assessment/chemicals/detect-columns
// body: { headers: string[], sampleRows: string[][] }
// resp: { mapping: { name?: number, manufacturer?: number, description?: number, casNumber?: number, componentName?: number, concentration?: number }, confidence: number }
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await req.json()
    const headers: string[] = Array.isArray(body.headers) ? body.headers.map((h: unknown) => String(h ?? '')) : []
    const sampleRows: string[][] = Array.isArray(body.sampleRows)
      ? body.sampleRows.slice(0, 5).map((r: unknown[]) => r.slice(0, headers.length).map((v: unknown) => String(v ?? '')))
      : []

    if (headers.length === 0) {
      return NextResponse.json({ error: '헤더가 필요합니다.' }, { status: 400 })
    }

    const claude = getAnthropicClient()
    const tableText = [
      headers.map((h, i) => `[${i}] ${h || '(빈 헤더)'}`).join(' | '),
      ...sampleRows.map(r => r.join(' | ')),
    ].join('\n')

    const prompt = `다음은 화학제품 일괄 등록용 CSV/Excel의 첫 부분입니다. 각 컬럼이 무엇을 의미하는지 판단해주세요.

컬럼 인덱스는 [0]부터 시작합니다.

\`\`\`
${tableText}
\`\`\`

다음 필드를 매칭할 수 있는 컬럼 인덱스를 응답하세요. 매칭되지 않으면 null:
- name: 제품명/품명/Product Name
- manufacturer: 제조사/공급사/회사명
- description: 설명/용도/비고
- casNumber: CAS 번호
- componentName: 성분명/화학물질명/Ingredient
- concentration: 함유량/농도/%

각 필드는 최대 1개 컬럼에만 매칭되어야 합니다. 같은 컬럼이 여러 필드에 매칭될 수 없습니다.
중대성 점수나 기타 컬럼은 무시하고 위 6개 필드만 응답하세요.

응답은 다음 JSON 형식으로만 출력하세요 (다른 텍스트 없이):
{"name": 0, "manufacturer": 1, "description": null, "casNumber": 4, "componentName": 5, "concentration": 6, "confidence": 0.95}`

    const msg = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Claude 응답 파싱 실패', raw: text }, { status: 502 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, number | null>
    const mapping: Record<string, number> = {}
    for (const k of ['name', 'manufacturer', 'description', 'casNumber', 'componentName', 'concentration']) {
      const v = parsed[k]
      if (typeof v === 'number' && v >= 0 && v < headers.length) mapping[k] = v
    }
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.7

    return NextResponse.json({ mapping, confidence })
  } catch (e) {
    console.error('[detect-columns]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
