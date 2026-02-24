'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  CheckCircle,
} from 'lucide-react'
import {
  getScoreLevel,
  SCORE_LEVEL_INFO,
  type HandWristAngles,
  type HandWristFactors,
  type ElbowAngles,
  type ElbowFactors,
  type ShoulderAngles,
  type ShoulderFactors,
  type NeckAngles,
  type NeckFactors,
  type BackAngles,
  type BackFactors,
  type KneeAnkleValues,
  type KneeAnkleFactors,
} from '@/types/musculoskeletal'
import {
  calculateHandWristPostureScore,
  calculateElbowPostureScore,
  calculateShoulderPostureScore,
  calculateNeckPostureScore,
  calculateBackPostureScore,
  calculateKneeAnklePostureScore,
  calculateHandWristAdditionalScore,
  calculateElbowAdditionalScore,
  calculateShoulderAdditionalScore,
  calculateNeckAdditionalScore,
  calculateBackAdditionalScore,
  calculateKneeAnkleAdditionalScore,
  calculateForceScore,
  calculateStaticRepetitionScore,
  calculateTotalScore,
} from '@/lib/musculoskeletal/score-calculator'

interface ElementWork {
  id: string
  name: string
  bodyPartScores: {
    bodyPart: string
    totalScore: number
  }[]
}

interface BodyPartScore {
  id: string
  bodyPart: string
  angles: Record<string, number> | null
  additionalFactors: Record<string, boolean> | null
  postureScore: number
  additionalScore: number
  totalScore: number
}

interface Sheet2ModalProps {
  isOpen: boolean
  onClose: () => void
  workplaceId: string
  assessmentId: string
  elementWork: ElementWork
  onSave: () => void
}

const BODY_PARTS = [
  { id: 'HAND_WRIST', name: '손/손목', icon: '✋' },
  { id: 'ELBOW_FOREARM', name: '팔꿈치/아래팔', icon: '💪' },
  { id: 'SHOULDER_ARM', name: '어깨/위팔', icon: '🦾' },
  { id: 'NECK', name: '목', icon: '🦒' },
  { id: 'BACK_HIP', name: '허리/고관절', icon: '🦴' },
  { id: 'KNEE_ANKLE', name: '무릎/발목', icon: '🦵' },
] as const

const DEFAULT_ANGLES: Record<string, Record<string, number>> = {
  HAND_WRIST: { flexion: 0, extension: 0, adduction: 0, abduction: 0 },
  ELBOW_FOREARM: { flexion: 60, pronation: 0, supination: 0 },
  SHOULDER_ARM: { neutral: 0, flexion: 0, extension: 0, abduction: 0, adduction: 0, externalRotation: 0, internalRotation: 0 },
  NECK: { neutral: 0, flexion: 0, extension: 0, rotation: 0, lateralTilt: 0 },
  BACK_HIP: { flexion: 0, extension: 0, rotation: 0, lateralTilt: 0 },
  KNEE_ANKLE: { kneelingTime: 0, climbingCount: 0, drivingHours: 0, walkingKm: 0 },
}

const DEFAULT_FACTORS: Record<string, Record<string, boolean>> = {
  HAND_WRIST: { toolOver1kg: false, toolOver2kg: false, toolVibration: false, fingerGrip: false, excessiveExtension: false, contactPressure: false, slipperyGlove: false, hammerUse: false },
  ELBOW_FOREARM: { toolOver1kg: false, toolVibration: false, heavyWristRotation: false, elbowPressure: false, pushPull: false, hammerWork: false },
  SHOULDER_ARM: { toolOver1kg: false, toolVibration: false, contactPressure: false, excessiveExtension: false, shoulderRaised: false, bendAndReach: false, lyingPosition: false, shoulderCarry: false, heavyLift: false, heavyCarry: false, heavyPushPull: false },
  NECK: { handsAboveShoulder: false, bendAndReach: false, confinedSpace: false, shoulderCarry: false, combinedMovement: false, shoulderHeavyCarry: false },
  BACK_HIP: { wholeBodyVibration: false, kneelSquat: false, heavyOver5kg: false, heavyOver10kg: false, heavyOver20kg: false, handsAboveShoulder: false, bendAndReach: false, backCarry: false, combinedMovement: false, poorSurface: false },
  KNEE_ANKLE: { kneeTwist: false, confinedSpace: false, heavyOver10kg: false, heavyOver20kg: false, unstableSurface: false, kneePressure: false },
}

const ANGLE_FIELDS: Record<string, { key: string; label: string; min: number; max: number; unit: string }[]> = {
  HAND_WRIST: [
    { key: 'flexion', label: '굴곡', min: 0, max: 90, unit: '°' },
    { key: 'extension', label: '신전', min: 0, max: 90, unit: '°' },
    { key: 'adduction', label: '내전', min: 0, max: 45, unit: '°' },
    { key: 'abduction', label: '외전', min: 0, max: 30, unit: '°' },
  ],
  ELBOW_FOREARM: [
    { key: 'flexion', label: '굴곡', min: 0, max: 180, unit: '°' },
    { key: 'pronation', label: '회내전', min: 0, max: 90, unit: '°' },
    { key: 'supination', label: '회외전', min: 0, max: 90, unit: '°' },
  ],
  SHOULDER_ARM: [
    { key: 'flexion', label: '굴곡', min: 0, max: 180, unit: '°' },
    { key: 'extension', label: '신전', min: 0, max: 60, unit: '°' },
    { key: 'abduction', label: '외전', min: 0, max: 180, unit: '°' },
    { key: 'adduction', label: '내전', min: 0, max: 50, unit: '°' },
    { key: 'externalRotation', label: '외회전', min: 0, max: 90, unit: '°' },
    { key: 'internalRotation', label: '내회전', min: 0, max: 90, unit: '°' },
  ],
  NECK: [
    { key: 'flexion', label: '굴곡', min: 0, max: 60, unit: '°' },
    { key: 'extension', label: '신전', min: 0, max: 50, unit: '°' },
    { key: 'rotation', label: '회전', min: 0, max: 60, unit: '°' },
    { key: 'lateralTilt', label: '측면기울임', min: 0, max: 45, unit: '°' },
  ],
  BACK_HIP: [
    { key: 'flexion', label: '굴곡', min: 0, max: 90, unit: '°' },
    { key: 'extension', label: '신전', min: 0, max: 30, unit: '°' },
    { key: 'rotation', label: '회전', min: 0, max: 45, unit: '°' },
    { key: 'lateralTilt', label: '측면기울임', min: 0, max: 30, unit: '°' },
  ],
  KNEE_ANKLE: [
    { key: 'kneelingTime', label: '무릎꿇기/쪼그리기', min: 0, max: 8, unit: '시간/일' },
    { key: 'climbingCount', label: '오르내리기', min: 0, max: 2000, unit: '회/일' },
    { key: 'drivingHours', label: '운전형태', min: 0, max: 8, unit: '시간/일' },
    { key: 'walkingKm', label: '걷기', min: 0, max: 50, unit: 'km/일' },
  ],
}

const FACTOR_LABELS: Record<string, Record<string, string>> = {
  HAND_WRIST: {
    toolOver1kg: '공구 1kg 이상',
    toolOver2kg: '공구 2kg 이상',
    toolVibration: '공구 진동',
    fingerGrip: '손가락 쥐기/집기',
    excessiveExtension: '과도한 손가락 신전',
    contactPressure: '접촉 압박/충격',
    slipperyGlove: '미끄러운 장갑 착용',
    hammerUse: '손을 망치처럼 사용',
  },
  ELBOW_FOREARM: {
    toolOver1kg: '공구 1kg 이상',
    toolVibration: '공구 진동',
    heavyWristRotation: '손목회전시 강한 힘(중량물)',
    elbowPressure: '팔꿈치 접촉 압박',
    pushPull: '손으로 밀기/당기기',
    hammerWork: '손 망치 작업',
  },
  SHOULDER_ARM: {
    toolOver1kg: '공구 1kg 이상',
    toolVibration: '공구의 진동',
    contactPressure: '접촉 압박',
    excessiveExtension: '팔꿈치 과도한 신전',
    shoulderRaised: '어깨 치켜 올림',
    bendAndReach: '허리 굽히고 팔 뻗기',
    lyingPosition: '누운자세/엎드린 자세',
    shoulderCarry: '어깨로 운반',
    heavyLift: '손을 이용해 중량물 들기/내리기',
    heavyCarry: '손으로 중량물 운반',
    heavyPushPull: '손으로 중량물 밀기/당기기',
  },
  NECK: {
    handsAboveShoulder: '어깨위 손 올림',
    bendAndReach: '허리 굽히고 팔 뻗기',
    confinedSpace: '움직임이 제한된 좁은 공간',
    shoulderCarry: '어깨로 운반하는 작업',
    combinedMovement: '목 굴곡/신전 상태에서 좌우 회전/꺾임',
    shoulderHeavyCarry: '어깨에 중량물을 올려 운반',
  },
  BACK_HIP: {
    wholeBodyVibration: '차량 등 전신 진동',
    kneelSquat: '무릎꿇기, 쪼그린 자세',
    heavyOver5kg: '중량물 5kg이상 (+1)',
    heavyOver10kg: '중량물 10kg이상 (+2)',
    heavyOver20kg: '중량물 20kg이상 (+3)',
    handsAboveShoulder: '어깨 위로 손 올려 중량물 취급',
    bendAndReach: '허리 굽히고 팔 뻗기',
    backCarry: '등을 사용해 운반',
    combinedMovement: '허리 굴곡/신전 상태에서 좌우 회전/꺾임',
    poorSurface: '중량물 운반시 노면상태 불량',
  },
  KNEE_ANKLE: {
    kneeTwist: '무릎/발목 비틀림',
    confinedSpace: '움직임이 제한된 좁은 공간',
    heavyOver10kg: '중량물 10kg 이상 (+1)',
    heavyOver20kg: '중량물 20kg 이상 (+2)',
    unstableSurface: '출발/정지 반복, 불안정한 자세, 노면불량',
    kneePressure: '무릎 접촉/충격',
  },
}

// Force/Static/Repetition labels per body part
const FORCE_STATIC_LABELS: Record<string, { force: string; static: string; repetition?: string }> = {
  HAND_WRIST: {
    force: '취급물중량 손가락>1kg 또는 손>2kg',
    static: '1분 이상 정적자세',
    repetition: '분당 4회 이상 반복',
  },
  ELBOW_FOREARM: {
    force: '취급물중량>3kg',
    static: '1분 이상 정적자세',
    repetition: '분당 4회 이상 반복',
  },
  SHOULDER_ARM: {
    force: '취급물중량>3kg',
    static: '1분 이상 정적자세',
    repetition: '분당 4회 이상 반복',
  },
  NECK: {
    force: '머리 또는 목 부위 중량물 또는 힘이 작용',
    static: '1분 이상 정적자세',
    repetition: '분당 2회 이상 반복',
  },
  BACK_HIP: {
    force: '일일 취급 누적중량>250kg',
    static: '1분 이상 정적자세',
    repetition: '분당 2회 이상 반복',
  },
  KNEE_ANKLE: {
    force: '취급물중량>5kg',
    static: '1분 이상 정적자세',
  },
}

// Local score type for display
type LocalScore = {
  bodyPart: string
  totalScore: number
}

export function Sheet2Modal({
  isOpen,
  onClose,
  workplaceId,
  assessmentId,
  elementWork,
  onSave,
}: Sheet2ModalProps) {
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set())
  const [savingPart, setSavingPart] = useState<string | null>(null)
  const [localScores, setLocalScores] = useState<LocalScore[]>(elementWork.bodyPartScores)

  const [bodyPartData, setBodyPartData] = useState<
    Record<string, { angles: Record<string, number>; factors: Record<string, boolean> }>
  >({})

  const [forceStaticData, setForceStaticData] = useState<
    Record<string, { forceChecked: boolean; staticOver1min: boolean; repetitionChecked: boolean }>
  >({})

  // 저장 상태 추적: 부위별 마지막 저장 시점의 데이터 스냅샷
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>({})

  const getDataHash = useCallback((partId: string) => {
    const d = bodyPartData[partId]
    const fs = forceStaticData[partId]
    if (!d) return ''
    return JSON.stringify({ angles: d.angles, factors: d.factors, fs })
  }, [bodyPartData, forceStaticData])

  // 저장 상태: 'unsaved' | 'saved' | 'modified'
  const getSaveState = useCallback((partId: string): 'unsaved' | 'saved' | 'modified' => {
    const snapshot = savedSnapshots[partId]
    if (!snapshot) return 'unsaved'
    const current = getDataHash(partId)
    return current === snapshot ? 'saved' : 'modified'
  }, [savedSnapshots, getDataHash])

  // Initialize body part data — 기존 저장 데이터가 있으면 로드
  useEffect(() => {
    setLocalScores(elementWork.bodyPartScores)

    // 서버에서 부위별 상세 데이터 로드
    fetch(
      `/api/workplaces/${workplaceId}/musculoskeletal/${assessmentId}/element-works/${elementWork.id}/sheet2`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const savedScores: BodyPartScore[] = data?.bodyPartScores || []
        const savedMap = new Map(savedScores.map((s: BodyPartScore) => [s.bodyPart, s]))

        const loadedData: Record<string, { angles: Record<string, number>; factors: Record<string, boolean> }> = {}
        const loadedForceStatic: Record<string, { forceChecked: boolean; staticOver1min: boolean; repetitionChecked: boolean }> = {}

        BODY_PARTS.forEach((part) => {
          const saved = savedMap.get(part.id)
          if (saved && saved.angles && saved.additionalFactors) {
            // 저장된 데이터 복원
            const { _forceStatic, ...pureFactors } = saved.additionalFactors as Record<string, unknown>
            loadedData[part.id] = {
              angles: { ...DEFAULT_ANGLES[part.id], ...(saved.angles as Record<string, number>) },
              factors: { ...DEFAULT_FACTORS[part.id], ...(pureFactors as Record<string, boolean>) },
            }
            const fs = (_forceStatic || {}) as Record<string, boolean>
            loadedForceStatic[part.id] = {
              forceChecked: !!fs.forceChecked,
              staticOver1min: !!fs.staticOver1min,
              repetitionChecked: !!fs.repetitionChecked,
            }
          } else {
            // 미입력: 초기값
            loadedData[part.id] = {
              angles: { ...DEFAULT_ANGLES[part.id] },
              factors: { ...DEFAULT_FACTORS[part.id] },
            }
            loadedForceStatic[part.id] = {
              forceChecked: false,
              staticOver1min: false,
              repetitionChecked: false,
            }
          }
        })

        setBodyPartData(loadedData)
        setForceStaticData(loadedForceStatic)

        // 저장된 부위의 스냅샷 설정
        const snapshots: Record<string, string> = {}
        BODY_PARTS.forEach((part) => {
          if (savedMap.has(part.id)) {
            snapshots[part.id] = JSON.stringify({
              angles: loadedData[part.id].angles,
              factors: loadedData[part.id].factors,
              fs: loadedForceStatic[part.id],
            })
          }
        })
        setSavedSnapshots(snapshots)
      })
      .catch(() => {
        // API 실패 시 기본값으로 초기화
        const initialData: Record<string, { angles: Record<string, number>; factors: Record<string, boolean> }> = {}
        const initialForceStatic: Record<string, { forceChecked: boolean; staticOver1min: boolean; repetitionChecked: boolean }> = {}
        BODY_PARTS.forEach((part) => {
          initialData[part.id] = {
            angles: { ...DEFAULT_ANGLES[part.id] },
            factors: { ...DEFAULT_FACTORS[part.id] },
          }
          initialForceStatic[part.id] = {
            forceChecked: false,
            staticOver1min: false,
            repetitionChecked: false,
          }
        })
        setBodyPartData(initialData)
        setForceStaticData(initialForceStatic)
        setSavedSnapshots({})
      })
  }, [elementWork, workplaceId, assessmentId])

  if (!isOpen) return null

  const togglePart = (partId: string) => {
    setExpandedParts((prev) => {
      const next = new Set(prev)
      if (next.has(partId)) {
        next.delete(partId)
      } else {
        next.add(partId)
      }
      return next
    })
  }

  const handleAngleChange = (partId: string, key: string, value: number) => {
    setBodyPartData((prev) => ({
      ...prev,
      [partId]: {
        ...prev[partId],
        angles: { ...prev[partId].angles, [key]: value },
      },
    }))
  }

  const handleFactorChange = (partId: string, key: string, checked: boolean) => {
    setBodyPartData((prev) => ({
      ...prev,
      [partId]: {
        ...prev[partId],
        factors: { ...prev[partId].factors, [key]: checked },
      },
    }))
  }

  const handleForceStaticChange = (partId: string, key: string, checked: boolean) => {
    setForceStaticData((prev) => ({
      ...prev,
      [partId]: {
        ...prev[partId],
        [key]: checked,
      },
    }))
  }

  // Real-time score calculation
  const calculateRealtimeScore = (partId: string) => {
    const data = bodyPartData[partId]
    const fs = forceStaticData[partId]
    if (!data) return null

    let postureScore = 0
    let additionalScore = 0

    switch (partId) {
      case 'HAND_WRIST':
        postureScore = calculateHandWristPostureScore(data.angles as unknown as HandWristAngles)
        additionalScore = calculateHandWristAdditionalScore(data.factors as unknown as HandWristFactors)
        break
      case 'ELBOW_FOREARM':
        postureScore = calculateElbowPostureScore(data.angles as unknown as ElbowAngles)
        additionalScore = calculateElbowAdditionalScore(data.factors as unknown as ElbowFactors)
        break
      case 'SHOULDER_ARM':
        postureScore = calculateShoulderPostureScore(data.angles as unknown as ShoulderAngles)
        additionalScore = calculateShoulderAdditionalScore(data.factors as unknown as ShoulderFactors)
        break
      case 'NECK':
        postureScore = calculateNeckPostureScore(data.angles as unknown as NeckAngles)
        additionalScore = calculateNeckAdditionalScore(data.factors as unknown as NeckFactors)
        break
      case 'BACK_HIP':
        postureScore = calculateBackPostureScore(data.angles as unknown as BackAngles)
        additionalScore = calculateBackAdditionalScore(data.factors as unknown as BackFactors)
        break
      case 'KNEE_ANKLE':
        postureScore = calculateKneeAnklePostureScore(data.angles as unknown as KneeAnkleValues)
        additionalScore = calculateKneeAnkleAdditionalScore(data.factors as unknown as KneeAnkleFactors)
        break
    }

    const forceScore = calculateForceScore(fs?.forceChecked ?? false)
    const staticRepetitionScore = calculateStaticRepetitionScore(
      fs?.staticOver1min ?? false,
      fs?.repetitionChecked ?? false
    )
    const totalScore = calculateTotalScore(postureScore, additionalScore, forceScore, staticRepetitionScore)

    return { postureScore, additionalScore, forceScore, staticRepetitionScore, totalScore }
  }

  const handleSaveBodyPart = async (partId: string) => {
    setSavingPart(partId)
    try {
      const res = await fetch(
        `/api/workplaces/${workplaceId}/musculoskeletal/${assessmentId}/element-works/${elementWork.id}/sheet2`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bodyPart: partId,
            angles: bodyPartData[partId].angles,
            additionalFactors: bodyPartData[partId].factors,
            forceStaticFactors: forceStaticData[partId] || {
              forceChecked: false,
              staticOver1min: false,
              repetitionChecked: false,
            },
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        const updatedScore: LocalScore = {
          bodyPart: data.bodyPartScore.bodyPart,
          totalScore: data.bodyPartScore.totalScore,
        }
        setLocalScores((prev) => {
          const existingIdx = prev.findIndex((s) => s.bodyPart === partId)
          const newScores = [...prev]
          if (existingIdx >= 0) {
            newScores[existingIdx] = updatedScore
          } else {
            newScores.push(updatedScore)
          }
          return newScores
        })
        // 저장 스냅샷 업데이트
        setSavedSnapshots((prev) => ({
          ...prev,
          [partId]: JSON.stringify({
            angles: bodyPartData[partId].angles,
            factors: bodyPartData[partId].factors,
            fs: forceStaticData[partId],
          }),
        }))
        onSave()
      } else {
        const error = await res.json()
        alert(error.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSavingPart(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">부위별 점수 입력</h2>
            <p className="text-sm text-gray-500">{elementWork.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Summary */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {BODY_PARTS.map((part) => {
              const realtimeScore = calculateRealtimeScore(part.id)
              const savedScore = localScores.find((s) => s.bodyPart === part.id)
              const displayTotal = realtimeScore?.totalScore ?? savedScore?.totalScore
              const level = displayTotal != null ? getScoreLevel(displayTotal) : null
              const levelInfo = level ? SCORE_LEVEL_INFO[level] : null

              return (
                <div
                  key={part.id}
                  className={`text-center p-2 rounded-lg border ${
                    displayTotal != null ? levelInfo?.color : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="text-lg">{part.icon}</div>
                  <div className="text-xs text-gray-600">{part.name}</div>
                  {displayTotal != null ? (
                    <div className="text-xl font-bold">{displayTotal}</div>
                  ) : (
                    <div className="text-sm text-gray-400">-</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Body Parts Accordion */}
          <div className="space-y-2">
            {BODY_PARTS.map((part) => {
              const isExpanded = expandedParts.has(part.id)
              const existingScore = localScores.find((s) => s.bodyPart === part.id)
              const realtimeScore = calculateRealtimeScore(part.id)
              const displayTotal = realtimeScore?.totalScore ?? existingScore?.totalScore
              const scoreLevel = displayTotal != null ? getScoreLevel(displayTotal) : null
              const levelInfo = scoreLevel ? SCORE_LEVEL_INFO[scoreLevel] : null
              const fsLabels = FORCE_STATIC_LABELS[part.id]

              return (
                <div key={part.id} className="border rounded-lg overflow-hidden">
                  <div
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      displayTotal != null
                        ? `${levelInfo?.color || ''} hover:opacity-80`
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => togglePart(part.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{part.icon}</span>
                      <span className="font-medium">{part.name}</span>
                      {displayTotal != null && (
                        <span className="text-sm font-bold">
                          {displayTotal}점 ({levelInfo?.label})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4 space-y-4">
                      {/* Real-time Score Display */}
                      {realtimeScore && (
                        <div className="bg-white rounded-lg border p-3">
                          <div className="flex items-center gap-3 text-xs">
                            <span>자세:<strong>{realtimeScore.postureScore}</strong></span>
                            <span className="text-gray-400">+</span>
                            <span>부가:<strong>{realtimeScore.additionalScore}</strong></span>
                            <span className="text-gray-400">+</span>
                            <span>힘:<strong>{realtimeScore.forceScore}</strong></span>
                            <span className="text-gray-400">+</span>
                            <span>정적/반복:<strong>{realtimeScore.staticRepetitionScore}</strong></span>
                            <span className="text-gray-400">=</span>
                            <span className={`font-bold text-sm px-2 py-0.5 rounded ${levelInfo?.color || ''}`}>
                              {realtimeScore.totalScore}점
                            </span>
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          {part.id === 'KNEE_ANKLE' ? '작업 특성' : '자세 각도'}
                        </h4>
                        <div className="grid grid-cols-4 gap-3">
                          {ANGLE_FIELDS[part.id].map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {field.label} ({field.unit})
                              </label>
                              <input
                                type="number"
                                min={field.min}
                                max={field.max}
                                step={field.unit === '°' ? 5 : (field.key.includes('Count') ? 10 : 1)}
                                value={bodyPartData[part.id]?.angles[field.key] ?? 0}
                                onChange={(e) => handleAngleChange(part.id, field.key, parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Force / Static / Repetition */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">힘 / 정적자세 / 반복성</h4>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={forceStaticData[part.id]?.forceChecked ?? false}
                              onChange={(e) => handleForceStaticChange(part.id, 'forceChecked', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span className="text-gray-700">
                              <strong className="text-blue-700">[힘 +1]</strong> {fsLabels.force}
                            </span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={forceStaticData[part.id]?.staticOver1min ?? false}
                              onChange={(e) => handleForceStaticChange(part.id, 'staticOver1min', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span className="text-gray-700">
                              <strong className="text-orange-700">[정적 +1]</strong> {fsLabels.static}
                            </span>
                          </label>
                          {fsLabels.repetition && (
                            <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={forceStaticData[part.id]?.repetitionChecked ?? false}
                                onChange={(e) => handleForceStaticChange(part.id, 'repetitionChecked', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <span className="text-gray-700">
                                <strong className="text-orange-700">[반복 +1]</strong> {fsLabels.repetition}
                              </span>
                            </label>
                          )}
                          <p className="text-xs text-gray-500 ml-2">
                            * 힘: 체크시 +1점 / 정적·반복: 둘 중 하나라도 체크시 +1점 (최대 +1)
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">부가요인</h4>
                        <div className="grid grid-cols-2 gap-1">
                          {Object.entries(FACTOR_LABELS[part.id]).map(([key, label]) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={bodyPartData[part.id]?.factors[key] ?? false}
                                onChange={(e) => handleFactorChange(part.id, key, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <span className="text-gray-700">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t">
                        {(() => {
                          const saveState = getSaveState(part.id)
                          const stateStyles = {
                            unsaved: 'bg-blue-600 hover:bg-blue-700 text-white',
                            saved: 'bg-green-600 hover:bg-green-700 text-white',
                            modified: 'bg-amber-500 hover:bg-amber-600 text-white',
                          }
                          const stateLabels = {
                            unsaved: `${part.name} 저장`,
                            saved: `${part.name} 저장됨`,
                            modified: `${part.name} 재저장`,
                          }
                          return (
                            <button
                              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${stateStyles[saveState]}`}
                              onClick={() => handleSaveBodyPart(part.id)}
                              disabled={savingPart === part.id}
                            >
                              {savingPart === part.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  저장 중...
                                </>
                              ) : saveState === 'saved' ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {stateLabels[saveState]}
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-1" />
                                  {stateLabels[saveState]}
                                </>
                              )}
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}
