import { PriorityLevel } from '@/types/briefing'

// 우선순위별 키워드 정의
export const PRIORITY_KEYWORDS: Record<Exclude<PriorityLevel, 'none'>, string[]> = {
  critical: [
    '사망',
    '중대재해',
    '사망사고',
    '산재사망',
    '추락사',
    '끼임사고',
    '질식사',
  ],
  high: [
    '구속',
    '판결',
    '기소',
    '송치',
    '벌금',
    '징역',
    '실형',
    '약식기소',
    '검찰송치',
  ],
  medium: [
    '산안법 개정',
    '산업안전보건법',
    '중대재해처벌법',
    '위험성평가',
    '고용노동부 점검',
    '특별감독',
    '근로감독',
    '안전보건진단',
    '작업중지',
  ],
  low: [
    '산업안전',
    '보건관리',
    '안전교육',
    '작업환경',
    '산업재해',
    '안전관리자',
    '보건관리자',
    '안전보건총괄책임자',
  ],
}

// 우선순위 순서 (정렬용)
export const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
}

// 모든 키워드 목록 (검색용)
export function getAllKeywords(): string[] {
  return Object.values(PRIORITY_KEYWORDS).flat()
}

// 텍스트에서 키워드 매칭
export function findMatchedKeywords(text: string): string[] {
  const matched: string[] = []

  for (const keywords of Object.values(PRIORITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword) && !matched.includes(keyword)) {
        matched.push(keyword)
      }
    }
  }

  return matched
}

// 텍스트의 우선순위 계산
export function calculatePriority(text: string): PriorityLevel {
  for (const [level, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return level as PriorityLevel
    }
  }
  return 'none'
}
