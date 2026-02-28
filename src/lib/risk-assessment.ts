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
  fields: { key: string; label: string; shortLabel: string; max: number }[]
}> = {
  ACCIDENT: {
    label: '재해 관련 추가점수 (최대 2점)',
    max: 2,
    fields: [
      { key: 'accidentExperience', label: '과거 재해 발생 이력 있음 (+1점)', shortLabel: '사고경험', max: 1 },
      { key: 'accidentJudgement', label: '재해 유발 가능성 있음 (+1점)', shortLabel: '사고우려', max: 1 },
    ],
  },
  CHEMICAL: {
    label: '화학물질 관리 추가점수 (최대 3점)',
    max: 3,
    fields: [
      { key: 'managementStatus',  label: '관리상태 불량 (+1점)', shortLabel: '관리미비', max: 1 },
      { key: 'ventilationStatus', label: '국소배기장치 미비 (+1점)', shortLabel: '배기장치미비', max: 1 },
      { key: 'workerComplaint',   label: '작업자 불안감 호소 (+1점)', shortLabel: '작업자불안', max: 1 },
    ],
  },
  MUSCULOSKELETAL: {
    label: '근골격계 추가점수 (최대 2점)',
    max: 2,
    fields: [
      { key: 'experience',  label: '치료 경험 또는 치료 권고 이력 있음 (+1점)', shortLabel: '치료경험', max: 1 },
      { key: 'currentPain', label: '현재 통증 호소 (+1점)', shortLabel: '통증여부', max: 1 },
    ],
  },
  NOISE: {
    label: '소음 추가점수 (최대 3점)',
    max: 3,
    fields: [
      { key: 'noiseStress', label: '소음 스트레스 또는 청각저하 우려 (+1점)', shortLabel: '스트레스', max: 1 },
      { key: 'hearingLoss', label: '특수건강검진 난청 소견 (+2점)', shortLabel: '난청소견', max: 2 },
    ],
  },
  OTHER:    { label: '추가점수 없음', max: 0, fields: [] },
  ABSOLUTE: { label: '절대기준 (항상 16점)', max: 0, fields: [] },
}

// ─── 카테고리별 중대성/가능성 점수기준 ───

const ACCIDENT_SEVERITY_DESC: Record<number, string> = {
  1: '휴업 또는 치료 불필요',
  2: '14일 이내의 휴업 발생',
  3: '15일 ~ 30일의 휴업 발생',
  4: '한달 이상의 휴업 발생',
  5: '사망 또는 영구 장해',
}
const ACCIDENT_LIKELIHOOD_DESC: Record<number, string> = {
  1: '발생 가능성 낮고, 해당 작업에 월 10일 미만 종사',
  2: '발생 가능성 낮고, 해당 작업에 월 10일 이상 종사',
  3: '발생 가능성 보통이고, 해당 작업에 월 10일 미만 종사',
  4: '발생 가능성 보통이고, 해당 작업에 월 10일 이상 종사',
  5: '발생 가능성 높음',
}

const CHEMICAL_SEVERITY_DESC: Record<number, string> = {
  1: 'GHS 비위험',
  2: 'GHS 경고',
  3: 'GHS 위험 (경고 이상)',
  4: 'GHS 위험 (높음)',
  5: 'GHS 위험 (매우 높음)',
}
const CHEMICAL_LIKELIHOOD_DESC: Record<number, string> = {
  1: '연 2-3회 취급',
  2: '월 2-3회 취급',
  3: '주 2-3회 취급',
  4: '매일 4시간 이하 취급',
  5: '매일 4시간 초과 취급',
}

const MUSC_SEVERITY_DESC: Record<number, string> = {
  1: 'Borg 6~9 (매우 가벼움)',
  2: 'Borg 10~11 (가벼움)',
  3: 'Borg 12~13 (약간 힘듦)',
  4: 'Borg 14~15 (힘듦)',
  5: 'Borg 16~20 (매우 힘듦)',
}
const MUSC_LIKELIHOOD_REGULAR_DESC: Record<number, string> = {
  1: '연 2-3회 (작업 빈도 낮음)',
  2: '주 1-3일, 1일 2시간 이내',
  3: '1일 4시간 이하',
  4: '1일 4-8시간',
  5: '1일 8시간 초과',
}
const MUSC_LIKELIHOOD_IRREGULAR_DESC: Record<number, string> = {
  1: '월 20시간 미만',
  2: '월 20-50시간',
  3: '월 50-75시간',
  4: '월 75-100시간',
  5: '월 100시간 초과',
}

const NOISE_SEVERITY_DESC: Record<number, string> = {
  1: '60dB 미만',
  2: '60 ~ 70dB',
  3: '70 ~ 80dB',
  4: '80 ~ 90dB',
  5: '90dB 이상',
}
const NOISE_LIKELIHOOD_DESC: Record<number, string> = {
  1: '하루 2시간 이하 노출',
  2: '하루 4시간 이하 노출',
  3: '하루 8시간 이하 노출',
  4: '하루 8-10시간 노출',
  5: '하루 10시간 이상 노출',
}

const GENERIC_SEVERITY_DESC: Record<number, string> = {
  1: '경미 (부상 없음)',
  2: '경상 (경미한 부상, 치료 불필요)',
  3: '중상 (직업병, 치료 필요)',
  4: '중대 (만성 질환, 입원 필요)',
  5: '사망 / 영구 장해',
}
const GENERIC_LIKELIHOOD_DESC: Record<number, string> = {
  1: '거의 없음 (연 1회 미만)',
  2: '가끔 (연 1~수회)',
  3: '자주 (월 1회 이상)',
  4: '빈번 (주 1회 이상)',
  5: '항상 (매일)',
}

/** 카테고리별 중대성 점수 설명 */
export function getSeverityDesc(category: string, score: number): string {
  switch (category) {
    case 'ACCIDENT':        return ACCIDENT_SEVERITY_DESC[score] || ''
    case 'NOISE':           return NOISE_SEVERITY_DESC[score] || ''
    case 'CHEMICAL':        return CHEMICAL_SEVERITY_DESC[score] || ''
    case 'MUSCULOSKELETAL': return MUSC_SEVERITY_DESC[score] || ''
    default:                return GENERIC_SEVERITY_DESC[score] || ''
  }
}

/** 카테고리별 가능성 점수 설명 */
export function getLikelihoodDesc(category: string, evaluationType: string, score: number): string {
  switch (category) {
    case 'ACCIDENT':        return ACCIDENT_LIKELIHOOD_DESC[score] || ''
    case 'NOISE':           return NOISE_LIKELIHOOD_DESC[score] || ''
    case 'CHEMICAL':        return CHEMICAL_LIKELIHOOD_DESC[score] || ''
    case 'MUSCULOSKELETAL': {
      const descs = evaluationType === 'OCCASIONAL' ? MUSC_LIKELIHOOD_IRREGULAR_DESC : MUSC_LIKELIHOOD_REGULAR_DESC
      return descs[score] || ''
    }
    default:                return GENERIC_LIKELIHOOD_DESC[score] || ''
  }
}

// 가점 상세를 한글 레이블로 변환
export function formatAdditionalDetails(
  category: string,
  details: Record<string, number> | null | undefined
): string[] {
  if (!details) return []
  const config = ADDITIONAL_SCORE_CONFIG[category]
  if (!config) return []
  const labels: string[] = []
  for (const field of config.fields) {
    const val = details[field.key]
    if (val && val > 0) {
      labels.push(`${field.shortLabel}(+${val})`)
    }
  }
  return labels
}
