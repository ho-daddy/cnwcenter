/**
 * 근골격계유해요인조사 점수 계산 유틸리티
 * 엑셀 수식을 TypeScript로 변환
 */

import {
  HandWristAngles,
  HandWristFactors,
  ElbowAngles,
  ElbowFactors,
  ShoulderAngles,
  ShoulderFactors,
  NeckAngles,
  NeckFactors,
  BackAngles,
  BackFactors,
  KneeAnkleValues,
  KneeAnkleFactors,
  ForceStaticFactors,
} from '@/types/musculoskeletal'

// ==========================================
// 손/손목 점수 계산
// ==========================================

/**
 * 손/손목 자세 점수 계산
 * 엑셀 수식: =IF(B13<15,1,IF(B13<45,2,3)) 등
 */
export function calculateHandWristPostureScore(angles: HandWristAngles): number {
  // 굴곡 점수 (0-3)
  const flexionScore = angles.flexion < 15 ? 1 : angles.flexion < 45 ? 2 : 3

  // 신전 점수 (0-3)
  const extensionScore = angles.extension < 15 ? 1 : angles.extension < 45 ? 2 : 3

  // 내전 점수 (0-2)
  const adductionScore = angles.adduction < 15 ? 0 : angles.adduction < 30 ? 1 : 2

  // 외전 점수 (0-2)
  const abductionScore = angles.abduction < 15 ? 0 : angles.abduction < 30 ? 1 : 2

  // 기본 자세 점수 = 굴곡/신전 중 최대 + 내전/외전 중 최대
  // 최대 5점
  const baseScore = Math.max(flexionScore, extensionScore)
  const rotationScore = Math.max(adductionScore, abductionScore)

  return Math.min(baseScore + rotationScore, 5)
}

/**
 * 손/손목 부가점수 계산
 */
export function calculateHandWristAdditionalScore(factors: HandWristFactors): number {
  let score = 0

  if (factors.toolOver1kg) score += 1
  if (factors.toolOver2kg) score += 1
  if (factors.toolVibration) score += 1
  if (factors.fingerGrip) score += 1
  if (factors.excessiveExtension) score += 1
  if (factors.contactPressure) score += 1
  if (factors.slipperyGlove) score += 1
  if (factors.hammerUse) score += 1

  return score
}

// ==========================================
// 팔꿈치/아래팔 점수 계산
// ==========================================

/**
 * 팔꿈치 자세 점수 계산
 * 엑셀 수식: =IF(OR(B22<=30,B22>=120),3,IF(OR(AND((B22>30),(B22<60)),AND((B22>90),(B22<120))),2,1))
 */
export function calculateElbowPostureScore(angles: ElbowAngles): number {
  // 굴곡 점수 (1-3)
  let flexionScore: number
  if (angles.flexion <= 30 || angles.flexion >= 120) {
    flexionScore = 3
  } else if ((angles.flexion > 30 && angles.flexion < 60) || (angles.flexion > 90 && angles.flexion < 120)) {
    flexionScore = 2
  } else {
    flexionScore = 1 // 60-90도 (최적 범위)
  }

  // 회내전 점수 (0-2)
  const pronationScore = angles.pronation < 60 ? 0 : angles.pronation < 80 ? 1 : 2

  // 회외전 점수 (0-2)
  const supinationScore = angles.supination < 60 ? 0 : angles.supination < 80 ? 1 : 2

  const rotationScore = Math.max(pronationScore, supinationScore)

  return Math.min(flexionScore + rotationScore, 5)
}

/**
 * 팔꿈치 부가점수 계산
 */
export function calculateElbowAdditionalScore(factors: ElbowFactors): number {
  let score = 0

  if (factors.toolOver1kg) score += 1
  if (factors.toolVibration) score += 1
  if (factors.heavyWristRotation) score += 1
  if (factors.elbowPressure) score += 1
  if (factors.pushPull) score += 1
  if (factors.hammerWork) score += 1

  return score
}

// ==========================================
// 어깨/위팔 점수 계산
// ==========================================

/**
 * 어깨/위팔 자세 점수 계산
 * 복잡한 다중 각도 평가
 */
export function calculateShoulderPostureScore(angles: ShoulderAngles): number {
  // 중립 점수 (0 또는 1)
  const neutralScore = angles.neutral > -5 && angles.neutral < 5 ? 1 : 0

  // 굴곡 점수 (0-3)
  let flexionScore: number
  if (angles.flexion < 5) {
    flexionScore = 0
  } else if (angles.flexion < 45) {
    flexionScore = 1
  } else if (angles.flexion < 90) {
    flexionScore = 2
  } else {
    flexionScore = 3
  }

  // 신전 점수 (0-3)
  let extensionScore: number
  if (angles.extension === 0) {
    extensionScore = 0
  } else if (angles.extension < 20) {
    extensionScore = 2
  } else {
    extensionScore = 3
  }

  // 외전 점수 (0-2)
  const abductionScore = angles.abduction < 30 ? 0 : angles.abduction < 45 ? 1 : 2

  // 내전 점수 (0-2)
  const adductionScore = angles.adduction < 10 ? 0 : angles.adduction < 30 ? 1 : 2

  // 외회전 점수 (0-2)
  const externalRotScore = angles.externalRotation < 10 ? 0 : angles.externalRotation < 30 ? 1 : 2

  // 내회전 점수 (0-2)
  const internalRotScore = angles.internalRotation < 10 ? 0 : angles.internalRotation < 30 ? 1 : 2

  // 기본 자세 점수 계산
  const mainScore = neutralScore > 0 ? neutralScore : Math.max(flexionScore, extensionScore)
  const rotationScore = Math.max(abductionScore, adductionScore, externalRotScore, internalRotScore)

  return Math.min(mainScore + rotationScore, 5)
}

/**
 * 어깨/위팔 부가점수 계산
 */
export function calculateShoulderAdditionalScore(factors: ShoulderFactors): number {
  let score = 0

  if (factors.toolOver1kg) score += 1
  if (factors.toolVibration) score += 1
  if (factors.contactPressure) score += 1
  if (factors.excessiveExtension) score += 1
  if (factors.shoulderRaised) score += 1
  if (factors.bendAndReach) score += 1
  if (factors.lyingPosition) score += 1
  if (factors.shoulderCarry) score += 1
  if (factors.heavyLift) score += 1
  if (factors.heavyCarry) score += 1
  if (factors.heavyPushPull) score += 1

  return score
}

// ==========================================
// 목 점수 계산
// ==========================================

/**
 * 목 자세 점수 계산
 */
export function calculateNeckPostureScore(angles: NeckAngles): number {
  // 중립 점수
  const neutralScore = angles.neutral < 5 ? 1 : 0

  // 굴곡 점수 (0-3)
  let flexionScore: number
  if (angles.flexion <= 5) {
    flexionScore = 0
  } else if (angles.flexion < 20) {
    flexionScore = 1
  } else if (angles.flexion < 45) {
    flexionScore = 2
  } else {
    flexionScore = 3
  }

  // 신전 점수 (0-3)
  let extensionScore: number
  if (angles.extension === 0) {
    extensionScore = 0
  } else if (angles.extension < 5) {
    extensionScore = 1
  } else if (angles.extension < 20) {
    extensionScore = 2
  } else {
    extensionScore = 3
  }

  // 회전 점수 (0-2)
  const rotationScore = angles.rotation < 20 ? 0 : angles.rotation < 45 ? 1 : 2

  // 측면기울임 점수 (0-2)
  const lateralScore = angles.lateralTilt < 10 ? 0 : angles.lateralTilt < 30 ? 1 : 2

  // 기본 자세 점수
  const mainScore = neutralScore > 0 ? neutralScore : Math.max(flexionScore, extensionScore)
  const addScore = Math.max(rotationScore, lateralScore)

  return Math.min(mainScore + addScore, 5)
}

/**
 * 목 부가점수 계산
 */
export function calculateNeckAdditionalScore(factors: NeckFactors): number {
  let score = 0

  if (factors.handsAboveShoulder) score += 1
  if (factors.bendAndReach) score += 1
  if (factors.confinedSpace) score += 1
  if (factors.shoulderCarry) score += 1
  if (factors.combinedMovement) score += 1
  if (factors.shoulderHeavyCarry) score += 1

  return score
}

// ==========================================
// 허리/고관절 점수 계산
// ==========================================

/**
 * 허리 자세 점수 계산
 */
export function calculateBackPostureScore(angles: BackAngles): number {
  // 굴곡 점수 (1-3)
  const flexionScore = angles.flexion < 20 ? 1 : angles.flexion < 45 ? 2 : 3

  // 신전 점수 (0-3)
  let extensionScore: number
  if (angles.extension === 0) {
    extensionScore = 0
  } else if (angles.extension < 30) {
    extensionScore = 2
  } else {
    extensionScore = 3
  }

  // 회전 점수 (0-2)
  const rotationScore = angles.rotation < 10 ? 0 : angles.rotation < 30 ? 1 : 2

  // 측면기울임 점수 (0-2)
  const lateralScore = angles.lateralTilt < 10 ? 0 : angles.lateralTilt < 30 ? 1 : 2

  const mainScore = Math.max(flexionScore, extensionScore)
  const addScore = Math.max(rotationScore, lateralScore)

  return Math.min(mainScore + addScore, 5)
}

/**
 * 허리 부가점수 계산
 */
export function calculateBackAdditionalScore(factors: BackFactors): number {
  let score = 0

  if (factors.wholeBodyVibration) score += 1
  if (factors.kneelSquat) score += 1
  if (factors.heavyOver5kg) score += 1
  if (factors.heavyOver10kg) score += 2
  if (factors.heavyOver20kg) score += 3
  if (factors.handsAboveShoulder) score += 1
  if (factors.bendAndReach) score += 1
  if (factors.backCarry) score += 1
  if (factors.combinedMovement) score += 1
  if (factors.poorSurface) score += 1

  return score
}

// ==========================================
// 무릎/발목 점수 계산
// ==========================================

/**
 * 무릎/발목 자세 점수 계산
 * 시간/횟수 기반
 */
export function calculateKneeAnklePostureScore(values: KneeAnkleValues): number {
  // 무릎꿇기/쪼그리기 점수 (0-3) - 시간 기반
  let kneelingScore: number
  if (values.kneelingTime < 0.5) {
    kneelingScore = 0
  } else if (values.kneelingTime < 1) {
    kneelingScore = 1
  } else if (values.kneelingTime < 2) {
    kneelingScore = 2
  } else {
    kneelingScore = 3
  }

  // 오르내리기 점수 (0-2) - 횟수 기반
  const climbingScore = values.climbingCount < 400 ? 0 : values.climbingCount < 1000 ? 1 : 2

  // 운전형태 점수 (0-2) - 시간 기반
  const drivingScore = values.drivingHours < 2 ? 0 : values.drivingHours < 4 ? 1 : 2

  // 걷기 점수 (0-2) - km 기반
  const walkingKm = values.walkingKm ?? 0
  const walkingScore = walkingKm < 2 ? 0 : walkingKm < 4 ? 1 : 2

  const addScore = Math.max(climbingScore, drivingScore, walkingScore)

  return Math.min(kneelingScore + addScore, 5)
}

/**
 * 무릎/발목 부가점수 계산
 */
export function calculateKneeAnkleAdditionalScore(factors: KneeAnkleFactors): number {
  let score = 0

  if (factors.kneeTwist) score += 1
  if (factors.confinedSpace) score += 1
  if (factors.heavyOver10kg) score += 1
  if (factors.heavyOver20kg) score += 2
  if (factors.unstableSurface) score += 1
  if (factors.kneePressure) score += 1

  return score
}

// ==========================================
// RULA 테이블 및 계산
// ==========================================

/**
 * RULA Table A - 상지 점수 (완전판)
 * 행: 상완 점수 (1-6)
 * 열: 전완(1-3) × 손목(1-4) × 비틀림(1-2) = 24열
 * 열 순서: F1W1T1, F1W1T2, F1W2T1, F1W2T2, F1W3T1, F1W3T2, F1W4T1, F1W4T2,
 *          F2W1T1, F2W1T2, F2W2T1, F2W2T2, F2W3T1, F2W3T2, F2W4T1, F2W4T2,
 *          F3W1T1, F3W1T2, F3W2T1, F3W2T2, F3W3T1, F3W3T2, F3W4T1, F3W4T2
 */
export const RULA_TABLE_A: number[][] = [
  // 상완 1
  [1, 2, 2, 2, 2, 3, 3, 3,  2, 2, 2, 2, 3, 3, 3, 3,  2, 3, 3, 3, 3, 3, 4, 4],
  // 상완 2
  [2, 3, 3, 3, 3, 4, 4, 4,  3, 3, 3, 3, 3, 4, 4, 4,  3, 4, 4, 4, 4, 4, 5, 5],
  // 상완 3
  [3, 3, 4, 4, 4, 4, 5, 5,  3, 4, 4, 4, 4, 4, 5, 5,  4, 4, 4, 4, 4, 5, 5, 5],
  // 상완 4
  [4, 4, 4, 4, 4, 5, 5, 5,  4, 4, 4, 4, 4, 5, 5, 5,  4, 4, 4, 5, 5, 5, 6, 6],
  // 상완 5
  [5, 5, 5, 5, 5, 6, 6, 7,  5, 6, 6, 6, 6, 7, 7, 7,  6, 6, 6, 7, 7, 7, 7, 8],
  // 상완 6
  [7, 7, 7, 7, 7, 8, 8, 9,  8, 8, 8, 8, 8, 9, 9, 9,  9, 9, 9, 9, 9, 9, 9, 9],
]

/**
 * RULA Table B - 목/몸통/다리 점수 (완전판)
 * 행: 목(1-6) × 몸통(1-6) = 36행
 * 열: 다리(1-2) = 2열
 */
export const RULA_TABLE_B: number[][] = [
  // 목1
  [1, 3], [2, 3], [3, 4], [5, 5], [6, 6], [7, 7],
  // 목2
  [2, 3], [2, 3], [4, 5], [5, 5], [6, 7], [7, 7],
  // 목3
  [3, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 7],
  // 목4
  [5, 5], [5, 6], [6, 6], [7, 7], [7, 7], [8, 8],
  // 목5
  [7, 7], [7, 7], [7, 8], [8, 8], [8, 8], [8, 8],
  // 목6
  [8, 8], [8, 8], [8, 8], [8, 9], [9, 9], [9, 9],
]

/**
 * RULA Table C - 최종 점수
 * 행: Score C (1-8+), 열: Score D (1-7+)
 */
export const RULA_TABLE_C: number[][] = [
  [1, 2, 3, 3, 4, 5, 5],   // Score C = 1
  [2, 2, 3, 4, 4, 5, 5],   // Score C = 2
  [3, 3, 3, 4, 4, 5, 6],   // Score C = 3
  [3, 3, 3, 4, 5, 6, 6],   // Score C = 4
  [4, 4, 4, 5, 6, 7, 7],   // Score C = 5
  [4, 4, 5, 6, 6, 7, 7],   // Score C = 6
  [5, 5, 6, 6, 7, 7, 7],   // Score C = 7
  [5, 5, 6, 7, 7, 7, 7],   // Score C = 8+
]

export interface RULAInputs {
  upperArmScore: number      // 상완 점수 (1-6)
  forearmScore: number       // 전완 점수 (1-3)
  wristScore: number         // 손목 점수 (1-4)
  wristTwist: number         // 손목 비틀림 (1-2)
  muscleUseA: boolean        // 상지 근육 사용
  forceLoadA: number         // 상지 힘/부하 (0-3)

  neckScore: number          // 목 점수 (1-6)
  trunkScore: number         // 몸통 점수 (1-6)
  legScore: number           // 다리 점수 (1-2)
  muscleUseB: boolean        // 하체 근육 사용
  forceLoadB: number         // 하체 힘/부하 (0-3)
}

/**
 * RULA Table A 조회
 */
export function lookupRulaTableA(upperArm: number, forearm: number, wrist: number, twist: number): number {
  const row = Math.min(Math.max(upperArm, 1), 6) - 1
  const col = (Math.min(Math.max(forearm, 1), 3) - 1) * 8 +
              (Math.min(Math.max(wrist, 1), 4) - 1) * 2 +
              (Math.min(Math.max(twist, 1), 2) - 1)
  return RULA_TABLE_A[row]?.[col] ?? 1
}

/**
 * RULA Table B 조회
 */
export function lookupRulaTableB(neck: number, trunk: number, leg: number): number {
  const row = (Math.min(Math.max(neck, 1), 6) - 1) * 6 +
              (Math.min(Math.max(trunk, 1), 6) - 1)
  const col = Math.min(Math.max(leg, 1), 2) - 1
  return RULA_TABLE_B[row]?.[col] ?? 1
}

/**
 * RULA 점수 계산
 */
export function calculateRULA(inputs: RULAInputs): { score: number; level: string; scoreC: number; scoreD: number; tableAScore: number; tableBScore: number } {
  // Table A 조회
  const tableAScore = lookupRulaTableA(
    inputs.upperArmScore, inputs.forearmScore,
    inputs.wristScore, inputs.wristTwist
  )

  // Score C = Table A + 근육사용 + 힘/부하
  let scoreC = tableAScore
  if (inputs.muscleUseA) scoreC += 1
  scoreC += inputs.forceLoadA

  // Table B 조회
  const tableBScore = lookupRulaTableB(
    inputs.neckScore, inputs.trunkScore, inputs.legScore
  )

  // Score D = Table B + 근육사용 + 힘/부하
  let scoreD = tableBScore
  if (inputs.muscleUseB) scoreD += 1
  scoreD += inputs.forceLoadB

  // Table C 조회
  const rowIdx = Math.min(Math.max(scoreC, 1), 8) - 1
  const colIdx = Math.min(Math.max(scoreD, 1), 7) - 1
  const finalScore = RULA_TABLE_C[rowIdx]?.[colIdx] ?? 1

  // 부하수준 판정 (1-4)
  let level: string
  if (finalScore <= 2) {
    level = '부하수준 1'
  } else if (finalScore <= 4) {
    level = '부하수준 2'
  } else if (finalScore <= 6) {
    level = '부하수준 3'
  } else {
    level = '부하수준 4'
  }

  return { score: finalScore, level, scoreC, scoreD, tableAScore, tableBScore }
}

// ==========================================
// REBA 테이블 및 계산
// ==========================================

/**
 * REBA Table A - 목/몸통/다리 (완전판)
 * 행: 목(1-3) × 몸통(1-5) = 15행
 * 열: 다리(1-4) = 4열
 */
export const REBA_TABLE_A: number[][] = [
  // 목1
  [1, 2, 3, 4], [2, 3, 4, 5], [2, 4, 5, 6], [3, 5, 6, 7], [4, 6, 7, 8],
  // 목2
  [1, 3, 4, 5], [2, 4, 5, 6], [3, 5, 6, 7], [4, 6, 7, 8], [5, 7, 8, 9],
  // 목3
  [3, 4, 5, 6], [4, 5, 6, 7], [5, 6, 7, 8], [6, 7, 8, 9], [7, 8, 9, 9],
]

/**
 * REBA Table B - 상완/전완/손목 (완전판)
 * 행: 상완(1-6) × 전완(1-2) = 12행
 * 열: 손목(1-3) = 3열
 */
export const REBA_TABLE_B: number[][] = [
  // 상완1
  [1, 2, 2], [1, 2, 3],
  // 상완2
  [1, 2, 3], [2, 3, 4],
  // 상완3
  [3, 4, 5], [4, 5, 5],
  // 상완4
  [4, 5, 5], [5, 6, 7],
  // 상완5
  [6, 7, 8], [7, 8, 8],
  // 상완6
  [7, 8, 8], [8, 9, 9],
]

/**
 * REBA Table C - 최종 점수
 * 행: Score A (1-12), 열: Score B (1-12)
 */
export const REBA_TABLE_C: number[][] = [
  [1, 1, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7],     // Score A = 1
  [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8],     // Score A = 2
  [2, 3, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8],     // Score A = 3
  [3, 4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9],     // Score A = 4
  [4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9],     // Score A = 5
  [6, 6, 6, 7, 8, 8, 9, 9, 10, 10, 10, 10], // Score A = 6
  [7, 7, 7, 8, 9, 9, 9, 10, 10, 11, 11, 11], // Score A = 7
  [8, 8, 8, 9, 10, 10, 10, 10, 10, 11, 11, 11], // Score A = 8
  [9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12], // Score A = 9
  [10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12], // Score A = 10
  [11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12], // Score A = 11
  [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12], // Score A = 12
]

export interface REBAInputs {
  neckScore: number          // 목 점수 (1-3)
  trunkScore: number         // 몸통 점수 (1-5)
  legScore: number           // 다리 점수 (1-4)
  forceLoadA: number         // 힘/부하 A (0-3)

  upperArmScore: number      // 상완 점수 (1-6)
  forearmScore: number       // 전완 점수 (1-2)
  wristScore: number         // 손목 점수 (1-3)
  couplingScore: number      // 커플링 (0-3)

  activityScore?: number     // 활동점수 (0-3)
}

/**
 * REBA Table A 조회
 */
export function lookupRebaTableA(neck: number, trunk: number, leg: number): number {
  const row = (Math.min(Math.max(neck, 1), 3) - 1) * 5 +
              (Math.min(Math.max(trunk, 1), 5) - 1)
  const col = Math.min(Math.max(leg, 1), 4) - 1
  return REBA_TABLE_A[row]?.[col] ?? 1
}

/**
 * REBA Table B 조회
 */
export function lookupRebaTableB(upperArm: number, forearm: number, wrist: number): number {
  const row = (Math.min(Math.max(upperArm, 1), 6) - 1) * 2 +
              (Math.min(Math.max(forearm, 1), 2) - 1)
  const col = Math.min(Math.max(wrist, 1), 3) - 1
  return REBA_TABLE_B[row]?.[col] ?? 1
}

/**
 * REBA 점수 계산
 */
export function calculateREBA(inputs: REBAInputs): { score: number; level: string; scoreA: number; scoreB: number; tableAScore: number; tableBScore: number; tableCScore: number } {
  // Table A 조회
  const tableAScore = lookupRebaTableA(
    inputs.neckScore, inputs.trunkScore, inputs.legScore
  )
  const scoreA = tableAScore + inputs.forceLoadA

  // Table B 조회
  const tableBScore = lookupRebaTableB(
    inputs.upperArmScore, inputs.forearmScore, inputs.wristScore
  )
  const scoreB = tableBScore + inputs.couplingScore

  // Table C 조회
  const rowIdx = Math.min(Math.max(scoreA, 1), 12) - 1
  const colIdx = Math.min(Math.max(scoreB, 1), 12) - 1
  const tableCScore = REBA_TABLE_C[rowIdx]?.[colIdx] ?? 1

  // 활동점수 추가
  const activityScore = inputs.activityScore ?? 0
  const finalScore = tableCScore + activityScore

  // 조치단계 판정 (0-4)
  let level: string
  if (finalScore === 1) {
    level = '조치단계 0'
  } else if (finalScore <= 3) {
    level = '조치단계 1'
  } else if (finalScore <= 7) {
    level = '조치단계 2'
  } else if (finalScore <= 10) {
    level = '조치단계 3'
  } else {
    level = '조치단계 4'
  }

  return { score: finalScore, level, scoreA, scoreB, tableAScore, tableBScore, tableCScore }
}

// ==========================================
// Sheet 2 각도 → RULA/REBA 신체부위 점수 변환
// ==========================================

/**
 * RULA 상완 점수 (Sheet 2 SHOULDER_ARM 각도에서 자동 계산)
 * 20° extension ~ 20° flexion → 1, 20°+ extension 또는 20-45° flexion → 2,
 * 45-90° flexion → 3, 90°+ flexion → 4
 */
export function rulaUpperArmFromAngles(angles: ShoulderAngles): { base: number; abducted: boolean } {
  let base: number
  const mainAngle = Math.max(angles.flexion, angles.extension)
  if (angles.extension > 20) {
    base = 2
  } else if (angles.flexion <= 20) {
    base = 1
  } else if (angles.flexion <= 45) {
    base = 2
  } else if (angles.flexion <= 90) {
    base = 3
  } else {
    base = 4
  }
  const abducted = angles.abduction > 0 || angles.adduction > 30
  return { base, abducted }
}

/**
 * RULA 전완 점수 (Sheet 2 ELBOW_FOREARM 각도에서)
 * 60-100° flexion → 1, else → 2
 */
export function rulaLowerArmFromAngles(angles: ElbowAngles): number {
  if (angles.flexion >= 60 && angles.flexion <= 100) return 1
  return 2
}

/**
 * RULA 손목 점수 (Sheet 2 HAND_WRIST 각도에서)
 * neutral(0°) → 1, 0-15° flex/ext → 2, 15°+ → 3
 */
export function rulaWristFromAngles(angles: HandWristAngles): { base: number; deviation: boolean } {
  const mainAngle = Math.max(angles.flexion, angles.extension)
  let base: number
  if (mainAngle === 0) {
    base = 1
  } else if (mainAngle <= 15) {
    base = 2
  } else {
    base = 3
  }
  const deviation = angles.adduction > 0 || angles.abduction > 0
  return { base, deviation }
}

/**
 * RULA 목 점수 (Sheet 2 NECK 각도에서)
 * 0-10° flex → 1, 10-20° → 2, 20°+ → 3, extension → 4
 */
export function rulaNeckFromAngles(angles: NeckAngles): { base: number; twist: boolean; sideBend: boolean } {
  let base: number
  if (angles.extension > 0) {
    base = 4
  } else if (angles.flexion <= 10) {
    base = 1
  } else if (angles.flexion <= 20) {
    base = 2
  } else {
    base = 3
  }
  const twist = angles.rotation > 0
  const sideBend = angles.lateralTilt > 0
  return { base, twist, sideBend }
}

/**
 * RULA 몸통 점수 (Sheet 2 BACK_HIP 각도에서)
 * 0° → 1, 0-20° flex → 2, 20-60° → 3, 60°+ → 4
 */
export function rulaTrunkFromAngles(angles: BackAngles): { base: number; twist: boolean; sideBend: boolean } {
  let base: number
  if (angles.flexion === 0 && angles.extension === 0) {
    base = 1
  } else if (angles.flexion <= 20) {
    base = 2
  } else if (angles.flexion <= 60) {
    base = 3
  } else {
    base = 4
  }
  const twist = angles.rotation > 0
  const sideBend = angles.lateralTilt > 0
  return { base, twist, sideBend }
}

/**
 * REBA 목 점수 (Sheet 2 NECK 각도에서)
 * 0-20° flexion → 1, 20°+ flexion 또는 extension → 2
 */
export function rebaNeckFromAngles(angles: NeckAngles): { base: number; twist: boolean; sideBend: boolean } {
  let base: number
  if (angles.extension > 0) {
    base = 2
  } else if (angles.flexion <= 20) {
    base = 1
  } else {
    base = 2
  }
  const twist = angles.rotation > 0
  const sideBend = angles.lateralTilt > 0
  return { base, twist, sideBend }
}

/**
 * REBA 몸통 점수 (Sheet 2 BACK_HIP 각도에서)
 * 0° → 1, 0-20° flex/ext → 2, 20-60° flex 또는 20°+ ext → 3, 60°+ flex → 4
 */
export function rebaTrunkFromAngles(angles: BackAngles): { base: number; twist: boolean; sideBend: boolean } {
  let base: number
  if (angles.flexion === 0 && angles.extension === 0) {
    base = 1
  } else if (angles.extension > 20 || angles.flexion > 60) {
    if (angles.flexion > 60) base = 4
    else base = 3
  } else if (angles.flexion > 20 || angles.extension > 0) {
    base = 3
  } else {
    base = 2
  }
  const twist = angles.rotation > 0
  const sideBend = angles.lateralTilt > 0
  return { base, twist, sideBend }
}

/**
 * REBA 상완 점수 (Sheet 2 SHOULDER_ARM 각도에서)
 * 20° ext ~ 20° flex → 1, 20°+ ext 또는 20-45° flex → 2, 45-90° flex → 3, 90°+ → 4
 */
export function rebaUpperArmFromAngles(angles: ShoulderAngles): { base: number; abducted: boolean } {
  let base: number
  if (angles.extension > 20) {
    base = 2
  } else if (angles.flexion <= 20) {
    base = 1
  } else if (angles.flexion <= 45) {
    base = 2
  } else if (angles.flexion <= 90) {
    base = 3
  } else {
    base = 4
  }
  const abducted = angles.abduction > 0 || angles.adduction > 30
  return { base, abducted }
}

/**
 * REBA 전완 점수 (Sheet 2 ELBOW_FOREARM 각도에서)
 * 60-100° flexion → 1, else → 2
 */
export function rebaLowerArmFromAngles(angles: ElbowAngles): number {
  if (angles.flexion >= 60 && angles.flexion <= 100) return 1
  return 2
}

/**
 * REBA 손목 점수 (Sheet 2 HAND_WRIST 각도에서)
 * 0-15° flex/ext → 1, 15°+ → 2
 */
export function rebaWristFromAngles(angles: HandWristAngles): { base: number; twist: boolean } {
  const mainAngle = Math.max(angles.flexion, angles.extension)
  const base = mainAngle <= 15 ? 1 : 2
  const twist = angles.adduction > 0 || angles.abduction > 0
  return { base, twist }
}

// ==========================================
// Push-Pull 평가
// ==========================================

/**
 * 밀고당기기 - 팔 평가
 */
export function evaluatePushPullArm(forceKgf: number): string {
  if (forceKgf === 0) return '없음'
  if (forceKgf < 9) return '안전'
  if (forceKgf < 14.5) return '보통'
  if (forceKgf < 23) return '위험'
  return '고위험'
}

/**
 * 밀고당기기 - 손 평가
 */
export function evaluatePushPullHand(forceKgf: number): string {
  if (forceKgf === 0) return '없음'
  if (forceKgf < 5) return '안전'
  return '위험'
}

/**
 * 밀고당기기 - 손가락 평가
 */
export function evaluatePushPullFinger(forceKgf: number): string {
  if (forceKgf === 0) return '없음'
  if (forceKgf < 1) return '안전'
  return '위험'
}

/**
 * 밀고당기기 부위별 평가
 */
export function evaluatePushPull(forceKgf: number, bodyPart: 'arm' | 'hand' | 'finger'): string {
  if (bodyPart === 'arm') return evaluatePushPullArm(forceKgf)
  if (bodyPart === 'hand') return evaluatePushPullHand(forceKgf)
  return evaluatePushPullFinger(forceKgf)
}

// ==========================================
// 힘 점수 / 정적·반복 점수 계산
// ==========================================

/**
 * 힘 점수 계산 (0 또는 1)
 */
export function calculateForceScore(forceChecked: boolean): number {
  return forceChecked ? 1 : 0
}

/**
 * 정적/반복 점수 계산 (최대 1점)
 * 하나 이상 체크시 1점
 */
export function calculateStaticRepetitionScore(
  staticOver1min: boolean,
  repetitionChecked: boolean
): number {
  return (staticOver1min || repetitionChecked) ? 1 : 0
}

// ==========================================
// 종합 점수 계산
// ==========================================

/**
 * 부위별 총점 계산 (힘/정적·반복 포함)
 */
export function calculateTotalScore(
  postureScore: number,
  additionalScore: number,
  forceScore: number = 0,
  staticRepetitionScore: number = 0
): number {
  // 총점은 최대 7점
  return Math.min(postureScore + additionalScore + forceScore + staticRepetitionScore, 7)
}

/**
 * 관리 단계 판정
 */
export function determineManagementLevel(maxScore: number): string {
  if (maxScore >= 7) return 'HIGH'         // 상
  if (maxScore >= 5) return 'MEDIUM_HIGH'  // 중상
  if (maxScore >= 3) return 'MEDIUM'       // 중
  return 'LOW'                              // 하
}
