// MSDS 유해성 텍스트 기반 중대성 점수 자동산정 룰
// 기존 시스템의 msds_point_rules.json을 TypeScript로 이식

export interface MsdsRule {
  rule: string[]
  score: number
}

export const MSDS_RULES: MsdsRule[] = [
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

/** 유해성 텍스트에서 중대성 점수 자동 계산 (최솟값 1) */
export function calculateComponentSeverity(hazardsText: string): number {
  const lines = hazardsText.split('\n').map(l => l.trim()).filter(Boolean)
  let maxScore = 0
  for (const line of lines) {
    const lower = line.toLowerCase()
    for (const { rule, score } of MSDS_RULES) {
      if (rule.every(cond => lower.includes(cond.toLowerCase()))) {
        if (score > maxScore) maxScore = score
      }
    }
  }
  return maxScore === 0 ? 1 : maxScore
}

/** 제품 중대성 점수 = 구성성분 점수 최댓값 */
export function calculateProductSeverity(componentScores: number[]): number {
  if (componentScores.length === 0) return 1
  return Math.max(...componentScores)
}
