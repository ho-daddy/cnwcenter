/**
 * BodyPartScore 일괄 재계산 스크립트
 *
 * 점수 계산 로직 보정(MAX→SUM 상한2, 어깨/목 중립버그, 5점캡 제거, 팔꿈치 임계,
 * 무릎 jumpDown 추가)을 기존 입력값에 일괄 적용한다.
 *
 * 사용법:
 *   npx tsx scripts/recalc-body-part-scores.ts            # dry-run (변경사항만 출력)
 *   npx tsx scripts/recalc-body-part-scores.ts --apply    # 실제 update 실행
 *
 * 참고: BodyPartScore.angles, additionalFactors는 JSON이며 입력값(원본)은 그대로 유지.
 *       postureScore / additionalScore / totalScore 세 컬럼만 재계산.
 */

import { PrismaClient } from '@prisma/client'
import {
  calculateHandWristPostureScore, calculateHandWristAdditionalScore,
  calculateElbowPostureScore, calculateElbowAdditionalScore,
  calculateShoulderPostureScore, calculateShoulderAdditionalScore,
  calculateNeckPostureScore, calculateNeckAdditionalScore,
  calculateBackPostureScore, calculateBackAdditionalScore,
  calculateKneeAnklePostureScore, calculateKneeAnkleAdditionalScore,
  calculateForceScore, calculateStaticRepetitionScore, calculateTotalScore,
} from '../src/lib/musculoskeletal/score-calculator'
import type {
  HandWristAngles, HandWristFactors,
  ElbowAngles, ElbowFactors,
  ShoulderAngles, ShoulderFactors,
  NeckAngles, NeckFactors,
  BackAngles, BackFactors,
  KneeAnkleValues, KneeAnkleFactors,
} from '../src/types/musculoskeletal'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

interface ForceStatic {
  forceChecked?: boolean
  staticOver1min?: boolean
  repetitionChecked?: boolean
}

// 부위별 각도 필드 기본값 — angles JSON에서 누락된 키를 0으로 채움.
// (점수 함수가 undefined를 NaN 비교로 잘못 해석해 점수가 부풀려지는 것을 방지)
const DEFAULT_ANGLES: Record<string, Record<string, number>> = {
  HAND_WRIST: { flexion: 0, extension: 0, adduction: 0, abduction: 0 },
  ELBOW_FOREARM: { flexion: 0, pronation: 0, supination: 0 },
  SHOULDER_ARM: { neutral: 0, flexion: 0, extension: 0, abduction: 0, adduction: 0, externalRotation: 0, internalRotation: 0 },
  NECK: { neutral: 0, flexion: 0, extension: 0, rotation: 0, lateralTilt: 0 },
  BACK_HIP: { flexion: 0, extension: 0, rotation: 0, lateralTilt: 0 },
  KNEE_ANKLE: { kneelingTime: 0, climbingCount: 0, drivingHours: 0, walkingKm: 0 },
}

function normalizeAngles(bodyPart: string, raw: Record<string, unknown>): Record<string, number> {
  const defaults = DEFAULT_ANGLES[bodyPart] || {}
  const merged: Record<string, number> = { ...defaults }
  for (const k of Object.keys(defaults)) {
    const v = raw[k]
    const n = Number(v)
    merged[k] = Number.isFinite(n) ? n : 0
  }
  return merged
}

function recompute(
  bodyPart: string,
  rawAngles: Record<string, unknown>,
  additionalFactors: Record<string, unknown>,
): { posture: number; additional: number; total: number } {
  // additionalFactors 안에 _forceStatic 키가 있으면 분리, 나머지가 부가요인
  const { _forceStatic, ...pureFactors } = additionalFactors as { _forceStatic?: ForceStatic } & Record<string, unknown>
  const fs: ForceStatic = _forceStatic || {}
  const forceScore = calculateForceScore(!!fs.forceChecked)
  const staticRepScore = calculateStaticRepetitionScore(!!fs.staticOver1min, !!fs.repetitionChecked)

  const angles = normalizeAngles(bodyPart, rawAngles)
  let posture = 0
  let additional = 0

  switch (bodyPart) {
    case 'HAND_WRIST':
      posture = calculateHandWristPostureScore(angles as unknown as HandWristAngles)
      additional = calculateHandWristAdditionalScore(pureFactors as unknown as HandWristFactors)
      break
    case 'ELBOW_FOREARM':
      posture = calculateElbowPostureScore(angles as unknown as ElbowAngles)
      additional = calculateElbowAdditionalScore(pureFactors as unknown as ElbowFactors)
      break
    case 'SHOULDER_ARM':
      posture = calculateShoulderPostureScore(angles as unknown as ShoulderAngles)
      additional = calculateShoulderAdditionalScore(pureFactors as unknown as ShoulderFactors)
      break
    case 'NECK':
      posture = calculateNeckPostureScore(angles as unknown as NeckAngles)
      additional = calculateNeckAdditionalScore(pureFactors as unknown as NeckFactors)
      break
    case 'BACK_HIP':
      posture = calculateBackPostureScore(angles as unknown as BackAngles)
      additional = calculateBackAdditionalScore(pureFactors as unknown as BackFactors)
      break
    case 'KNEE_ANKLE':
      posture = calculateKneeAnklePostureScore(angles as unknown as KneeAnkleValues)
      additional = calculateKneeAnkleAdditionalScore(pureFactors as unknown as KneeAnkleFactors)
      break
    default:
      throw new Error(`unknown bodyPart: ${bodyPart}`)
  }

  const total = calculateTotalScore(posture, additional, forceScore, staticRepScore)
  return { posture, additional, total }
}

async function main() {
  console.log(`[모드] ${APPLY ? 'APPLY (실제 update)' : 'DRY-RUN (출력만)'}`)
  console.log('')

  const rows = await prisma.bodyPartScore.findMany({
    select: {
      id: true,
      bodyPart: true,
      angles: true,
      additionalFactors: true,
      postureScore: true,
      additionalScore: true,
      totalScore: true,
      elementWork: { select: { id: true, name: true } },
    },
  })

  console.log(`총 ${rows.length}건 BodyPartScore 조회`)

  type Diff = {
    id: string
    bodyPart: string
    work: string
    before: { posture: number; additional: number; total: number }
    after: { posture: number; additional: number; total: number }
  }
  const diffs: Diff[] = []
  let skipped = 0

  for (const row of rows) {
    if (!row.angles || !row.additionalFactors) {
      skipped++
      continue
    }
    try {
      const after = recompute(
        row.bodyPart,
        row.angles as Record<string, unknown>,
        row.additionalFactors as Record<string, unknown>,
      )
      const before = {
        posture: row.postureScore,
        additional: row.additionalScore,
        total: row.totalScore,
      }
      if (after.posture !== before.posture || after.additional !== before.additional || after.total !== before.total) {
        diffs.push({
          id: row.id,
          bodyPart: row.bodyPart,
          work: row.elementWork?.name ?? '?',
          before,
          after,
        })
      }
    } catch (e) {
      console.error(`✗ ${row.id} (${row.bodyPart}):`, e instanceof Error ? e.message : e)
    }
  }

  console.log(`변경 발생: ${diffs.length}건 / 입력값 없음 스킵: ${skipped}건`)
  console.log('')

  // 요약 출력
  const byPart = new Map<string, number>()
  const totalDeltas: number[] = []
  for (const d of diffs) {
    byPart.set(d.bodyPart, (byPart.get(d.bodyPart) ?? 0) + 1)
    totalDeltas.push(d.after.total - d.before.total)
  }
  console.log('=== 부위별 변경 건수 ===')
  for (const [bp, n] of byPart) console.log(`  ${bp}: ${n}건`)
  if (totalDeltas.length > 0) {
    const inc = totalDeltas.filter(d => d > 0).length
    const dec = totalDeltas.filter(d => d < 0).length
    const same = totalDeltas.filter(d => d === 0).length
    console.log(`총점: 상승 ${inc} / 하락 ${dec} / 동일 ${same}`)
  }
  console.log('')

  // 상위 20건 변경 출력
  console.log('=== 변경 내역 (최대 20건) ===')
  for (const d of diffs.slice(0, 20)) {
    console.log(
      `  [${d.bodyPart}] ${d.work} (${d.id.slice(0, 10)}…): ` +
      `자세 ${d.before.posture}→${d.after.posture}, 부가 ${d.before.additional}→${d.after.additional}, ` +
      `총 ${d.before.total}→${d.after.total}`
    )
  }
  if (diffs.length > 20) console.log(`  ... 외 ${diffs.length - 20}건`)
  console.log('')

  if (!APPLY) {
    console.log('DRY-RUN 종료. 실제 적용하려면 --apply 옵션을 붙여 다시 실행하세요.')
    return
  }

  // 실제 update — 트랜잭션
  console.log(`>>> ${diffs.length}건 업데이트 실행...`)
  await prisma.$transaction(
    diffs.map(d =>
      prisma.bodyPartScore.update({
        where: { id: d.id },
        data: {
          postureScore: d.after.posture,
          additionalScore: d.after.additional,
          totalScore: d.after.total,
        },
      })
    )
  )
  console.log(`✓ ${diffs.length}건 업데이트 완료`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
