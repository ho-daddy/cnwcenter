// 위험성평가 공통 유틸리티

export const HAZARD_CATEGORY_LABELS: Record<string, string> = {
  ACCIDENT: '사고성재해',
  MUSCULOSKELETAL: '근골격계',
  CHEMICAL: '유해화학물질',
  NOISE: '소음',
  ABSOLUTE: '절대기준',
  OTHER: '기타위험',
}

export const HAZARD_CATEGORY_COLORS: Record<string, string> = {
  ACCIDENT: 'bg-red-100 text-red-700',
  MUSCULOSKELETAL: 'bg-amber-100 text-amber-700',
  CHEMICAL: 'bg-purple-100 text-purple-700',
  NOISE: 'bg-blue-100 text-blue-700',
  ABSOLUTE: 'bg-gray-900 text-white',
  OTHER: 'bg-gray-100 text-gray-700',
}

export const EVALUATION_TYPE_LABELS: Record<string, string> = {
  REGULAR: '정기조사',
  OCCASIONAL: '수시조사',
}

export const IMPROVEMENT_STATUS_LABELS: Record<string, string> = {
  PLANNED: '예정',
  COMPLETED: '완료',
}

// 위험성 등급 계산 (5×5+3 체계, 최대 28점)
export function getRiskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 16) return { label: '매우높음', color: 'text-red-700',    bg: 'bg-red-100'    }
  if (score >= 9)  return { label: '높음',     color: 'text-orange-700', bg: 'bg-orange-100' }
  if (score >= 5)  return { label: '보통',     color: 'text-yellow-700', bg: 'bg-yellow-100' }
  return                  { label: '낮음',     color: 'text-green-700',  bg: 'bg-green-100'  }
}

// 위험성 점수 계산
export function calcRiskScore(
  category: string,
  severity: number,
  likelihood: number,
  additional: number
): number {
  if (category === 'ABSOLUTE') return 16
  return severity * likelihood + additional
}

// 중대성 (1~5점)
export const SEVERITY_OPTIONS = [
  { value: 1, label: '1점', desc: '부상 없음 / 건강영향 없음' },
  { value: 2, label: '2점', desc: '경미한 부상 / 단기 질환 (치료 불필요)' },
  { value: 3, label: '3점', desc: '중증 부상 / 직업병 (치료 필요)' },
  { value: 4, label: '4점', desc: '중대 부상 / 만성 질환 (입원 필요)' },
  { value: 5, label: '5점', desc: '사망 / 영구 장해' },
]

// 가능성 (1~5점)
export const LIKELIHOOD_OPTIONS = [
  { value: 1, label: '1점', desc: '거의 없음 (연 1회 미만)' },
  { value: 2, label: '2점', desc: '가끔 (연 1~수회)' },
  { value: 3, label: '3점', desc: '자주 (월 1회 이상)' },
  { value: 4, label: '4점', desc: '빈번 (주 1회 이상)' },
  { value: 5, label: '5점', desc: '항상 (매일)' },
]

// 카테고리별 추가점수 정의
export const ADDITIONAL_SCORE_CONFIG: Record<string, {
  label: string
  max: number
  fields: { key: string; label: string; max: number }[]
}> = {
  ACCIDENT: {
    label: '재해 관련 추가점수 (최대 2점)',
    max: 2,
    fields: [
      { key: 'accidentJudgement', label: '재해 유발 가능성 있음 (+1점)', max: 1 },
      { key: 'accidentExperience', label: '과거 재해 발생 이력 있음 (+1점)', max: 1 },
    ],
  },
  CHEMICAL: {
    label: '화학물질 관리 추가점수 (최대 3점)',
    max: 3,
    fields: [
      { key: 'managementStatus',  label: '관리상태 불량 (+1점)', max: 1 },
      { key: 'ventilationStatus', label: '환기 불량 (+1점)', max: 1 },
      { key: 'workerComplaint',   label: '작업자 이상 증상 호소 (+1점)', max: 1 },
    ],
  },
  MUSCULOSKELETAL: {
    label: '근골격계 추가점수 (최대 2점)',
    max: 2,
    fields: [
      { key: 'experience',  label: '해당 작업 경험 1년 이상 (+1점)', max: 1 },
      { key: 'currentPain', label: '현재 통증 호소 (+1점)', max: 1 },
    ],
  },
  NOISE: {
    label: '소음 추가점수 (최대 2점)',
    max: 2,
    fields: [
      { key: 'workerComplaint', label: '작업자 청력 이상 호소 (0~2점)', max: 2 },
    ],
  },
  OTHER:    { label: '추가점수 없음', max: 0, fields: [] },
  ABSOLUTE: { label: '절대기준 (항상 16점)', max: 0, fields: [] },
}
