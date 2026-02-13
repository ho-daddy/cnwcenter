// 근골격계유해요인조사 타입 정의

import { BodyPart, MSurveyStatus } from '@prisma/client'

// ==========================================
// 기본 상수 및 레이블
// ==========================================

export const ASSESSMENT_TYPE_OPTIONS = [
  { value: 'REGULAR', label: '정기조사' },
  { value: 'OCCASIONAL', label: '수시조사' },
] as const

export const WORK_FREQUENCY_OPTIONS = [
  { value: 'REGULAR', label: '상시작업' },
  { value: 'INTERMITTENT', label: '간헐작업' },
] as const

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'REGULAR', label: '정규직' },
  { value: 'CONTRACT', label: '계약직' },
  { value: 'DISPATCH', label: '파견직' },
  { value: 'DAILY', label: '일용직' },
] as const

export const JOB_AUTONOMY_OPTIONS = [
  { value: 1, label: '작업속도와 휴식 등 여유시간 스스로 조절 가능' },
  { value: 2, label: '라인작업은 아니나 정해진 휴식시간 외에는 작업을 해야 함' },
  { value: 3, label: '라인작업이며 정해진 작업속도에 맞추어야 함' },
] as const

export const OCCASIONAL_REASON_OPTIONS = [
  { value: '질환자발생', label: '질환자발생' },
  { value: '설비변화', label: '설비변화' },
  { value: '작업방법변경', label: '작업방법변경' },
  { value: '기타', label: '기타(직접입력)' },
] as const

export const WORK_DAYS_OPTIONS = [
  { value: '주5일', label: '주5일' },
  { value: '주6일', label: '주6일' },
  { value: '기타', label: '기타(직접입력)' },
] as const

export const SHIFT_TYPE_OPTIONS = [
  { value: '주간고정', label: '주간고정' },
  { value: '주야2교대', label: '주야2교대' },
  { value: '주간연속2교대', label: '주간연속2교대' },
  { value: '4조3교대', label: '4조3교대' },
  { value: '5조3교대', label: '5조3교대' },
  { value: '기타', label: '기타(직접입력)' },
] as const

export const CHANGE_OPTIONS = [
  { value: 'CHANGE', label: '변화있음' },
  { value: 'NO_CHANGE', label: '변화없음' },
] as const

export const OTHER_RISK_OPTIONS = [
  { key: 'hasNoise', label: '소음' },
  { key: 'hasThermal', label: '온열' },
  { key: 'hasBurn', label: '화상' },
  { key: 'hasDust', label: '분진' },
  { key: 'hasAccident', label: '사고성재해' },
  { key: 'hasStress', label: '스트레스' },
  { key: 'hasOtherRisk', label: '기타(직접입력)' },
] as const

export const AFFECTED_BODY_PARTS = [
  { key: 'affectedHandWrist', label: '손/손목' },
  { key: 'affectedElbow', label: '팔꿈치/아래팔' },
  { key: 'affectedShoulder', label: '어깨/위팔' },
  { key: 'affectedNeck', label: '목' },
  { key: 'affectedBack', label: '허리/고관절' },
  { key: 'affectedKnee', label: '무릎/발목' },
] as const

export const WORK_CONDITION_CHANGES = [
  { key: 'changeWorkHours', label: '작업시간(특근 등)' },
  { key: 'changeWorkSpeed', label: '작업속도' },
  { key: 'changeManpower', label: '인력' },
  { key: 'changeWorkload', label: '작업량(일의 종류)' },
  { key: 'changeEquipment', label: '작업설비' },
] as const

export const MANAGEMENT_LEVEL_OPTIONS = [
  { value: 'HIGH', label: '상 [7점]', minScore: 7, maxScore: 7 },
  { value: 'MEDIUM_HIGH', label: '중상 [5-6점]', minScore: 5, maxScore: 6 },
  { value: 'MEDIUM', label: '중 [3-4점]', minScore: 3, maxScore: 4 },
  { value: 'LOW', label: '하 [1-2점]', minScore: 1, maxScore: 2 },
] as const

export const STATUS_LABELS: Record<MSurveyStatus, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: '조사중', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: '완료', color: 'bg-green-100 text-green-700' },
  REVIEWED: { label: '검토완료', color: 'bg-purple-100 text-purple-700' },
}

export const BODY_PART_LABELS: Record<BodyPart, { label: string; shortLabel: string }> = {
  HAND_WRIST: { label: '손/손목', shortLabel: '손' },
  ELBOW_FOREARM: { label: '팔꿈치/아래팔', shortLabel: '팔꿈치' },
  SHOULDER_ARM: { label: '어깨/위팔', shortLabel: '어깨' },
  NECK: { label: '목', shortLabel: '목' },
  BACK_HIP: { label: '허리/고관절', shortLabel: '허리' },
  KNEE_ANKLE: { label: '무릎/발목', shortLabel: '무릎' },
}

// ==========================================
// 부위별 각도 입력 타입
// ==========================================

// 손/손목 각도
export interface HandWristAngles {
  flexion: number        // 굴곡 (0~90)
  extension: number      // 신전 (0~90)
  adduction: number      // 내전 (0~45)
  abduction: number      // 외전 (0~30)
}

// 손/손목 부가요인
export interface HandWristFactors {
  toolOver1kg: boolean       // 공구 1kg 이상
  toolOver2kg: boolean       // 공구 2kg 이상
  toolVibration: boolean     // 공구진동
  fingerGrip: boolean        // 손가락 쥐기/집기
  excessiveExtension: boolean // 과도한 손가락 신전
  contactPressure: boolean   // 접촉 압박/충격
  slipperyGlove: boolean     // 미끄러운 장갑 착용
  hammerUse: boolean         // 손을 망치처럼 사용
}

// 팔꿈치/아래팔 각도
export interface ElbowAngles {
  flexion: number        // 굴곡 (0~180)
  pronation: number      // 회내전 (0~90)
  supination: number     // 회외전 (0~90)
}

// 팔꿈치/아래팔 부가요인
export interface ElbowFactors {
  toolOver1kg: boolean       // 공구 1kg 이상
  toolVibration: boolean     // 공구 진동
  heavyWristRotation: boolean // 손목회전시 강한 힘(중량물)
  elbowPressure: boolean     // 팔꿈치 접촉 압박
  pushPull: boolean          // 손으로 밀기/당기기
  hammerWork: boolean        // 손 망치 작업
}

// 어깨/위팔 각도
export interface ShoulderAngles {
  neutral: number        // 중립 (-5~5)
  flexion: number        // 굴곡 (0~180)
  extension: number      // 신전 (0~60)
  abduction: number      // 외전 (0~180)
  adduction: number      // 내전 (0~50)
  externalRotation: number // 외회전 (0~90)
  internalRotation: number // 내회전 (0~90)
}

// 어깨/위팔 부가요인
export interface ShoulderFactors {
  toolOver1kg: boolean       // 공구 1kg 이상
  toolVibration: boolean     // 공구의 진동
  contactPressure: boolean   // 접촉 압박
  excessiveExtension: boolean // 팔꿈치 과도한 신전
  shoulderRaised: boolean    // 어깨 치켜 올림
  bendAndReach: boolean      // 허리 굽히고 팔 뻗기
  lyingPosition: boolean     // 누운자세/엎드린 자세
  shoulderCarry: boolean     // 어깨로 운반
  heavyLift: boolean         // 손을 이용해 중량물 들기/내리기
  heavyCarry: boolean        // 손으로 중량물 운반
  heavyPushPull: boolean     // 손으로 중량물 밀기/당기기
}

// 목 각도
export interface NeckAngles {
  neutral: number        // 중립 (0~5)
  flexion: number        // 굴곡 (0~60)
  extension: number      // 신전 (0~50)
  rotation: number       // 회전 (0~60)
  lateralTilt: number    // 측면기울임 (0~45)
}

// 목 부가요인
export interface NeckFactors {
  handsAboveShoulder: boolean  // 어깨위 손 올림
  bendAndReach: boolean        // 허리 굽히고 팔 뻗기
  confinedSpace: boolean       // 움직임이 제한된 좁은 공간
  shoulderCarry: boolean       // 어깨로 운반하는 작업
  combinedMovement: boolean    // 목의 굴곡/신전 상태에서 좌우 회전/꺾임 동시 작용
  shoulderHeavyCarry: boolean  // 어깨에 중량물을 올려 운반하는 작업
}

// 허리/고관절 각도
export interface BackAngles {
  flexion: number        // 굴곡 (0~90)
  extension: number      // 신전 (0~30)
  rotation: number       // 회전 (0~45)
  lateralTilt: number    // 측면기울임 (0~30)
}

// 허리/고관절 부가요인
export interface BackFactors {
  wholeBodyVibration: boolean  // 차량 등 전신 진동
  kneelSquat: boolean          // 무릎꿇기, 쪼그린 자세
  heavyOver5kg: boolean        // 중량물 5kg이상
  heavyOver10kg: boolean       // 중량물 10kg이상 (+2)
  heavyOver20kg: boolean       // 중량물 20kg이상 (+3)
  handsAboveShoulder: boolean  // 어깨 위로 손 올려 중량물 취급
  bendAndReach: boolean        // 허리 굽히고 팔 뻗기
  backCarry: boolean           // 등을 사용해 운반
  combinedMovement: boolean    // 허리의 굴곡/신전 상태에서 좌우 회전/꺾임 동시 작용
  poorSurface: boolean         // 중량물 운반시 노면상태 불량
}

// 무릎/발목 값 (시간/횟수 기반)
export interface KneeAnkleValues {
  kneelingTime: number    // 무릎꿇기/쪼그리기 (시간/일)
  climbingCount: number   // 오르내리기 (회/일)
  drivingHours: number    // 운전형태 (시간/일)
  walkingKm: number       // 걷기 (km/일)
}

// 힘 점수 / 정적·반복 점수 (부위별 추가 항목)
export interface ForceStaticFactors {
  forceChecked: boolean       // 힘 점수 체크
  staticOver1min: boolean     // 1분 이상 정적자세
  repetitionChecked: boolean  // 반복 체크 (부위별 기준 다름)
}

// 무릎/발목 부가요인
export interface KneeAnkleFactors {
  kneeTwist: boolean          // 무릎/발목 비틀림
  confinedSpace: boolean      // 움직임이 제한된 좁은 공간
  heavyOver10kg: boolean      // 중량물 10kg 이상
  heavyOver20kg: boolean      // 중량물 20kg 이상 (+2)
  unstableSurface: boolean    // 출발/정지 반복, 불안정한 자세, 노면불량
  kneePressure: boolean       // 무릎 접촉/충격
}

// ==========================================
// 폼 데이터 타입
// ==========================================

// 1번시트 (관리카드) 폼 데이터
export interface Sheet1FormData {
  assessmentType: string
  workerName: string
  investigatorName: string
  occasionalReason: string
  occasionalReasonCustom: string
  dailyWorkHours: number | null
  dailyProduction: string
  workFrequency: string
  employmentType: string
  workDays: string
  workDaysCustom: string
  shiftType: string
  shiftTypeCustom: string
  jobAutonomy: number | null

  // 기타 위험요인
  hasNoise: boolean
  hasThermal: boolean
  hasBurn: boolean
  hasDust: boolean
  hasAccident: boolean
  hasStress: boolean
  hasOtherRisk: boolean
  otherRiskDetail: string

  // 부담부위
  affectedHandWrist: boolean
  affectedElbow: boolean
  affectedShoulder: boolean
  affectedNeck: boolean
  affectedBack: boolean
  affectedKnee: boolean

  // 작업조건 변화 (변화있음/변화없음)
  changeWorkHours: string
  changeWorkSpeed: string
  changeManpower: string
  changeWorkload: string
  changeEquipment: string

  // 참조
  reference: string
}

// 요소작업 기본 정보
export interface ElementWorkFormData {
  name: string
  description: string

  // 작업특성
  toolWeight: number | null
  loadWeight: number | null
  loadFrequency: number | null
  pushPullForce: number | null
  pushPullFreq: number | null
  vibrationSource: string
  vibrationHours: number | null
}

// 2번시트 (인간공학기본카드) 부위별 점수 데이터
export interface BodyPartScoreData {
  bodyPart: BodyPart
  angles: Record<string, number>
  additionalFactors: Record<string, boolean>
  postureScore: number
  additionalScore: number
  totalScore: number
}

// 3번시트 (인간공학추가카드) 폼 데이터
export interface Sheet3FormData {
  // RULA/REBA 추가입력
  hasArmSupport: boolean
  hasUnstableLeg: boolean
  hasRapidPosture: boolean
  hasRapidForce: boolean

  // 무릎/손잡이/힘 선택
  kneePosture: string
  handleQuality: string

  // 계산 결과
  rulaScore: number | null
  rulaLevel: string
  rebaScore: number | null
  rebaLevel: string
  pushPullArm: string
  pushPullHand: string
}

// 4번시트 (종합평가카드) 폼 데이터
export interface Sheet4FormData {
  managementLevel: string
  evaluationResults: { elementWorkId: string; result: string }[]
}

// 개선사항 폼 데이터
export interface ImprovementFormData {
  elementWorkId: string
  documentNo: string
  problem: string
  improvement: string
  source: string
}

// ==========================================
// API 응답 타입
// ==========================================

export interface AssessmentSummary {
  id: string
  year: number
  assessmentType: string
  status: MSurveyStatus
  organizationUnit: {
    id: string
    name: string
    level: number
  }
  elementWorkCount: number
  createdAt: string
  updatedAt: string
}

export interface AssessmentDetail {
  id: string
  workplaceId: string
  organizationUnitId: string
  year: number
  assessmentType: string
  status: MSurveyStatus

  // 1번시트 필드
  workerName: string | null
  investigatorName: string | null
  occasionalReason: string | null
  occasionalReasonCustom: string | null
  dailyWorkHours: number | null
  dailyProduction: string | null
  workFrequency: string | null
  employmentType: string | null
  workDays: string | null
  workDaysCustom: string | null
  shiftType: string | null
  shiftTypeCustom: string | null
  jobAutonomy: number | null

  hasNoise: boolean
  hasThermal: boolean
  hasBurn: boolean
  hasDust: boolean
  hasAccident: boolean
  hasStress: boolean
  hasOtherRisk: boolean
  otherRiskDetail: string | null

  affectedHandWrist: boolean
  affectedElbow: boolean
  affectedShoulder: boolean
  affectedNeck: boolean
  affectedBack: boolean
  affectedKnee: boolean

  changeWorkHours: string | null
  changeWorkSpeed: string | null
  changeManpower: string | null
  changeWorkload: string | null
  changeEquipment: string | null

  reference: string | null

  // 4번시트 필드
  managementLevel: string | null
  overallComment: string | null

  // 생략 옵션
  skipSheet2: boolean
  skipSheet3: boolean

  // 관계 데이터
  organizationUnit: {
    id: string
    name: string
    level: number
    organization: {
      id: string
      name: string
      year: number
    }
  }
  elementWorks: ElementWorkDetail[]
  improvements: ImprovementDetail[]
  attachments: AttachmentDetail[]

  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string | null
    email: string
  } | null
}

export interface ElementWorkDetail {
  id: string
  sortOrder: number
  name: string
  description: string | null

  toolWeight: number | null
  loadWeight: number | null
  loadFrequency: number | null
  pushPullForce: number | null
  pushPullFreq: number | null
  vibrationSource: string | null
  vibrationHours: number | null

  rulaScore: number | null
  rulaLevel: string | null
  rebaScore: number | null
  rebaLevel: string | null
  pushPullArm: string | null
  pushPullHand: string | null

  hasArmSupport: boolean
  hasUnstableLeg: boolean
  hasRapidPosture: boolean
  hasRapidForce: boolean
  kneePosture: string | null
  handleQuality: string | null

  evaluationResult: string | null

  bodyPartScores: BodyPartScoreDetail[]
}

export interface BodyPartScoreDetail {
  id: string
  bodyPart: BodyPart
  angles: Record<string, number> | null
  additionalFactors: Record<string, boolean> | null
  postureScore: number
  additionalScore: number
  totalScore: number
}

export interface ImprovementDetail {
  id: string
  elementWorkId: string | null
  documentNo: string | null
  problem: string
  improvement: string
  source: string | null
}

export interface AttachmentDetail {
  id: string
  elementWorkId: string | null
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  filePath: string
  createdAt: string
}

// ==========================================
// 유틸리티 타입
// ==========================================

export type ScoreLevel = 'safe' | 'normal' | 'danger' | 'highDanger'

export const SCORE_LEVEL_INFO: Record<ScoreLevel, { label: string; color: string; range: string }> = {
  safe: { label: '안전', color: 'bg-green-100 text-green-700', range: '1-2점' },
  normal: { label: '보통', color: 'bg-yellow-100 text-yellow-700', range: '3-4점' },
  danger: { label: '위험', color: 'bg-orange-100 text-orange-700', range: '5-6점' },
  highDanger: { label: '고위험', color: 'bg-red-100 text-red-700', range: '7점' },
}

export function getScoreLevel(score: number): ScoreLevel {
  if (score <= 2) return 'safe'
  if (score <= 4) return 'normal'
  if (score <= 6) return 'danger'
  return 'highDanger'
}

export function getRulaRebaLevel(score: number, type: 'RULA' | 'REBA'): ScoreLevel {
  if (type === 'RULA') {
    if (score <= 2) return 'safe'
    if (score <= 4) return 'normal'
    if (score <= 6) return 'danger'
    return 'highDanger'
  } else {
    // REBA
    if (score <= 3) return 'safe'
    if (score <= 7) return 'normal'
    if (score <= 10) return 'danger'
    return 'highDanger'
  }
}
