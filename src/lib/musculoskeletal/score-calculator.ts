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
 * RULA Table A - 상지 점수
 * 행: 상완 점수 (1-6), 열: 전완 점수 x 손목 점수 x 비틀림
 */
export const RULA_TABLE_A: number[][] = [
  // 전완 1, 손목1비1  손목1비2  손목2비1  손목2비2  손목3비1  손목3비2  손목4비1  손목4비2
  //        전완 2, ...
  //        전완 3, ...
  [1, 2, 2, 2, 2, 3, 3, 3],   // 상완 1
  [2, 2, 2, 2, 3, 3, 3, 3],   // 상완 2
  [2, 3, 3, 3, 3, 3, 4, 4],   // 상완 3
  [2, 3, 3, 3, 3, 4, 4, 4],   // 상완 4
  [3, 3, 3, 4, 4, 4, 5, 5],   // 상완 5
  [3, 4, 4, 4, 4, 4, 5, 5],   // 상완 6
]

/**
 * RULA Table B - 목, 몸통, 다리 점수
 */
export const RULA_TABLE_B: number[][] = [
  // 다리 1  다리 2
  [1, 3],   // 목1, 몸통1
  [2, 3],   // 목1, 몸통2
  [3, 4],   // 목1, 몸통3
  [5, 5],   // 목1, 몸통4
  [6, 6],   // 목1, 몸통5
  [7, 7],   // 목1, 몸통6
  // ... 나머지 행들
]

/**
 * RULA Table C - 최종 점수
 * 행: 팔/손목 점수 (1-8), 열: 목/몸통/다리 점수 (1-7)
 */
export const RULA_TABLE_C: number[][] = [
  [1, 2, 3, 3, 4, 5, 5],   // A 점수 1
  [2, 2, 3, 4, 4, 5, 5],   // A 점수 2
  [3, 3, 3, 4, 4, 5, 6],   // A 점수 3
  [3, 3, 3, 4, 5, 6, 6],   // A 점수 4
  [4, 4, 4, 5, 6, 7, 7],   // A 점수 5
  [4, 4, 5, 6, 6, 7, 7],   // A 점수 6
  [5, 5, 6, 6, 7, 7, 7],   // A 점수 7
  [5, 5, 6, 7, 7, 7, 7],   // A 점수 8+
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
 * RULA 점수 계산
 */
export function calculateRULA(inputs: RULAInputs): { score: number; level: string } {
  // Table A 조회 (단순화)
  const upperArmIdx = Math.min(inputs.upperArmScore - 1, 5)
  const wristIdx = (inputs.forearmScore - 1) * 2 + (inputs.wristScore - 1) + (inputs.wristTwist - 1)
  const tableAScore = RULA_TABLE_A[upperArmIdx]?.[Math.min(wristIdx, 7)] ?? 1

  // 근육 사용 및 힘/부하 추가
  let scoreA = tableAScore
  if (inputs.muscleUseA) scoreA += 1
  scoreA += inputs.forceLoadA

  // Table B 조회 (단순화)
  const neckIdx = Math.min(inputs.neckScore - 1, 5)
  const trunkIdx = Math.min(inputs.trunkScore - 1, 5)
  const legIdx = Math.min(inputs.legScore - 1, 1)

  // 간단한 계산 (실제 테이블은 더 복잡)
  let tableBScore = neckIdx + trunkIdx + 1
  tableBScore = Math.min(tableBScore, 7)

  let scoreB = tableBScore
  if (inputs.muscleUseB) scoreB += 1
  scoreB += inputs.forceLoadB

  // Table C 조회
  const rowIdx = Math.min(scoreA - 1, 7)
  const colIdx = Math.min(scoreB - 1, 6)
  const finalScore = RULA_TABLE_C[rowIdx]?.[colIdx] ?? 1

  // 레벨 판정
  let level: string
  if (finalScore <= 2) {
    level = '안전'
  } else if (finalScore <= 4) {
    level = '보통'
  } else if (finalScore <= 6) {
    level = '위험'
  } else {
    level = '고위험'
  }

  return { score: finalScore, level }
}

// ==========================================
// REBA 테이블 및 계산
// ==========================================

/**
 * REBA Table A - 목/몸통/다리
 */
export const REBA_TABLE_A: number[][] = [
  // 다리 1   다리 2   다리 3   다리 4
  [1, 2, 3, 4],   // 목1, 몸통1
  [2, 3, 4, 5],   // 목1, 몸통2
  [2, 4, 5, 6],   // 목1, 몸통3
  [3, 5, 6, 7],   // 목1, 몸통4
  [4, 6, 7, 8],   // 목1, 몸통5
  // ... (단순화)
]

/**
 * REBA Table B - 상완/전완/손목
 */
export const REBA_TABLE_B: number[][] = [
  // 손목 1   손목 2   손목 3
  [1, 2, 2],   // 상완1, 전완1
  [1, 2, 3],   // 상완1, 전완2
  [3, 4, 5],   // 상완2, 전완1
  [4, 5, 5],   // 상완2, 전완2
  // ... (단순화)
]

/**
 * REBA Table C - 최종 점수
 */
export const REBA_TABLE_C: number[][] = [
  [1, 1, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7],   // B점수 1
  [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8],   // B점수 2
  [2, 3, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8],   // B점수 3
  [3, 4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9],   // B점수 4
  [4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9],   // B점수 5
  [6, 6, 6, 7, 8, 8, 9, 9, 10, 10, 10, 10], // B점수 6
  [7, 7, 7, 8, 9, 9, 9, 10, 10, 11, 11, 11], // B점수 7
  [8, 8, 8, 9, 10, 10, 10, 10, 10, 11, 11, 11], // B점수 8
  [9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12], // B점수 9
  [10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12], // B점수 10
  [11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12], // B점수 11
  [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12], // B점수 12
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
}

/**
 * REBA 점수 계산
 */
export function calculateREBA(inputs: REBAInputs): { score: number; level: string } {
  // Table A 점수 (목, 몸통, 다리 조합)
  const neckIdx = Math.min(inputs.neckScore - 1, 2)
  const trunkIdx = Math.min(inputs.trunkScore - 1, 4)
  const legIdx = Math.min(inputs.legScore - 1, 3)

  // 단순화된 계산
  let tableAScore = neckIdx + trunkIdx + legIdx + 1
  tableAScore = Math.min(tableAScore, 12)

  let scoreA = tableAScore + inputs.forceLoadA

  // Table B 점수 (상완, 전완, 손목 조합)
  const upperArmIdx = Math.min(inputs.upperArmScore - 1, 5)
  const forearmIdx = Math.min(inputs.forearmScore - 1, 1)
  const wristIdx = Math.min(inputs.wristScore - 1, 2)

  let tableBScore = upperArmIdx + forearmIdx + wristIdx + 1
  tableBScore = Math.min(tableBScore, 12)

  let scoreB = tableBScore + inputs.couplingScore

  // Table C 조회
  const rowIdx = Math.min(scoreA - 1, 11)
  const colIdx = Math.min(scoreB - 1, 11)
  const finalScore = REBA_TABLE_C[rowIdx]?.[colIdx] ?? 1

  // 레벨 판정
  let level: string
  if (finalScore <= 3) {
    level = '안전'
  } else if (finalScore <= 7) {
    level = '보통'
  } else if (finalScore <= 10) {
    level = '위험'
  } else {
    level = '고위험'
  }

  return { score: finalScore, level }
}

// ==========================================
// Push-Pull 평가
// ==========================================

/**
 * 밀고당기기 - 팔 평가
 * 엑셀 수식: =IF(I12=0,"없음",IF(I12<9,"안전",IF(I12<14.5,"보통",IF(I12<23,"위험","고위험"))))
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
 * 엑셀 수식: =IF(K12=0,"없음",IF(K12<5,"안전","위험"))
 */
export function evaluatePushPullHand(forceKgf: number): string {
  if (forceKgf === 0) return '없음'
  if (forceKgf < 5) return '안전'
  return '위험'
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
