'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { X, Loader2, Save, CheckCircle } from 'lucide-react'
import {
  calculateRULA,
  calculateREBA,
  evaluatePushPull,
  rulaUpperArmFromAngles,
  rulaLowerArmFromAngles,
  rulaWristFromAngles,
  rulaNeckFromAngles,
  rulaTrunkFromAngles,
  rebaNeckFromAngles,
  rebaTrunkFromAngles,
  rebaUpperArmFromAngles,
  rebaLowerArmFromAngles,
  rebaWristFromAngles,
} from '@/lib/musculoskeletal/score-calculator'

// ============================================
// Types
// ============================================

interface ElementWork {
  id: string
  name: string
  rulaScore?: number | null
  rulaLevel?: string | null
  rebaScore?: number | null
  rebaLevel?: string | null
  pushPullArm?: string | null
  pushPullHand?: string | null
  pushPullFinger?: string | null
  hasArmSupport?: boolean
  hasUnstableLeg?: boolean
  hasRapidPosture?: boolean
  hasRapidForce?: boolean
}

interface Sheet3ModalProps {
  isOpen: boolean
  onClose: () => void
  workplaceId: string
  assessmentId: string
  elementWork: ElementWork
  onSave: () => void
}

interface BodyPartScoreData {
  bodyPart: string
  angles: Record<string, number> | null
  additionalFactors: Record<string, boolean> | null
}

interface PushPullMeasurement {
  id: string
  name: string
  force: number | null
  frequency: number | null
  sortOrder: number
}

interface PushPullEvaluation {
  measurementId: string
  bodyPart: 'arm' | 'hand' | 'finger'
  force: number
  result: string
}

interface RulaState {
  upperArmBase: number
  upperArmRaised: boolean
  upperArmAbducted: boolean
  upperArmSupported: boolean
  forearmBase: number
  forearmCrossMidline: boolean
  wristBase: number
  wristDeviation: boolean
  wristTwist: number
  muscleUseA: boolean
  forceLoadA: number
  neckBase: number
  neckTwist: boolean
  neckSideBend: boolean
  trunkBase: number
  trunkTwist: boolean
  trunkSideBend: boolean
  legScore: number
  muscleUseB: boolean
  forceLoadB: number
}

interface RebaState {
  neckBase: number
  neckTwist: boolean
  neckSideBend: boolean
  trunkBase: number
  trunkTwist: boolean
  trunkSideBend: boolean
  legBase: number
  legKnee: number // 0, 1, 2
  forceLoad: number // 0-2
  forceShock: boolean // +1
  upperArmBase: number
  upperArmRaised: boolean
  upperArmAbducted: boolean
  upperArmSupported: boolean
  forearmScore: number
  wristBase: number
  wristTwist: boolean
  couplingScore: number
  activityStatic: boolean
  activityRepeated: boolean
  activityRapid: boolean
}

// ============================================
// Default States
// ============================================

const DEFAULT_RULA: RulaState = {
  upperArmBase: 1, upperArmRaised: false, upperArmAbducted: false, upperArmSupported: false,
  forearmBase: 1, forearmCrossMidline: false,
  wristBase: 1, wristDeviation: false, wristTwist: 1,
  muscleUseA: false, forceLoadA: 0,
  neckBase: 1, neckTwist: false, neckSideBend: false,
  trunkBase: 1, trunkTwist: false, trunkSideBend: false,
  legScore: 1, muscleUseB: false, forceLoadB: 0,
}

const DEFAULT_REBA: RebaState = {
  neckBase: 1, neckTwist: false, neckSideBend: false,
  trunkBase: 1, trunkTwist: false, trunkSideBend: false,
  legBase: 1, legKnee: 0,
  forceLoad: 0, forceShock: false,
  upperArmBase: 1, upperArmRaised: false, upperArmAbducted: false, upperArmSupported: false,
  forearmScore: 1, wristBase: 1, wristTwist: false,
  couplingScore: 0,
  activityStatic: false, activityRepeated: false, activityRapid: false,
}

// ============================================
// Component
// ============================================

export function Sheet3Modal({
  isOpen,
  onClose,
  workplaceId,
  assessmentId,
  elementWork,
  onSave,
}: Sheet3ModalProps) {
  // Data loading state
  const [loading, setLoading] = useState(true)
  const [bodyPartScores, setBodyPartScores] = useState<BodyPartScoreData[]>([])
  const [pushPullMeasurements, setPushPullMeasurements] = useState<PushPullMeasurement[]>([])

  // RULA/REBA input states
  const [rula, setRula] = useState<RulaState>(DEFAULT_RULA)
  const [reba, setReba] = useState<RebaState>(DEFAULT_REBA)
  const [pushPullEvals, setPushPullEvals] = useState<PushPullEvaluation[]>([])

  // Save states
  const [savingType, setSavingType] = useState<string | null>(null)
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>({})

  // Results display
  const [localResults, setLocalResults] = useState({
    rulaScore: elementWork.rulaScore,
    rulaLevel: elementWork.rulaLevel,
    rebaScore: elementWork.rebaScore,
    rebaLevel: elementWork.rebaLevel,
    pushPullArm: elementWork.pushPullArm,
    pushPullHand: elementWork.pushPullHand,
    pushPullFinger: elementWork.pushPullFinger,
  })

  // ============================================
  // Data Hash & Save State Tracking
  // ============================================

  const getDataHash = useCallback((type: string) => {
    if (type === 'rula') return JSON.stringify(rula)
    if (type === 'reba') return JSON.stringify(reba)
    if (type === 'pushpull') return JSON.stringify(pushPullEvals)
    return ''
  }, [rula, reba, pushPullEvals])

  const getSaveState = useCallback((type: string): 'unsaved' | 'saved' | 'modified' => {
    const snapshot = savedSnapshots[type]
    if (!snapshot) return 'unsaved'
    const current = getDataHash(type)
    return current === snapshot ? 'saved' : 'modified'
  }, [savedSnapshots, getDataHash])

  // ============================================
  // RULA Real-time Calculation
  // ============================================

  const rulaResult = useMemo(() => {
    const upperArmScore = Math.min(
      rula.upperArmBase + (rula.upperArmRaised ? 1 : 0) + (rula.upperArmAbducted ? 1 : 0) - (rula.upperArmSupported ? 1 : 0),
      6
    )
    const forearmScore = Math.min(rula.forearmBase + (rula.forearmCrossMidline ? 1 : 0), 3)
    const wristScore = Math.min(rula.wristBase + (rula.wristDeviation ? 1 : 0), 4)
    const neckScore = Math.min(rula.neckBase + (rula.neckTwist ? 1 : 0) + (rula.neckSideBend ? 1 : 0), 6)
    const trunkScore = Math.min(rula.trunkBase + (rula.trunkTwist ? 1 : 0) + (rula.trunkSideBend ? 1 : 0), 6)

    const result = calculateRULA({
      upperArmScore, forearmScore, wristScore,
      wristTwist: rula.wristTwist,
      muscleUseA: rula.muscleUseA, forceLoadA: rula.forceLoadA,
      neckScore, trunkScore, legScore: rula.legScore,
      muscleUseB: rula.muscleUseB, forceLoadB: rula.forceLoadB,
    })

    return {
      upperArmScore, forearmScore, wristScore, neckScore, trunkScore,
      tableA: result.tableAScore,
      tableB: result.tableBScore,
      ...result,
    }
  }, [rula])

  // ============================================
  // REBA Real-time Calculation
  // ============================================

  const rebaResult = useMemo(() => {
    const neckScore = Math.min(reba.neckBase + (reba.neckTwist ? 1 : 0) + (reba.neckSideBend ? 1 : 0), 3)
    const trunkScore = Math.min(reba.trunkBase + (reba.trunkTwist ? 1 : 0) + (reba.trunkSideBend ? 1 : 0), 5)
    const legScore = Math.min(reba.legBase + reba.legKnee, 4)
    const forceLoadA = Math.min(reba.forceLoad + (reba.forceShock ? 1 : 0), 3)

    const upperArmScore = Math.min(
      Math.max(reba.upperArmBase + (reba.upperArmRaised ? 1 : 0) + (reba.upperArmAbducted ? 1 : 0) - (reba.upperArmSupported ? 1 : 0), 1),
      6
    )
    const wristScore = Math.min(reba.wristBase + (reba.wristTwist ? 1 : 0), 3)
    const activityScore = (reba.activityStatic ? 1 : 0) + (reba.activityRepeated ? 1 : 0) + (reba.activityRapid ? 1 : 0)

    const result = calculateREBA({
      neckScore, trunkScore, legScore, forceLoadA,
      upperArmScore, forearmScore: reba.forearmScore, wristScore,
      couplingScore: reba.couplingScore,
      activityScore,
    })

    return {
      neckScore, trunkScore, legScore, forceLoadA,
      upperArmScore, wristScore, activityScore,
      tableA: result.tableAScore,
      tableB: result.tableBScore,
      ...result,
    }
  }, [reba])

  // ============================================
  // Sheet 2 Auto-populated Detection
  // ============================================

  const sheet2AutoParts = useMemo(() => {
    const parts: Record<string, boolean> = {}
    for (const bp of bodyPartScores) {
      if (bp.angles && Object.values(bp.angles).some(v => v !== 0)) {
        parts[bp.bodyPart] = true
      }
    }
    return parts
  }, [bodyPartScores])

  const hasSheet2 = useCallback((bodyPart: string) => !!sheet2AutoParts[bodyPart], [sheet2AutoParts])

  // ============================================
  // Data Loading
  // ============================================

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/workplaces/${workplaceId}/musculoskeletal/${assessmentId}/element-works/${elementWork.id}/sheet3`
        )
        if (!res.ok) return

        const data = await res.json()
        const s = data.sheet3Data

        // Sheet 2 body part scores
        setBodyPartScores(s.bodyPartScores || [])
        setPushPullMeasurements(s.measurements || [])

        // Restore saved RULA inputs
        if (s.rulaInputs) {
          setRula(s.rulaInputs as RulaState)
          setSavedSnapshots(prev => ({ ...prev, rula: JSON.stringify(s.rulaInputs) }))
        } else {
          // Auto-calculate from Sheet 2 angles
          const autoRula = computeRulaFromSheet2(s.bodyPartScores || [], elementWork)
          setRula(autoRula)
        }

        // Restore saved REBA inputs
        if (s.rebaInputs) {
          setReba(s.rebaInputs as RebaState)
          setSavedSnapshots(prev => ({ ...prev, reba: JSON.stringify(s.rebaInputs) }))
        } else {
          const autoReba = computeRebaFromSheet2(s.bodyPartScores || [], elementWork)
          setReba(autoReba)
        }

        // Restore saved push-pull evaluations
        if (s.pushPullEvaluations) {
          setPushPullEvals(s.pushPullEvaluations as PushPullEvaluation[])
          setSavedSnapshots(prev => ({ ...prev, pushpull: JSON.stringify(s.pushPullEvaluations) }))
        } else {
          // Initialize from measurements
          const initEvals = (s.measurements || []).map((m: PushPullMeasurement) => ({
            measurementId: m.id,
            bodyPart: 'arm' as const,
            force: m.force ?? 0,
            result: evaluatePushPull(m.force ?? 0, 'arm'),
          }))
          setPushPullEvals(initEvals)
        }

        setLocalResults({
          rulaScore: s.rulaScore,
          rulaLevel: s.rulaLevel,
          rebaScore: s.rebaScore,
          rebaLevel: s.rebaLevel,
          pushPullArm: s.pushPullArm,
          pushPullHand: s.pushPullHand,
          pushPullFinger: s.pushPullFinger,
        })
      } catch (error) {
        console.error('Sheet3 데이터 로딩 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, workplaceId, assessmentId, elementWork.id])

  // ============================================
  // Auto-calculate from Sheet 2
  // ============================================

  function computeRulaFromSheet2(bps: BodyPartScoreData[], ew: ElementWork): RulaState {
    const state = { ...DEFAULT_RULA }

    const shoulder = bps.find(b => b.bodyPart === 'SHOULDER_ARM')
    if (shoulder?.angles) {
      const a = shoulder.angles as Record<string, number>
      const { base, abducted } = rulaUpperArmFromAngles({
        neutral: a.neutral ?? 0, flexion: a.flexion ?? 0, extension: a.extension ?? 0,
        abduction: a.abduction ?? 0, adduction: a.adduction ?? 0,
        externalRotation: a.externalRotation ?? 0, internalRotation: a.internalRotation ?? 0,
      })
      state.upperArmBase = base
      state.upperArmAbducted = abducted
    }

    const elbow = bps.find(b => b.bodyPart === 'ELBOW_FOREARM')
    if (elbow?.angles) {
      const a = elbow.angles as Record<string, number>
      state.forearmBase = rulaLowerArmFromAngles({
        flexion: a.flexion ?? 0, pronation: a.pronation ?? 0, supination: a.supination ?? 0,
      })
    }

    const hand = bps.find(b => b.bodyPart === 'HAND_WRIST')
    if (hand?.angles) {
      const a = hand.angles as Record<string, number>
      const { base, deviation } = rulaWristFromAngles({
        flexion: a.flexion ?? 0, extension: a.extension ?? 0,
        adduction: a.adduction ?? 0, abduction: a.abduction ?? 0,
      })
      state.wristBase = base
      state.wristDeviation = deviation
    }

    const neck = bps.find(b => b.bodyPart === 'NECK')
    if (neck?.angles) {
      const a = neck.angles as Record<string, number>
      const { base, twist, sideBend } = rulaNeckFromAngles({
        neutral: a.neutral ?? 0, flexion: a.flexion ?? 0, extension: a.extension ?? 0,
        rotation: a.rotation ?? 0, lateralTilt: a.lateralTilt ?? 0,
      })
      state.neckBase = base
      state.neckTwist = twist
      state.neckSideBend = sideBend
    }

    const back = bps.find(b => b.bodyPart === 'BACK_HIP')
    if (back?.angles) {
      const a = back.angles as Record<string, number>
      const { base, twist, sideBend } = rulaTrunkFromAngles({
        flexion: a.flexion ?? 0, extension: a.extension ?? 0,
        rotation: a.rotation ?? 0, lateralTilt: a.lateralTilt ?? 0,
      })
      state.trunkBase = base
      state.trunkTwist = twist
      state.trunkSideBend = sideBend
    }

    // Legs from additional factors
    state.legScore = ew.hasUnstableLeg ? 2 : 1
    state.upperArmSupported = ew.hasArmSupport || false

    return state
  }

  function computeRebaFromSheet2(bps: BodyPartScoreData[], ew: ElementWork): RebaState {
    const state = { ...DEFAULT_REBA }

    const neck = bps.find(b => b.bodyPart === 'NECK')
    if (neck?.angles) {
      const a = neck.angles as Record<string, number>
      const { base, twist, sideBend } = rebaNeckFromAngles({
        neutral: a.neutral ?? 0, flexion: a.flexion ?? 0, extension: a.extension ?? 0,
        rotation: a.rotation ?? 0, lateralTilt: a.lateralTilt ?? 0,
      })
      state.neckBase = base
      state.neckTwist = twist
      state.neckSideBend = sideBend
    }

    const back = bps.find(b => b.bodyPart === 'BACK_HIP')
    if (back?.angles) {
      const a = back.angles as Record<string, number>
      const { base, twist, sideBend } = rebaTrunkFromAngles({
        flexion: a.flexion ?? 0, extension: a.extension ?? 0,
        rotation: a.rotation ?? 0, lateralTilt: a.lateralTilt ?? 0,
      })
      state.trunkBase = base
      state.trunkTwist = twist
      state.trunkSideBend = sideBend
    }

    const shoulder = bps.find(b => b.bodyPart === 'SHOULDER_ARM')
    if (shoulder?.angles) {
      const a = shoulder.angles as Record<string, number>
      const { base, abducted } = rebaUpperArmFromAngles({
        neutral: a.neutral ?? 0, flexion: a.flexion ?? 0, extension: a.extension ?? 0,
        abduction: a.abduction ?? 0, adduction: a.adduction ?? 0,
        externalRotation: a.externalRotation ?? 0, internalRotation: a.internalRotation ?? 0,
      })
      state.upperArmBase = base
      state.upperArmAbducted = abducted
    }

    const elbow = bps.find(b => b.bodyPart === 'ELBOW_FOREARM')
    if (elbow?.angles) {
      const a = elbow.angles as Record<string, number>
      state.forearmScore = rebaLowerArmFromAngles({
        flexion: a.flexion ?? 0, pronation: a.pronation ?? 0, supination: a.supination ?? 0,
      })
    }

    const hand = bps.find(b => b.bodyPart === 'HAND_WRIST')
    if (hand?.angles) {
      const a = hand.angles as Record<string, number>
      const { base, twist } = rebaWristFromAngles({
        flexion: a.flexion ?? 0, extension: a.extension ?? 0,
        adduction: a.adduction ?? 0, abduction: a.abduction ?? 0,
      })
      state.wristBase = base
      state.wristTwist = twist
    }

    state.upperArmSupported = ew.hasArmSupport || false
    state.activityRapid = ew.hasRapidPosture || false

    return state
  }

  // ============================================
  // Save Handler
  // ============================================

  const handleSave = async (type: 'rula' | 'reba' | 'pushpull') => {
    setSavingType(type)
    try {
      const body: Record<string, unknown> = { type }

      if (type === 'rula') {
        // Build RULAInputs from detailed state
        const upperArmScore = Math.min(
          rula.upperArmBase + (rula.upperArmRaised ? 1 : 0) + (rula.upperArmAbducted ? 1 : 0) - (rula.upperArmSupported ? 1 : 0),
          6
        )
        const forearmScore = Math.min(rula.forearmBase + (rula.forearmCrossMidline ? 1 : 0), 3)
        const wristScore = Math.min(rula.wristBase + (rula.wristDeviation ? 1 : 0), 4)
        const neckScore = Math.min(rula.neckBase + (rula.neckTwist ? 1 : 0) + (rula.neckSideBend ? 1 : 0), 6)
        const trunkScore = Math.min(rula.trunkBase + (rula.trunkTwist ? 1 : 0) + (rula.trunkSideBend ? 1 : 0), 6)

        body.rulaInputs = {
          ...rula,
          // Also send calculated scores for the API
          upperArmScore, forearmScore, wristScore,
          wristTwist: rula.wristTwist,
          muscleUseA: rula.muscleUseA, forceLoadA: rula.forceLoadA,
          neckScore, trunkScore, legScore: rula.legScore,
          muscleUseB: rula.muscleUseB, forceLoadB: rula.forceLoadB,
        }
        body.hasArmSupport = rula.upperArmSupported
        body.hasUnstableLeg = rula.legScore === 2
      } else if (type === 'reba') {
        const neckScore = Math.min(reba.neckBase + (reba.neckTwist ? 1 : 0) + (reba.neckSideBend ? 1 : 0), 3)
        const trunkScore = Math.min(reba.trunkBase + (reba.trunkTwist ? 1 : 0) + (reba.trunkSideBend ? 1 : 0), 5)
        const legScore = Math.min(reba.legBase + reba.legKnee, 4)
        const forceLoadA = Math.min(reba.forceLoad + (reba.forceShock ? 1 : 0), 3)
        const upperArmScore = Math.min(
          Math.max(reba.upperArmBase + (reba.upperArmRaised ? 1 : 0) + (reba.upperArmAbducted ? 1 : 0) - (reba.upperArmSupported ? 1 : 0), 1),
          6
        )
        const wristScore = Math.min(reba.wristBase + (reba.wristTwist ? 1 : 0), 3)
        const activityScore = (reba.activityStatic ? 1 : 0) + (reba.activityRepeated ? 1 : 0) + (reba.activityRapid ? 1 : 0)

        body.rebaInputs = {
          ...reba,
          neckScore, trunkScore, legScore, forceLoadA,
          upperArmScore, forearmScore: reba.forearmScore, wristScore,
          couplingScore: reba.couplingScore,
          activityScore,
        }
        body.hasArmSupport = reba.upperArmSupported
        body.hasRapidPosture = reba.activityRapid
      } else if (type === 'pushpull') {
        body.pushPullEvaluations = pushPullEvals
      }

      const res = await fetch(
        `/api/workplaces/${workplaceId}/musculoskeletal/${assessmentId}/element-works/${elementWork.id}/sheet3`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (res.ok) {
        const data = await res.json()
        const ew = data.elementWork
        setLocalResults({
          rulaScore: ew.rulaScore,
          rulaLevel: ew.rulaLevel,
          rebaScore: ew.rebaScore,
          rebaLevel: ew.rebaLevel,
          pushPullArm: ew.pushPullArm,
          pushPullHand: ew.pushPullHand,
          pushPullFinger: ew.pushPullFinger,
        })
        // Save snapshot for state tracking
        setSavedSnapshots(prev => ({ ...prev, [type]: getDataHash(type) }))
        onSave()
      } else {
        const error = await res.json()
        alert(error.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSavingType(null)
    }
  }

  // ============================================
  // Helpers
  // ============================================

  const getLevelColor = (level: string | null | undefined) => {
    if (!level) return 'bg-gray-100 text-gray-600'
    if (level.includes('0') || level.includes('1') || level === '안전' || level === '없음') return 'bg-green-100 text-green-700'
    if (level.includes('2') || level === '보통') return 'bg-yellow-100 text-yellow-700'
    if (level.includes('3') || level === '위험') return 'bg-orange-100 text-orange-700'
    if (level.includes('4') || level === '고위험') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-600'
  }

  const getResultBadgeColor = (result: string) => {
    switch (result) {
      case '안전': return 'bg-green-100 text-green-700 border-green-200'
      case '보통': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case '위험': return 'bg-orange-100 text-orange-700 border-orange-200'
      case '고위험': return 'bg-red-100 text-red-700 border-red-200'
      case '없음': return 'bg-gray-100 text-gray-500 border-gray-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const autoCardClass = (isAuto: boolean) =>
    isAuto
      ? 'border rounded p-3 border-l-4 border-l-emerald-400 bg-emerald-50/30'
      : 'border rounded p-3 border-l-4 border-l-amber-400 bg-amber-50/30'

  const autoTag = (isAuto: boolean) => (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
      isAuto ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
    }`}>
      {isAuto ? '자동' : '수동'}
    </span>
  )

  const stateStyles: Record<string, string> = {
    unsaved: 'bg-blue-600 hover:bg-blue-700 text-white',
    saved: 'bg-green-600 hover:bg-green-700 text-white',
    modified: 'bg-amber-500 hover:bg-amber-600 text-white',
  }

  const renderSaveButton = (type: 'rula' | 'reba' | 'pushpull', label: string) => {
    const state = getSaveState(type)
    const isSaving = savingType === type
    const stateLabels = {
      unsaved: `${label} 저장`,
      saved: `${label} 저장됨`,
      modified: `${label} 재저장`,
    }

    return (
      <button
        onClick={() => handleSave(type)}
        disabled={isSaving}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isSaving ? 'bg-gray-400 text-white cursor-not-allowed' : stateStyles[state]
        }`}
      >
        {isSaving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> 저장 중...</>
        ) : state === 'saved' ? (
          <><CheckCircle className="w-4 h-4" /> {stateLabels[state]}</>
        ) : (
          <><Save className="w-4 h-4" /> {stateLabels[state]}</>
        )}
      </button>
    )
  }

  if (!isOpen) return null

  // ============================================
  // Render
  // ============================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">RULA/REBA 평가</h2>
            <p className="text-sm text-gray-500">{elementWork.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">데이터를 불러오는 중...</span>
            </div>
          ) : (
            <>
              {/* ========== 결과 요약 ========== */}
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-xs text-blue-600 font-medium">RULA</div>
                  <div className="text-2xl font-bold text-blue-700">{rulaResult.score}</div>
                  <div className={`text-xs px-2 py-0.5 rounded inline-block mt-1 ${getLevelColor(rulaResult.level)}`}>
                    {rulaResult.level}
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="text-xs text-purple-600 font-medium">REBA</div>
                  <div className="text-2xl font-bold text-purple-700">{rebaResult.score}</div>
                  <div className={`text-xs px-2 py-0.5 rounded inline-block mt-1 ${getLevelColor(rebaResult.level)}`}>
                    {rebaResult.level}
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-600">밀당(팔)</div>
                  <div className={`text-sm font-bold mt-1 px-2 py-0.5 rounded inline-block ${getResultBadgeColor(localResults.pushPullArm || '없음')}`}>
                    {localResults.pushPullArm || '-'}
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-600">밀당(손)</div>
                  <div className={`text-sm font-bold mt-1 px-2 py-0.5 rounded inline-block ${getResultBadgeColor(localResults.pushPullHand || '없음')}`}>
                    {localResults.pushPullHand || '-'}
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-600">밀당(손가락)</div>
                  <div className={`text-sm font-bold mt-1 px-2 py-0.5 rounded inline-block ${getResultBadgeColor(localResults.pushPullFinger || '없음')}`}>
                    {localResults.pushPullFinger || '-'}
                  </div>
                </div>
              </div>

              {/* ========== 입력 안내 ========== */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/60 text-sm">
                <p className="font-medium text-blue-800 mb-1.5">입력 안내</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-blue-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-4 bg-emerald-400 rounded-full inline-block" />
                    <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-medium">자동</span>
                    Sheet 2 측정값에서 자동 입력된 항목 (수정 가능)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-4 bg-amber-400 rounded-full inline-block" />
                    <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-medium">수동</span>
                    직접 입력이 필요한 항목
                  </span>
                </div>
              </div>

              {/* ========== RULA ========== */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-800">RULA (Rapid Upper Limb Assessment)</h3>
                    <p className="text-xs text-blue-600 mt-0.5">
                      최종 점수: <span className="font-bold">{rulaResult.score}점</span>
                      {' / '}Table A: {rulaResult.tableA} → Score C: {rulaResult.scoreC}
                      {' / '}Table B: {rulaResult.tableB} → Score D: {rulaResult.scoreD}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLevelColor(rulaResult.level)}`}>
                      {rulaResult.level}
                    </span>
                    {renderSaveButton('rula', 'RULA')}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Group A: 상지 */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      그룹 A: 상지 (팔/손목)
                      <span className="text-xs font-normal text-gray-500">
                        Table A = {rulaResult.tableA} → Score C = {rulaResult.scoreC}
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 상완 */}
                      <div className={autoCardClass(hasSheet2('SHOULDER_ARM'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">상완 (Upper Arm)</span>
                            {autoTag(hasSheet2('SHOULDER_ARM'))}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            최종: {rulaResult.upperArmScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 20° 신전 ~ 20° 굴곡' },
                            { v: 2, l: '2점: 20°+ 신전 또는 20-45° 굴곡' },
                            { v: 3, l: '3점: 45-90° 굴곡' },
                            { v: 4, l: '4점: 90°+ 굴곡' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="rula-upperarm" value={o.v}
                                checked={rula.upperArmBase === o.v}
                                onChange={() => setRula({ ...rula, upperArmBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-2 pt-2 border-t">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={rula.upperArmRaised}
                              onChange={e => setRula({ ...rula, upperArmRaised: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            어깨 올림 (+1)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={rula.upperArmAbducted}
                              onChange={e => setRula({ ...rula, upperArmAbducted: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            팔 벌림 (+1)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={rula.upperArmSupported}
                              onChange={e => setRula({ ...rula, upperArmSupported: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            팔 지지 (-1)
                          </label>
                        </div>
                      </div>

                      {/* 전완 */}
                      <div className={autoCardClass(hasSheet2('ELBOW_FOREARM'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">전완 (Lower Arm)</span>
                            {autoTag(hasSheet2('ELBOW_FOREARM'))}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            최종: {rulaResult.forearmScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 60-100° 굴곡' },
                            { v: 2, l: '2점: 60° 미만 또는 100° 초과' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="rula-forearm" value={o.v}
                                checked={rula.forearmBase === o.v}
                                onChange={() => setRula({ ...rula, forearmBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={rula.forearmCrossMidline}
                              onChange={e => setRula({ ...rula, forearmCrossMidline: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            중심선 교차/외측 작업 (+1)
                          </label>
                        </div>
                      </div>

                      {/* 손목 */}
                      <div className={autoCardClass(hasSheet2('HAND_WRIST'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">손목 (Wrist)</span>
                            {autoTag(hasSheet2('HAND_WRIST'))}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            최종: {rulaResult.wristScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 중립 (0°)' },
                            { v: 2, l: '2점: 0-15° 굴곡/신전' },
                            { v: 3, l: '3점: 15°+ 굴곡/신전' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="rula-wrist" value={o.v}
                                checked={rula.wristBase === o.v}
                                onChange={() => setRula({ ...rula, wristBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={rula.wristDeviation}
                              onChange={e => setRula({ ...rula, wristDeviation: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            손목 편향 (+1)
                          </label>
                        </div>
                      </div>

                      {/* 손목 비틀림 */}
                      <div className={autoCardClass(false)}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">손목 비틀림 (Wrist Twist)</span>
                            {autoTag(false)}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            점수: {rula.wristTwist}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 중간 범위' },
                            { v: 2, l: '2점: 끝 범위 또는 근접' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="rula-wristtwist" value={o.v}
                                checked={rula.wristTwist === o.v}
                                onChange={() => setRula({ ...rula, wristTwist: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Muscle & Force A */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 p-3 bg-blue-50/50 rounded border border-blue-100 border-l-4 border-l-amber-400">
                      {autoTag(false)}
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={rula.muscleUseA}
                          onChange={e => setRula({ ...rula, muscleUseA: e.target.checked })}
                          className="w-4 h-4 rounded" />
                        근육 사용 (+1)
                        <span className="text-xs text-gray-500">정적 &gt;1분 또는 반복 4회+/분</span>
                      </label>
                      <div className="flex items-center gap-2 text-sm">
                        <span>힘/부하:</span>
                        <select value={rula.forceLoadA}
                          onChange={e => setRula({ ...rula, forceLoadA: parseInt(e.target.value) })}
                          className="px-2 py-1 border rounded text-sm bg-white">
                          <option value={0}>0: &lt;2kg 간헐적</option>
                          <option value={1}>+1: 2-10kg 간헐적</option>
                          <option value={2}>+2: 2-10kg 정적/반복</option>
                          <option value={3}>+3: &gt;10kg 또는 충격</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* Group B: 목/몸통/다리 */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      그룹 B: 목/몸통/다리
                      <span className="text-xs font-normal text-gray-500">
                        Table B = {rulaResult.tableB} → Score D = {rulaResult.scoreD}
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 목 */}
                      <div className={autoCardClass(hasSheet2('NECK'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">목 (Neck)</span>
                            {autoTag(hasSheet2('NECK'))}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            최종: {rulaResult.neckScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 0-10° 굴곡' },
                            { v: 2, l: '2점: 10-20° 굴곡' },
                            { v: 3, l: '3점: 20°+ 굴곡' },
                            { v: 4, l: '4점: 신전' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="rula-neck" value={o.v}
                                checked={rula.neckBase === o.v}
                                onChange={() => setRula({ ...rula, neckBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-2 pt-2 border-t">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={rula.neckTwist}
                              onChange={e => setRula({ ...rula, neckTwist: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            비틀림 (+1)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={rula.neckSideBend}
                              onChange={e => setRula({ ...rula, neckSideBend: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            옆기울임 (+1)
                          </label>
                        </div>
                      </div>

                      {/* 몸통 */}
                      <div className={autoCardClass(hasSheet2('BACK_HIP'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">몸통 (Trunk)</span>
                            {autoTag(hasSheet2('BACK_HIP'))}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            최종: {rulaResult.trunkScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 지지된 자세' },
                            { v: 2, l: '2점: 0-20° 굴곡' },
                            { v: 3, l: '3점: 20-60° 굴곡' },
                            { v: 4, l: '4점: 60°+ 굴곡' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="rula-trunk" value={o.v}
                                checked={rula.trunkBase === o.v}
                                onChange={() => setRula({ ...rula, trunkBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-2 pt-2 border-t">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={rula.trunkTwist}
                              onChange={e => setRula({ ...rula, trunkTwist: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            비틀림 (+1)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={rula.trunkSideBend}
                              onChange={e => setRula({ ...rula, trunkSideBend: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            옆기울임 (+1)
                          </label>
                        </div>
                      </div>

                      {/* 다리 */}
                      <div className={autoCardClass(false)}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">다리 (Legs)</span>
                            {autoTag(false)}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            점수: {rula.legScore}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 균형잡힌/지지된 자세' },
                            { v: 2, l: '2점: 불균형/비지지 자세' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="rula-leg" value={o.v}
                                checked={rula.legScore === o.v}
                                onChange={() => setRula({ ...rula, legScore: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Muscle & Force B */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 p-3 bg-blue-50/50 rounded border border-blue-100 border-l-4 border-l-amber-400">
                      {autoTag(false)}
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={rula.muscleUseB}
                          onChange={e => setRula({ ...rula, muscleUseB: e.target.checked })}
                          className="w-4 h-4 rounded" />
                        근육 사용 (+1)
                      </label>
                      <div className="flex items-center gap-2 text-sm">
                        <span>힘/부하:</span>
                        <select value={rula.forceLoadB}
                          onChange={e => setRula({ ...rula, forceLoadB: parseInt(e.target.value) })}
                          className="px-2 py-1 border rounded text-sm bg-white">
                          <option value={0}>0: &lt;2kg 간헐적</option>
                          <option value={1}>+1: 2-10kg 간헐적</option>
                          <option value={2}>+2: 2-10kg 정적/반복</option>
                          <option value={3}>+3: &gt;10kg 또는 충격</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========== REBA ========== */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-purple-800">REBA (Rapid Entire Body Assessment)</h3>
                    <p className="text-xs text-purple-600 mt-0.5">
                      최종 점수: <span className="font-bold">{rebaResult.score}점</span>
                      {' / '}Table A: {rebaResult.tableA} → Score A: {rebaResult.scoreA}
                      {' / '}Table B: {rebaResult.tableB} → Score B: {rebaResult.scoreB}
                      {' / '}Table C: {rebaResult.tableCScore} + 활동: {rebaResult.activityScore}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLevelColor(rebaResult.level)}`}>
                      {rebaResult.level}
                    </span>
                    {renderSaveButton('reba', 'REBA')}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Group A: 목/몸통/다리 */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      그룹 A: 목/몸통/다리
                      <span className="text-xs font-normal text-gray-500">
                        Table A = {rebaResult.tableA} → Score A = {rebaResult.scoreA}
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 목 */}
                      <div className={autoCardClass(hasSheet2('NECK'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">목 (Neck)</span>
                            {autoTag(hasSheet2('NECK'))}
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            최종: {rebaResult.neckScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 0-20° 굴곡' },
                            { v: 2, l: '2점: 20°+ 굴곡 또는 신전' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="reba-neck" value={o.v}
                                checked={reba.neckBase === o.v}
                                onChange={() => setReba({ ...reba, neckBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-2 pt-2 border-t">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={reba.neckTwist}
                              onChange={e => setReba({ ...reba, neckTwist: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            비틀림 (+1)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={reba.neckSideBend}
                              onChange={e => setReba({ ...reba, neckSideBend: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            옆기울임 (+1)
                          </label>
                        </div>
                      </div>

                      {/* 몸통 */}
                      <div className={autoCardClass(hasSheet2('BACK_HIP'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">몸통 (Trunk)</span>
                            {autoTag(hasSheet2('BACK_HIP'))}
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            최종: {rebaResult.trunkScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 직립' },
                            { v: 2, l: '2점: 0-20° 굴곡/신전' },
                            { v: 3, l: '3점: 20-60° 굴곡 / 20°+ 신전' },
                            { v: 4, l: '4점: 60°+ 굴곡' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="reba-trunk" value={o.v}
                                checked={reba.trunkBase === o.v}
                                onChange={() => setReba({ ...reba, trunkBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-2 pt-2 border-t">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={reba.trunkTwist}
                              onChange={e => setReba({ ...reba, trunkTwist: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            비틀림 (+1)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={reba.trunkSideBend}
                              onChange={e => setReba({ ...reba, trunkSideBend: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            옆기울임 (+1)
                          </label>
                        </div>
                      </div>

                      {/* 다리 */}
                      <div className={autoCardClass(false)}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">다리 (Legs)</span>
                            {autoTag(false)}
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            최종: {rebaResult.legScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 양측 체중지지' },
                            { v: 2, l: '2점: 한쪽 체중지지' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="reba-leg" value={o.v}
                                checked={reba.legBase === o.v}
                                onChange={() => setReba({ ...reba, legBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-xs text-gray-600 block mb-1.5">무릎 굴곡 조정:</span>
                          <div className="space-y-1">
                            {[
                              { v: 0, l: '없음' },
                              { v: 1, l: '+1: 30-60° 무릎 굴곡' },
                              { v: 2, l: '+2: 60°+ 무릎 굴곡' },
                            ].map(o => (
                              <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                                <input type="radio" name="reba-legknee" value={o.v}
                                  checked={reba.legKnee === o.v}
                                  onChange={() => setReba({ ...reba, legKnee: o.v })}
                                  className="w-3.5 h-3.5"
                                />
                                {o.l}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Force/Load A */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 p-3 bg-purple-50/50 rounded border border-purple-100 border-l-4 border-l-amber-400">
                      {autoTag(false)}
                      <div className="flex items-center gap-2 text-sm">
                        <span>힘/부하:</span>
                        <select value={reba.forceLoad}
                          onChange={e => setReba({ ...reba, forceLoad: parseInt(e.target.value) })}
                          className="px-2 py-1 border rounded text-sm bg-white">
                          <option value={0}>0: &lt;5kg</option>
                          <option value={1}>+1: 5-10kg</option>
                          <option value={2}>+2: &gt;10kg</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={reba.forceShock}
                          onChange={e => setReba({ ...reba, forceShock: e.target.checked })}
                          className="w-4 h-4 rounded" />
                        충격/급격한 힘 (+1)
                      </label>
                    </div>
                  </div>

                  <hr />

                  {/* Group B: 상완/전완/손목 */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      그룹 B: 상완/전완/손목
                      <span className="text-xs font-normal text-gray-500">
                        Table B = {rebaResult.tableB} → Score B = {rebaResult.scoreB}
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 상완 */}
                      <div className={autoCardClass(hasSheet2('SHOULDER_ARM'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">상완 (Upper Arm)</span>
                            {autoTag(hasSheet2('SHOULDER_ARM'))}
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            최종: {rebaResult.upperArmScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 20° 신전 ~ 20° 굴곡' },
                            { v: 2, l: '2점: 20°+ 신전 또는 20-45° 굴곡' },
                            { v: 3, l: '3점: 45-90° 굴곡' },
                            { v: 4, l: '4점: 90°+ 굴곡' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="reba-upperarm" value={o.v}
                                checked={reba.upperArmBase === o.v}
                                onChange={() => setReba({ ...reba, upperArmBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-2 pt-2 border-t flex-wrap">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={reba.upperArmRaised}
                              onChange={e => setReba({ ...reba, upperArmRaised: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            어깨 올림 (+1)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={reba.upperArmAbducted}
                              onChange={e => setReba({ ...reba, upperArmAbducted: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            팔 벌림 (+1)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={reba.upperArmSupported}
                              onChange={e => setReba({ ...reba, upperArmSupported: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            팔 지지 (-1)
                          </label>
                        </div>
                      </div>

                      {/* 전완 */}
                      <div className={autoCardClass(hasSheet2('ELBOW_FOREARM'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">전완 (Lower Arm)</span>
                            {autoTag(hasSheet2('ELBOW_FOREARM'))}
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            점수: {reba.forearmScore}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 60-100° 굴곡' },
                            { v: 2, l: '2점: 60° 미만 또는 100° 초과' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="reba-forearm" value={o.v}
                                checked={reba.forearmScore === o.v}
                                onChange={() => setReba({ ...reba, forearmScore: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 손목 */}
                      <div className={autoCardClass(hasSheet2('HAND_WRIST'))}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700">손목 (Wrist)</span>
                            {autoTag(hasSheet2('HAND_WRIST'))}
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            최종: {rebaResult.wristScore}점
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { v: 1, l: '1점: 0-15° 굴곡/신전' },
                            { v: 2, l: '2점: 15°+ 굴곡/신전' },
                          ].map(o => (
                            <label key={o.v} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name="reba-wrist" value={o.v}
                                checked={reba.wristBase === o.v}
                                onChange={() => setReba({ ...reba, wristBase: o.v })}
                                className="w-3.5 h-3.5"
                              />
                              {o.l}
                            </label>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={reba.wristTwist}
                              onChange={e => setReba({ ...reba, wristTwist: e.target.checked })}
                              className="w-3.5 h-3.5 rounded" />
                            비틀림/편향 (+1)
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Coupling */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 p-3 bg-purple-50/50 rounded border border-purple-100 border-l-4 border-l-amber-400">
                      {autoTag(false)}
                      <div className="flex items-center gap-2 text-sm">
                        <span>커플링 (손잡이):</span>
                        <select value={reba.couplingScore}
                          onChange={e => setReba({ ...reba, couplingScore: parseInt(e.target.value) })}
                          className="px-2 py-1 border rounded text-sm bg-white">
                          <option value={0}>0: 양호</option>
                          <option value={1}>+1: 보통</option>
                          <option value={2}>+2: 불충분</option>
                          <option value={3}>+3: 부적절</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* Activity Score */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3">활동 점수 (Activity Score: +{rebaResult.activityScore})</h4>
                    <div className="flex flex-wrap items-center gap-4 p-3 bg-purple-50/50 rounded border border-purple-100 border-l-4 border-l-amber-400">
                      {autoTag(false)}
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={reba.activityStatic}
                          onChange={e => setReba({ ...reba, activityStatic: e.target.checked })}
                          className="w-4 h-4 rounded" />
                        정적 자세 &gt;1분 (+1)
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={reba.activityRepeated}
                          onChange={e => setReba({ ...reba, activityRepeated: e.target.checked })}
                          className="w-4 h-4 rounded" />
                        반복 동작 4회+/분 (+1)
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={reba.activityRapid}
                          onChange={e => setReba({ ...reba, activityRapid: e.target.checked })}
                          className="w-4 h-4 rounded" />
                        급격한 자세 변경 (+1)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========== 밀고당기기 ========== */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">밀고당기기 평가</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      각 측정값에 대해 평가 부위(팔/손/손가락)를 선택하세요
                    </p>
                  </div>
                  {renderSaveButton('pushpull', '밀고당기기')}
                </div>

                <div className="p-4">
                  {pushPullMeasurements.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      등록된 밀고당기기 측정값이 없습니다. 두번째 탭에서 밀고당기기 항목을 추가하세요.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2">
                        <div className="col-span-3">물체명칭</div>
                        <div className="col-span-2 text-right">힘 (kgf)</div>
                        <div className="col-span-2 text-right">빈도 (회/일)</div>
                        <div className="col-span-3">평가 부위</div>
                        <div className="col-span-2 text-center">판정</div>
                      </div>

                      {pushPullMeasurements.map((m) => {
                        const evalItem = pushPullEvals.find(e => e.measurementId === m.id)
                        const bodyPart = evalItem?.bodyPart || 'arm'
                        const force = m.force ?? 0
                        const result = evaluatePushPull(force, bodyPart)

                        return (
                          <div key={m.id} className="grid grid-cols-12 gap-2 items-center px-2 py-2 rounded border bg-white">
                            <div className="col-span-3 text-sm font-medium text-gray-700 truncate">{m.name}</div>
                            <div className="col-span-2 text-sm text-right">{force} kgf</div>
                            <div className="col-span-2 text-sm text-right text-gray-500">{m.frequency ?? '-'}</div>
                            <div className="col-span-3">
                              <select
                                value={bodyPart}
                                onChange={(e) => {
                                  const newBodyPart = e.target.value as 'arm' | 'hand' | 'finger'
                                  const newResult = evaluatePushPull(force, newBodyPart)
                                  setPushPullEvals(prev => {
                                    const existing = prev.find(ev => ev.measurementId === m.id)
                                    if (existing) {
                                      return prev.map(ev => ev.measurementId === m.id
                                        ? { ...ev, bodyPart: newBodyPart, result: newResult }
                                        : ev
                                      )
                                    }
                                    return [...prev, { measurementId: m.id, bodyPart: newBodyPart, force, result: newResult }]
                                  })
                                }}
                                className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                              >
                                <option value="arm">팔</option>
                                <option value="hand">손</option>
                                <option value="finger">손가락</option>
                              </select>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${getResultBadgeColor(result)}`}>
                                {result}
                              </span>
                            </div>
                          </div>
                        )
                      })}

                      {/* 기준 안내 */}
                      <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
                        <div><span className="font-medium">팔:</span> 없음(0) / 안전(&lt;9kgf) / 보통(&lt;14.5kgf) / 위험(&lt;23kgf) / 고위험(≥23kgf)</div>
                        <div><span className="font-medium">손:</span> 없음(0) / 안전(&lt;5kgf) / 위험(≥5kgf)</div>
                        <div><span className="font-medium">손가락:</span> 없음(0) / 안전(&lt;1kgf) / 위험(≥1kgf)</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
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
