import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSurveyAccess } from '@/lib/auth-utils'
import { filterVisibleAnswers } from '@/lib/survey/visibility'
import { getAnthropicClient } from '@/lib/anthropic'
import { generatePdf } from '@/lib/report/pdf-generator'

type Params = { params: { surveyId: string } }

const BODY_PARTS = [
  { key: 'neck', label: '목' },
  { key: 'shoulder', label: '어깨' },
  { key: 'arm', label: '팔/팔꿈치' },
  { key: 'hand', label: '손/손목/손가락' },
  { key: 'back', label: '허리' },
  { key: 'leg', label: '다리/발' },
]

type AssessmentLevel = '정상' | '관리대상자' | '통증호소자'

// ─── 판정 로직 ───

function assessBodyPart(level: string | null, period: string | null, freq: string | null): AssessmentLevel {
  if (!level) return '정상'
  const severeLevel = level === '심함' || level === '매우 심함'
  const highLevel = level === '중간' || level === '심함' || level === '매우 심함'
  const longPeriod = period === '1주일~1달' || period === '1달~6개월' || period === '6개월 이상'
  const highFreq = freq === '1개월에 1번' || freq === '1주일에 1번' || freq === '매일'
  if (severeLevel && longPeriod && highFreq) return '통증호소자'
  if (highLevel && (longPeriod || highFreq)) return '관리대상자'
  return '정상'
}

// ─── SVG 차트 ───

function buildBarChart(data: Record<string, number>): string {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 12)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return '<p style="color:#aaa;font-size:11px;margin:0;">응답 없음</p>'

  const barH = 20
  const gap = 5
  const labelW = 130
  const barMaxW = 240
  const svgH = entries.length * (barH + gap)

  const rows = entries.map(([label, count], i) => {
    const pct = (count / total) * 100
    const bw = Math.max((count / total) * barMaxW, count > 0 ? 2 : 0)
    const y = i * (barH + gap)
    const shortLabel = label.length > 16 ? label.slice(0, 15) + '…' : label
    return `
      <text x="${labelW - 6}" y="${y + barH * 0.72}" text-anchor="end" font-size="10" fill="#444" font-family="Apple SD Gothic Neo,Malgun Gothic,sans-serif">${shortLabel}</text>
      <rect x="${labelW}" y="${y + 2}" width="${bw}" height="${barH - 4}" fill="#4472C4" rx="2"/>
      <text x="${labelW + bw + 5}" y="${y + barH * 0.72}" font-size="10" fill="#555" font-family="Apple SD Gothic Neo,Malgun Gothic,sans-serif">${count}명 (${pct.toFixed(0)}%)</text>
    `
  }).join('')

  return `<svg width="${labelW + barMaxW + 90}" height="${svgH}" style="display:block;overflow:visible;">${rows}</svg>`
}

// ─── HTML 섹션 생성 ───

function buildQuestionSection(
  code: string | null,
  text: string,
  type: string,
  data: unknown,
  responseCount: number,
): string {
  let chartHtml = ''

  if ((type === 'RADIO' || type === 'DROPDOWN' || type === 'CHECKBOX') && data && typeof data === 'object') {
    chartHtml = buildBarChart(data as Record<string, number>)
  } else if ((type === 'NUMBER' || type === 'RANGE') && data && typeof data === 'object') {
    const d = data as { avg: number | null; min: number | null; max: number | null; median: number | null }
    chartHtml = `
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        ${d.avg != null ? `<div style="background:#f0f4ff;border-radius:6px;padding:10px 16px;"><div style="font-size:10px;color:#888;">평균</div><div style="font-size:18px;font-weight:700;color:#3b5fc0;">${d.avg}</div></div>` : ''}
        ${d.min != null ? `<div style="background:#f5f5f5;border-radius:6px;padding:10px 16px;"><div style="font-size:10px;color:#888;">최솟값</div><div style="font-size:18px;font-weight:700;color:#555;">${d.min}</div></div>` : ''}
        ${d.max != null ? `<div style="background:#f5f5f5;border-radius:6px;padding:10px 16px;"><div style="font-size:10px;color:#888;">최댓값</div><div style="font-size:18px;font-weight:700;color:#555;">${d.max}</div></div>` : ''}
        ${d.median != null ? `<div style="background:#f5f5f5;border-radius:6px;padding:10px 16px;"><div style="font-size:10px;color:#888;">중앙값</div><div style="font-size:18px;font-weight:700;color:#555;">${d.median}</div></div>` : ''}
      </div>`
  } else if (type === 'TEXT') {
    chartHtml = `<p style="color:#888;font-size:11px;margin:0;">주관식 응답 ${responseCount}건</p>`
  } else if (type === 'CONSENT' && data && typeof data === 'object') {
    const d = data as Record<string, number>
    const agreeCount = d['true'] || 0
    const disagreeCount = d['false'] || 0
    const total = agreeCount + disagreeCount
    const agreePct = total > 0 ? Math.round((agreeCount / total) * 100) : 0
    chartHtml = `
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="background:#f0fff4;border-radius:6px;padding:10px 16px;border:1px solid #c6f6d5;">
          <div style="font-size:10px;color:#276749;">동의</div>
          <div style="font-size:18px;font-weight:700;color:#276749;">${agreeCount}명 (${agreePct}%)</div>
        </div>
        ${disagreeCount > 0 ? `<div style="background:#fff5f5;border-radius:6px;padding:10px 16px;border:1px solid #fed7d7;"><div style="font-size:10px;color:#c53030;">미동의</div><div style="font-size:18px;font-weight:700;color:#c53030;">${disagreeCount}명</div></div>` : ''}
      </div>`
  } else {
    chartHtml = `<p style="color:#aaa;font-size:11px;margin:0;">응답 ${responseCount}건</p>`
  }

  return `
    <div style="margin-bottom:24px;padding:16px;background:#fff;border:1px solid #e8e8e8;border-radius:8px;break-inside:avoid;">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:12px;">
        ${code ? `<span style="font-size:10px;color:#888;font-family:monospace;background:#f5f5f5;padding:2px 6px;border-radius:4px;">${code}</span>` : ''}
        <span style="font-size:12px;font-weight:600;color:#222;">${text}</span>
        <span style="margin-left:auto;font-size:10px;color:#aaa;">응답 ${responseCount}건</span>
      </div>
      ${chartHtml}
    </div>`
}

function buildBodyPartSection(
  summary: Record<string, Record<AssessmentLevel, number>>,
  totalSummary: Record<AssessmentLevel, number>,
  respondentCount: number,
): string {
  const levelStyle: Record<AssessmentLevel, string> = {
    '정상': 'background:#f0fff4;color:#276749;',
    '관리대상자': 'background:#fffbeb;color:#92400e;',
    '통증호소자': 'background:#fff5f5;color:#c53030;',
  }

  const bpRows = BODY_PARTS.map((bp) => {
    const d = summary[bp.label] || { '정상': 0, '관리대상자': 0, '통증호소자': 0 }
    return `
      <tr>
        <td style="padding:7px 10px;font-size:11px;color:#333;border-bottom:1px solid #f0f0f0;">${bp.label}</td>
        ${(['정상', '관리대상자', '통증호소자'] as AssessmentLevel[]).map(level => {
          const n = d[level] || 0
          const pct = respondentCount > 0 ? Math.round((n / respondentCount) * 100) : 0
          return `<td style="padding:7px 10px;text-align:center;font-size:11px;border-bottom:1px solid #f0f0f0;">${n}명 <span style="color:#aaa;font-size:10px;">(${pct}%)</span></td>`
        }).join('')}
      </tr>`
  }).join('')

  const total = respondentCount || 1
  const totalRows = (['정상', '관리대상자', '통증호소자'] as AssessmentLevel[]).map(level => {
    const n = totalSummary[level] || 0
    const pct = Math.round((n / total) * 100)
    return `<div style="flex:1;padding:12px 16px;border-radius:8px;text-align:center;${levelStyle[level]}">
      <div style="font-size:11px;font-weight:600;margin-bottom:4px;">${level}</div>
      <div style="font-size:22px;font-weight:700;">${n}명</div>
      <div style="font-size:10px;opacity:0.8;">${pct}%</div>
    </div>`
  }).join('')

  return `
    <div style="margin-bottom:24px;padding:20px;background:#fff;border:1px solid #e8e8e8;border-radius:8px;">
      <h3 style="font-size:13px;font-weight:700;color:#1a1a2e;margin:0 0 16px 0;">근골격계 증상 판정 결과</h3>
      <div style="display:flex;gap:10px;margin-bottom:20px;">${totalRows}</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8f8f8;">
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#555;border-bottom:2px solid #e0e0e0;">부위</th>
            <th style="padding:8px 10px;text-align:center;font-size:11px;color:#276749;border-bottom:2px solid #e0e0e0;">정상</th>
            <th style="padding:8px 10px;text-align:center;font-size:11px;color:#92400e;border-bottom:2px solid #e0e0e0;">관리대상자</th>
            <th style="padding:8px 10px;text-align:center;font-size:11px;color:#c53030;border-bottom:2px solid #e0e0e0;">통증호소자</th>
          </tr>
        </thead>
        <tbody>${bpRows}</tbody>
      </table>
    </div>`
}

function buildTenureCard(label: string, min: string, max: string, avg: string, median: string): string {
  return `
    <div style="flex:1;padding:16px;background:#fff;border:1px solid #e8e8e8;border-radius:8px;">
      <div style="font-size:11px;font-weight:700;color:#555;margin-bottom:12px;">${label}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><div style="font-size:9px;color:#aaa;">평균</div><div style="font-size:13px;font-weight:700;color:#3b5fc0;">${avg}</div></div>
        <div><div style="font-size:9px;color:#aaa;">중앙값</div><div style="font-size:13px;font-weight:600;color:#444;">${median}</div></div>
        <div><div style="font-size:9px;color:#aaa;">최단</div><div style="font-size:11px;color:#666;">${min}</div></div>
        <div><div style="font-size:9px;color:#aaa;">최장</div><div style="font-size:11px;color:#666;">${max}</div></div>
      </div>
    </div>`
}

// ─── Claude API 종합 소견 ───

async function generateInsight(
  surveyTitle: string,
  completedCount: number,
  totalSummary: Record<AssessmentLevel, number> | null,
  topQuestions: Array<{ text: string; type: string; data: unknown }>,
): Promise<string> {
  const claude = getAnthropicClient()

  const bodyPartBlock = totalSummary
    ? `[근골격계 판정 결과]
- 정상: ${totalSummary['정상']}명
- 관리대상자: ${totalSummary['관리대상자']}명
- 통증호소자: ${totalSummary['통증호소자']}명`
    : ''

  const questionBlock = topQuestions
    .slice(0, 6)
    .map((q) => {
      if ((q.type === 'RADIO' || q.type === 'CHECKBOX' || q.type === 'DROPDOWN') && q.data) {
        const sorted = Object.entries(q.data as Record<string, number>)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([k, v]) => `${k}(${v}명)`)
          .join(', ')
        return `- ${q.text}: ${sorted}`
      }
      return null
    })
    .filter(Boolean)
    .join('\n')

  const prompt = `당신은 노동안전보건 전문가입니다. 다음 설문 분석 결과를 바탕으로 종합 소견을 작성해주세요.

[설문] ${surveyTitle}
[완료 응답자] ${completedCount}명

${bodyPartBlock}

[주요 응답 분포]
${questionBlock || '(구조화된 응답 데이터 없음)'}

다음 형식으로 작성해주세요 (각 항목 2~3가지, 전체 400자 이내):

**주목할 사항**
• (항목)

**우선 조치 필요 사항**
• (항목)

**종합 의견**
(2~3문장으로 현장 담당자가 바로 활용할 수 있는 실용적인 의견)

불필요한 서두나 "위 결과를 바탕으로" 같은 문장 없이 바로 내용으로 시작하세요.`

  const msg = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '소견을 생성할 수 없습니다.'
  return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^•/gm, '&bull;')
}

// ─── 전체 HTML 조립 ───

function buildHtml(params: {
  surveyTitle: string
  year: number | null
  totalResponses: number
  completedResponses: number
  tenureHtml: string
  bodyPartHtml: string
  questionSectionsHtml: string
  insightHtml: string
  generatedAt: string
}): string {
  const completionRate = params.totalResponses > 0
    ? Math.round((params.completedResponses / params.totalResponses) * 100)
    : 0

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page :first { margin: 0; }
  body { font-family: "Apple SD Gothic Neo", "Malgun Gothic", "나눔고딕", sans-serif; font-size: 12px; color: #222; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 18mm 16mm; }
  .cover { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; height: 297mm; padding: 20mm 20mm; background: linear-gradient(160deg, #1a237e 0%, #283593 60%, #3949ab 100%); color: white; position: relative; break-after: page; }
  .section-title { font-size: 13px; font-weight: 700; color: #1a1a2e; border-left: 3px solid #4472C4; padding-left: 10px; margin: 24px 0 14px 0; }
  @media print { .page-break { page-break-before: always; } }
</style>
</head>
<body>

<!-- 표지 -->
<div class="cover">
  <!-- 상단 레이블 -->
  <div style="font-size:11px;opacity:0.5;letter-spacing:2px;">SURVEY ANALYSIS REPORT</div>

  <!-- 중간 메인 콘텐츠 -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="font-size:26px;font-weight:800;line-height:1.4;margin-bottom:16px;">${params.surveyTitle}</div>
    ${params.year ? `<div style="font-size:14px;opacity:0.7;margin-bottom:36px;">${params.year}년</div>` : '<div style="margin-bottom:36px;"></div>'}
    <div style="display:flex;gap:32px;">
      <div><div style="font-size:10px;opacity:0.6;">총 응답</div><div style="font-size:28px;font-weight:700;">${params.totalResponses}명</div></div>
      <div><div style="font-size:10px;opacity:0.6;">완료 응답</div><div style="font-size:28px;font-weight:700;">${params.completedResponses}명</div></div>
      <div><div style="font-size:10px;opacity:0.6;">완료율</div><div style="font-size:28px;font-weight:700;">${completionRate}%</div></div>
    </div>
  </div>

  <!-- 하단 기관 정보 -->
  <div style="width:100%;border-top:1px solid rgba(255,255,255,0.25);padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="font-size:14px;font-weight:700;letter-spacing:0.5px;">새움터</div>
      <div style="font-size:10px;opacity:0.6;margin-top:3px;">충남노동건강인권센터</div>
    </div>
    <div style="font-size:10px;opacity:0.45;">${params.generatedAt} 생성</div>
  </div>
</div>

<!-- 본문 -->
<div class="page page-break">

  ${params.tenureHtml ? `<h2 class="section-title">응답자 특성</h2>${params.tenureHtml}` : ''}

  ${params.bodyPartHtml ? `<h2 class="section-title" style="margin-top:28px;">근골격계 증상 판정</h2>${params.bodyPartHtml}` : ''}

  <h2 class="section-title" style="margin-top:28px;">문항별 응답 분포</h2>
  ${params.questionSectionsHtml}

  <h2 class="section-title" style="margin-top:32px;">종합 소견</h2>
  <div style="padding:18px 20px;background:#f8f9ff;border:1px solid #dbe4ff;border-radius:8px;line-height:1.8;font-size:12px;color:#222;">
    ${params.insightHtml}
  </div>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:9px;color:#bbb;text-align:right;">
    본 보고서는 새움터(충남노동건강인권센터) 시스템에서 자동 생성되었습니다. &nbsp;|&nbsp; ${params.generatedAt}
  </div>
</div>

</body>
</html>`
}

// ─── GET handler ───

export async function GET(req: NextRequest, { params }: Params) {
  try {
  const auth = await requireSurveyAccess(params.surveyId)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: { questions: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  })
  if (!survey) return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })

  const rawResponses = await prisma.surveyResponse.findMany({
    where: { surveyId: params.surveyId, completedAt: { not: null } },
    include: { answers: true },
  })
  const responses = rawResponses.map(r => ({
    ...r,
    answers: filterVisibleAnswers(r.answers, survey.sections),
  }))

  const allQuestions = survey.sections.flatMap((s) => s.questions)
  const codeToId = new Map<string, string>()
  for (const q of allQuestions) {
    if (q.questionCode) codeToId.set(q.questionCode, q.id)
  }

  // 숨김 질문 ID 목록 (증상 세부 질문)
  const SYMPTOM_PREFIX = codeToId.has('Q4-1') ? 'Q4-1' : (codeToId.has('Q2-1') ? 'Q2-1' : 'Q4-1')
  const hiddenCodes = new Set([
    'S0-serviceYears', 'S0-serviceMonths', 'S0-deptYears', 'S0-deptMonths',
    ...BODY_PARTS.flatMap((bp) => [
      `${SYMPTOM_PREFIX}-${bp.key}-period`,
      `${SYMPTOM_PREFIX}-${bp.key}-level`,
      `${SYMPTOM_PREFIX}-${bp.key}-freq`,
    ]),
  ])
  const hiddenIds = new Set<string>()
  for (const code of hiddenCodes) {
    const id = codeToId.get(code)
    if (id) hiddenIds.add(id)
  }

  // ─── questionStats 계산 ───
  const answersByQuestion = new Map<string, unknown[]>()
  for (const response of responses) {
    for (const answer of response.answers) {
      if (!answersByQuestion.has(answer.questionId)) answersByQuestion.set(answer.questionId, [])
      answersByQuestion.get(answer.questionId)!.push(answer.value)
    }
  }

  const questionStats: Array<{ id: string; code: string | null; text: string; type: string; data: unknown; responseCount: number }> = []
  for (const q of allQuestions) {
    if (hiddenIds.has(q.id)) continue
    const values = answersByQuestion.get(q.id) || []

    let data: unknown = null
    if (q.questionType === 'RADIO' || q.questionType === 'DROPDOWN') {
      const counts: Record<string, number> = {}
      for (const v of values) { const s = String(v); counts[s] = (counts[s] || 0) + 1 }
      data = counts
    } else if (q.questionType === 'CHECKBOX') {
      const counts: Record<string, number> = {}
      for (const v of values) {
        const arr = Array.isArray(v) ? v : [v]
        for (const item of arr) { const s = String(item); counts[s] = (counts[s] || 0) + 1 }
      }
      data = counts
    } else if (q.questionType === 'NUMBER' || q.questionType === 'RANGE') {
      const nums = values.map(Number).filter((n) => !isNaN(n))
      if (nums.length > 0) {
        const sorted = [...nums].sort((a, b) => a - b)
        const sum = nums.reduce((a, b) => a + b, 0)
        const mid = Math.floor(sorted.length / 2)
        const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
        data = { avg: Math.round((sum / nums.length) * 10) / 10, min: sorted[0], max: sorted[sorted.length - 1], median }
      }
    } else if (q.questionType === 'CONSENT') {
      const counts: Record<string, number> = { 'true': 0, 'false': 0 }
      for (const v of values) { if (v === true || v === 'true') counts['true']++; else counts['false']++ }
      if (counts['false'] === 0) delete counts['false']
      if (counts['true'] === 0) delete counts['true']
      data = counts
    }

    questionStats.push({ id: q.id, code: q.questionCode, text: q.questionText, type: q.questionType, data, responseCount: values.length })
  }

  // ─── 근골격계 판정 계산 ───
  let bodyPartHtml = ''
  let totalSummaryForInsight: Record<AssessmentLevel, number> | null = null
  const symptomQId = codeToId.get(SYMPTOM_PREFIX)

  if (symptomQId) {
    const bodyPartSummary: Record<string, Record<AssessmentLevel, number>> = {}
    const totalSummary: Record<AssessmentLevel, number> = { '정상': 0, '관리대상자': 0, '통증호소자': 0 }
    let respondentCount = 0

    for (const bp of BODY_PARTS) {
      bodyPartSummary[bp.label] = { '정상': 0, '관리대상자': 0, '통증호소자': 0 }
    }

    for (const response of responses) {
      const ansMap = new Map(response.answers.map((a) => [a.questionId, a.value]))
      const selectedParts = (ansMap.get(symptomQId) as string[] | undefined) || []
      if (!Array.isArray(selectedParts) || selectedParts.length === 0) continue

      respondentCount++
      let worstLevel: AssessmentLevel = '정상'

      for (const bp of BODY_PARTS) {
        if (selectedParts.includes(bp.label)) {
          const periodId = codeToId.get(`${SYMPTOM_PREFIX}-${bp.key}-period`)
          const levelId = codeToId.get(`${SYMPTOM_PREFIX}-${bp.key}-level`)
          const freqId = codeToId.get(`${SYMPTOM_PREFIX}-${bp.key}-freq`)
          const period = periodId ? String(ansMap.get(periodId) ?? '') || null : null
          const level = levelId ? String(ansMap.get(levelId) ?? '') || null : null
          const freq = freqId ? String(ansMap.get(freqId) ?? '') || null : null
          const result = assessBodyPart(level, period, freq)
          bodyPartSummary[bp.label][result]++
          if (result === '통증호소자') worstLevel = '통증호소자'
          else if (result === '관리대상자' && worstLevel !== '통증호소자') worstLevel = '관리대상자'
        } else {
          bodyPartSummary[bp.label]['정상']++
        }
      }
      totalSummary[worstLevel]++
    }

    if (respondentCount > 0) {
      bodyPartHtml = buildBodyPartSection(bodyPartSummary, totalSummary, responses.length)
      totalSummaryForInsight = totalSummary
    }
  }

  // ─── 근속기간 ───
  function formatMonths(m: number): string {
    return `${Math.floor(m / 12)}년 ${Math.round(m % 12)}개월`
  }
  function computeTenureCard(yearsCode: string, monthsCode: string, label: string): string {
    const yId = codeToId.get(yearsCode)
    const mId = codeToId.get(monthsCode)
    const totalMonths: number[] = []
    for (const r of responses) {
      const ansMap = new Map(r.answers.map((a) => [a.questionId, a.value]))
      const y = yId ? Number(ansMap.get(yId)) : NaN
      const mo = mId ? Number(ansMap.get(mId)) : NaN
      if (!isNaN(y) || !isNaN(mo)) totalMonths.push((isNaN(y) ? 0 : y) * 12 + (isNaN(mo) ? 0 : mo))
    }
    if (totalMonths.length === 0) return ''
    const sorted = [...totalMonths].sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    return buildTenureCard(label, formatMonths(sorted[0]), formatMonths(sorted[sorted.length - 1]), formatMonths(sum / sorted.length), formatMonths(median))
  }

  const tenureCard = computeTenureCard('S0-serviceYears', 'S0-serviceMonths', '전체 근속기간')
  const deptCard = computeTenureCard('S0-deptYears', 'S0-deptMonths', '부서 근속기간')
  const tenureHtml = tenureCard || deptCard
    ? `<div style="display:flex;gap:12px;">${tenureCard}${deptCard}</div>`
    : ''

  // ─── 질문 섹션 HTML ───
  const questionSectionsHtml = questionStats
    .map((q) => buildQuestionSection(q.code, q.text, q.type, q.data, q.responseCount))
    .join('')

  // ─── Claude 종합 소견 ───
  const topQuestionsForInsight = questionStats.filter(
    (q) => q.type === 'RADIO' || q.type === 'CHECKBOX' || q.type === 'DROPDOWN'
  )
  const insightHtml = await generateInsight(
    survey.title,
    responses.length,
    totalSummaryForInsight,
    topQuestionsForInsight,
  )

  // ─── 날짜 포맷 ───
  const now = new Date()
  const generatedAt = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`

  // ─── HTML → PDF ───
  const html = buildHtml({
    surveyTitle: survey.title,
    year: survey.year,
    totalResponses: responses.length,
    completedResponses: responses.length,
    tenureHtml,
    bodyPartHtml,
    questionSectionsHtml,
    insightHtml,
    generatedAt,
  })

  const pdfBuffer = await generatePdf(html, { landscape: false })

  const filename = `${survey.title}_분석보고서_${generatedAt.replace(/\./g, '')}.pdf`
  const encodedFilename = encodeURIComponent(filename)

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  })
  } catch (e) {
    console.error('[export-report error]', e)
    return NextResponse.json({ error: String(e), stack: e instanceof Error ? e.stack : undefined }, { status: 500 })
  }
}
