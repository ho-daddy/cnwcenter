// MSDS 유해성 텍스트 기반 중대성 점수 자동산정 룰

export interface MsdsRule {
  rule: string[]
  score: number
}

export type SeverityStandard = 'SAEUMTER' | 'METAL_UNION'

// ─── 새움터 기준 (1~5) ───
export const SAEUMTER_RULES: MsdsRule[] = [
  { rule: ['발암성', '구분1B'], score: 5 },
  { rule: ['발암성', '구분1A'], score: 5 },
  { rule: ['발암성', '구분2'], score: 5 },
  { rule: ['생식세포 변이원성', '구분1A'], score: 5 },
  { rule: ['생식세포 변이원성', '구분1B'], score: 5 },
  { rule: ['생식세포 변이원성', '구분2'], score: 5 },
  { rule: ['생식독성', '구분1A'], score: 5 },
  { rule: ['생식독성', '구분1B'], score: 5 },
  { rule: ['생식독성', '구분2'], score: 5 },
  { rule: ['생식독성', '수유독성'], score: 5 },
  { rule: ['급성 독성(흡입: 분진/미스트)', '구분1'], score: 4 },
  { rule: ['급성 독성(흡입: 분진/미스트)', '구분2'], score: 3 },
  { rule: ['급성 독성(흡입: 분진/미스트)', '구분3'], score: 3 },
  { rule: ['급성 독성(흡입: 분진/미스트)', '구분4'], score: 3 },
  { rule: ['급성 독성(흡입: 가스)', '구분1'], score: 4 },
  { rule: ['급성 독성(흡입: 가스)', '구분2'], score: 3 },
  { rule: ['급성 독성(흡입: 가스)', '구분3'], score: 3 },
  { rule: ['급성 독성(흡입: 가스)', '구분4'], score: 3 },
  { rule: ['급성 독성(경피)', '구분1'], score: 4 },
  { rule: ['급성 독성(경피)', '구분2'], score: 3 },
  { rule: ['급성 독성(경피)', '구분3'], score: 3 },
  { rule: ['급성 독성(경피)', '구분4'], score: 3 },
  { rule: ['급성 독성(경구)', '구분1'], score: 4 },
  { rule: ['급성 독성(경구)', '구분2'], score: 3 },
  { rule: ['급성 독성(경구)', '구분3'], score: 3 },
  { rule: ['급성 독성(경구)', '구분4'], score: 3 },
  { rule: ['흡인 유해성', '구분1'], score: 4 },
  { rule: ['흡인 유해성', '구분2'], score: 3 },
  { rule: ['호흡기 과민성', '구분1(1A/1B)'], score: 4 },
  { rule: ['피부 부식성/피부 자극성', '구분1(1A/1B/1C)'], score: 3 },
  { rule: ['피부 부식성/피부 자극성', '구분1'], score: 3 },
  { rule: ['피부 부식성/피부 자극성', '구분2'], score: 2 },
  { rule: ['피부 과민성', '구분1(1A/1B)'], score: 2 },
  { rule: ['심한 눈 손상성/눈 자극성', '구분1'], score: 3 },
  { rule: ['심한 눈 손상성/눈 자극성', '구분2(2A/2B)'], score: 2 },
  { rule: ['심한 눈 손상성/눈 자극성', '구분2'], score: 2 },
  { rule: ['심한 눈 손상성/눈 자극성', '구분2A'], score: 2 },
  { rule: ['심한 눈 손상성/눈 자극성', '구분2B'], score: 2 },
  { rule: ['특정표적장기 독성(반복 노출)', '구분1'], score: 4 },
  { rule: ['특정표적장기 독성(반복 노출)', '구분2'], score: 3 },
  { rule: ['특정표적장기 독성(1회 노출)', '구분1'], score: 4 },
  { rule: ['특정표적장기 독성(1회 노출)', '구분2'], score: 3 },
  { rule: ['특정표적장기 독성(1회 노출)', '구분3(호흡기 자극)'], score: 3 },
]

// 백워드 호환용 export (기존 import 경로 유지)
export const MSDS_RULES = SAEUMTER_RULES

// ─── 룰 매칭 헬퍼 ───
function matchRules(text: string, rules: MsdsRule[]): number {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let maxScore = 0
  for (const line of lines) {
    const lower = line.toLowerCase()
    for (const { rule, score } of rules) {
      if (rule.every(cond => lower.includes(cond.toLowerCase()))) {
        if (score > maxScore) maxScore = score
      }
    }
  }
  return maxScore
}

function isHazardsEmpty(text: string): boolean {
  const trimmed = text.trim()
  return !trimmed || trimmed === '해당없음' || trimmed === '없음'
}

function isRegulationsEmpty(text: string): boolean {
  const trimmed = text.trim()
  return !trimmed || trimmed === '해당없음' || trimmed === '없음'
}

// ─── 새움터: 유해성 룰 최댓값, 최솟값 1 ───
function calculateSaeumter(hazards: string, _regulations: string): number {
  const score = matchRules(hazards, SAEUMTER_RULES)
  return score === 0 ? 1 : score
}

// ─── 금속노조: 유해성+규제사항 우선순위 로직 ───
// 1점: 유해성 비어있음 AND 규제사항 비어있음/해당없음
// 4점: (새움터 5점 = CMR 카테고리) OR 규제사항에 '특별관리물질'
// 3점: 규제사항에 '관리대상유해물질'
// 2점: 그 외 (유해성/규제사항에 내용은 있음)
function calculateMetalUnion(hazards: string, regulations: string): number {
  if (isHazardsEmpty(hazards) && isRegulationsEmpty(regulations)) return 1

  const isCMR = matchRules(hazards, SAEUMTER_RULES) >= 5
  const regLower = regulations.toLowerCase()
  const isSpecialMgmt = regLower.includes('특별관리물질')
  if (isCMR || isSpecialMgmt) return 4

  if (regLower.includes('관리대상유해물질')) return 3

  return 2
}

// ─── 기준 메타데이터 ───
export interface StandardMeta {
  value: SeverityStandard
  label: string
  maxScore: number
  /** '영업비밀' 체크 시 자동 점수 */
  tradeSecretScore: number
  /** '영업비밀' 체크 시 유해성 텍스트 자동 채움 여부 */
  tradeSecretFillsHazards: boolean
  /** 유해성 자동 텍스트 (tradeSecretFillsHazards가 true일 때) */
  tradeSecretHazardsText: string
  /** 유해성/규제사항 기반 점수 계산 */
  calculate: (hazards: string, regulations: string) => number
}

export const STANDARDS_META: Record<SeverityStandard, StandardMeta> = {
  SAEUMTER: {
    value: 'SAEUMTER',
    label: '새움터(1~5)',
    maxScore: 5,
    tradeSecretScore: 5,
    tradeSecretFillsHazards: false,
    tradeSecretHazardsText: '영업비밀',
    calculate: calculateSaeumter,
  },
  METAL_UNION: {
    value: 'METAL_UNION',
    label: '금속노조(1~4)',
    maxScore: 4,
    tradeSecretScore: 1,
    tradeSecretFillsHazards: true,
    tradeSecretHazardsText: '영업비밀 성분 주의',
    calculate: calculateMetalUnion,
  },
}

export const SEVERITY_STANDARDS: SeverityStandard[] = ['SAEUMTER', 'METAL_UNION']

export function getStandardMeta(standard: SeverityStandard | string | null | undefined): StandardMeta {
  if (standard && standard in STANDARDS_META) return STANDARDS_META[standard as SeverityStandard]
  return STANDARDS_META.SAEUMTER
}

/**
 * 유해성/규제사항 텍스트에서 중대성 점수 자동 계산.
 * 새움터: 유해성 룰 기반 최댓값 (regulations 무시).
 * 금속노조: 유해성+규제사항 복합 우선순위.
 */
export function calculateComponentSeverity(
  hazardsText: string,
  standard: SeverityStandard = 'SAEUMTER',
  regulationsText: string = '',
): number {
  const meta = STANDARDS_META[standard] || STANDARDS_META.SAEUMTER
  return meta.calculate(hazardsText, regulationsText)
}

/** 제품 중대성 점수 = 구성성분 점수 최댓값 */
export function calculateProductSeverity(componentScores: number[]): number {
  if (componentScores.length === 0) return 1
  return Math.max(...componentScores)
}
