'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Save,
  CheckCircle,
  Calculator,
  BarChart3,
} from 'lucide-react'
import {
  getScoreLevel,
  SCORE_LEVEL_INFO,
} from '@/types/musculoskeletal'

// Suspense wrapper for useSearchParams
export default function ElementWorkDetailPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ElementWorkDetailPage />
    </Suspense>
  )
}

interface ElementWork {
  id: string
  name: string
  description: string | null
  sortOrder: number
  bodyPartScores: BodyPartScore[]
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
  assessment: {
    id: string
    workplaceId: string
    organizationUnit: {
      name: string
    }
  }
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

const BODY_PARTS = [
  { id: 'HAND_WRIST', name: '손/손목', icon: '✋' },
  { id: 'ELBOW_FOREARM', name: '팔꿈치/아래팔', icon: '💪' },
  { id: 'SHOULDER_ARM', name: '어깨/위팔', icon: '🦾' },
  { id: 'NECK', name: '목', icon: '🦒' },
  { id: 'BACK_HIP', name: '허리/고관절', icon: '🦴' },
  { id: 'KNEE_ANKLE', name: '무릎/발목', icon: '🦵' },
] as const

// Default values for each body part
const DEFAULT_ANGLES: Record<string, Record<string, number>> = {
  HAND_WRIST: { flexion: 0, extension: 0, adduction: 0, abduction: 0 },
  ELBOW_FOREARM: { flexion: 60, pronation: 0, supination: 0 },
  SHOULDER_ARM: { neutral: 0, flexion: 0, extension: 0, abduction: 0, adduction: 0, externalRotation: 0, internalRotation: 0 },
  NECK: { neutral: 0, flexion: 0, extension: 0, rotation: 0, lateralTilt: 0 },
  BACK_HIP: { flexion: 0, extension: 0, rotation: 0, lateralTilt: 0 },
  KNEE_ANKLE: { kneelingTime: 0, climbingCount: 0, drivingHours: 0, walkingHours: 0 },
}

const DEFAULT_FACTORS: Record<string, Record<string, boolean>> = {
  HAND_WRIST: { toolOver1kg: false, toolOver2kg: false, toolVibration: false, fingerGrip: false, excessiveExtension: false, contactPressure: false, slipperyGlove: false, hammerUse: false },
  ELBOW_FOREARM: { toolOver1kg: false, toolVibration: false, heavyWristRotation: false, elbowPressure: false, pushPull: false, hammerWork: false },
  SHOULDER_ARM: { toolOver1kg: false, toolVibration: false, contactPressure: false, excessiveExtension: false, shoulderRaised: false, bendAndReach: false, lyingPosition: false, shoulderCarry: false, heavyLift: false, heavyCarry: false, heavyPushPull: false },
  NECK: { handsAboveShoulder: false, bendAndReach: false, confinedSpace: false, shoulderCarry: false, combinedMovement: false, shoulderHeavyCarry: false },
  BACK_HIP: { wholeBodyVibration: false, kneelSquat: false, heavyOver5kg: false, heavyOver10kg: false, heavyOver20kg: false, handsAboveShoulder: false, bendAndReach: false, backCarry: false, combinedMovement: false, poorSurface: false },
  KNEE_ANKLE: { kneeTwist: false, confinedSpace: false, heavyOver10kg: false, heavyOver20kg: false, unstableSurface: false, kneePressure: false },
}

// Angle field configurations for each body part
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
    { key: 'walkingHours', label: '걷기', min: 0, max: 8, unit: '시간/일' },
  ],
}

// Factor field labels for each body part
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

const TABS = [
  { id: 'sheet2', label: '2.부위별점수', icon: Calculator },
  { id: 'sheet3', label: '3.RULA/REBA', icon: BarChart3 },
]

function ElementWorkDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const assessmentId = params.id as string
  const workId = params.workId as string
  const initialTab = searchParams.get('tab') || 'sheet2'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [elementWork, setElementWork] = useState<ElementWork | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set())
  const [savingPart, setSavingPart] = useState<string | null>(null)

  // State for each body part's angles and factors (Sheet2)
  const [bodyPartData, setBodyPartData] = useState<
    Record<string, { angles: Record<string, number>; factors: Record<string, boolean> }>
  >({})

  // State for RULA/REBA (Sheet3)
  const [rulaInputs, setRulaInputs] = useState({
    upperArmScore: 1,
    forearmScore: 1,
    wristScore: 1,
    wristTwist: 1,
    muscleUseA: false,
    forceLoadA: 0,
    neckScore: 1,
    trunkScore: 1,
    legScore: 1,
    muscleUseB: false,
    forceLoadB: 0,
  })
  const [rebaInputs, setRebaInputs] = useState({
    neckScore: 1,
    trunkScore: 1,
    legScore: 1,
    forceLoadA: 0,
    upperArmScore: 1,
    forearmScore: 1,
    wristScore: 1,
    couplingScore: 0,
  })
  const [additionalFactors, setAdditionalFactors] = useState({
    hasArmSupport: false,
    hasUnstableLeg: false,
    hasRapidPosture: false,
    hasRapidForce: false,
  })
  const [pushPullForce, setPushPullForce] = useState(0)
  const [isSavingSheet3, setIsSavingSheet3] = useState(false)

  // Fetch element work details
  useEffect(() => {
    const fetchData = async () => {
      try {
        const assessmentRes = await fetch(`/api/musculoskeletal/${assessmentId}`)
        if (!assessmentRes.ok) {
          throw new Error('조사를 찾을 수 없습니다.')
        }
        const assessmentData = await assessmentRes.json()
        const workplaceId = assessmentData.assessment.workplace.id

        const workRes = await fetch(
          `/api/workplaces/${workplaceId}/musculoskeletal/${assessmentId}/element-works/${workId}`
        )
        if (!workRes.ok) {
          throw new Error('요소작업을 찾을 수 없습니다.')
        }
        const workData = await workRes.json()
        const work = {
          ...workData.elementWork,
          assessment: {
            id: assessmentId,
            workplaceId,
            organizationUnit: assessmentData.assessment.organizationUnit,
          },
        }
        setElementWork(work)

        // Initialize body part data from existing scores
        const initialData: Record<string, { angles: Record<string, number>; factors: Record<string, boolean> }> = {}
        BODY_PARTS.forEach((part) => {
          const existingScore = workData.elementWork.bodyPartScores?.find(
            (s: BodyPartScore) => s.bodyPart === part.id
          )
          initialData[part.id] = {
            angles: existingScore?.angles || { ...DEFAULT_ANGLES[part.id] },
            factors: existingScore?.additionalFactors || { ...DEFAULT_FACTORS[part.id] },
          }
        })
        setBodyPartData(initialData)

        // Initialize Sheet3 additional factors
        setAdditionalFactors({
          hasArmSupport: work.hasArmSupport || false,
          hasUnstableLeg: work.hasUnstableLeg || false,
          hasRapidPosture: work.hasRapidPosture || false,
          hasRapidForce: work.hasRapidForce || false,
        })
      } catch (error) {
        console.error('데이터 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [assessmentId, workId])

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

  const handleSaveBodyPart = async (partId: string) => {
    if (!elementWork) return

    setSavingPart(partId)
    try {
      const res = await fetch(
        `/api/workplaces/${elementWork.assessment.workplaceId}/musculoskeletal/${assessmentId}/element-works/${workId}/sheet2`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bodyPart: partId,
            angles: bodyPartData[partId].angles,
            additionalFactors: bodyPartData[partId].factors,
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        setElementWork((prev) => {
          if (!prev) return prev
          const existingIdx = prev.bodyPartScores.findIndex((s) => s.bodyPart === partId)
          const newScores = [...prev.bodyPartScores]
          if (existingIdx >= 0) {
            newScores[existingIdx] = data.bodyPartScore
          } else {
            newScores.push(data.bodyPartScore)
          }
          return { ...prev, bodyPartScores: newScores }
        })
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

  const handleSaveSheet3 = async (type: 'rula' | 'reba' | 'pushpull') => {
    if (!elementWork) return

    setIsSavingSheet3(true)
    try {
      const body: Record<string, unknown> = {
        ...additionalFactors,
      }

      if (type === 'rula') {
        body.rulaInputs = rulaInputs
      } else if (type === 'reba') {
        body.rebaInputs = rebaInputs
      } else if (type === 'pushpull') {
        body.pushPullForce = pushPullForce
      }

      const res = await fetch(
        `/api/workplaces/${elementWork.assessment.workplaceId}/musculoskeletal/${assessmentId}/element-works/${workId}/sheet3`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (res.ok) {
        const data = await res.json()
        setElementWork((prev) => {
          if (!prev) return prev
          return { ...prev, ...data.elementWork }
        })
        alert('저장되었습니다.')
      } else {
        const error = await res.json()
        alert(error.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSavingSheet3(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!elementWork) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <p className="text-gray-500">요소작업을 찾을 수 없습니다.</p>
        <Button className="mt-4" onClick={() => router.back()}>
          뒤로가기
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{elementWork.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {elementWork.assessment.organizationUnit.name} · 요소작업 #{elementWork.sortOrder}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Sheet2 Content */}
      {activeTab === 'sheet2' && (
        <>
          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <p className="text-sm text-blue-800">
                각 부담부위를 클릭하여 펼치고, 해당 작업시의 자세 각도와 부가요인을 입력하세요.
                입력 후 각 부위별로 저장 버튼을 클릭하면 점수가 자동으로 계산됩니다.
              </p>
            </CardContent>
          </Card>

          {/* Body Parts Accordion */}
          <div className="space-y-3">
            {BODY_PARTS.map((part) => {
              const isExpanded = expandedParts.has(part.id)
              const existingScore = elementWork.bodyPartScores.find((s) => s.bodyPart === part.id)
              const scoreLevel = existingScore ? getScoreLevel(existingScore.totalScore) : null
              const levelInfo = scoreLevel ? SCORE_LEVEL_INFO[scoreLevel] : null

              return (
                <Card key={part.id} className="overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => togglePart(part.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{part.icon}</span>
                      <div>
                        <span className="font-medium text-gray-900">{part.name}</span>
                        {existingScore && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${levelInfo?.color || ''}`}>
                              {existingScore.totalScore}점 ({levelInfo?.label})
                            </span>
                            <span className="text-xs text-gray-500">
                              자세 {existingScore.postureScore} + 부가 {existingScore.additionalScore}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {existingScore && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <CardContent className="border-t bg-gray-50 space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          {part.id === 'KNEE_ANKLE' ? '작업 특성' : '자세 각도'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {ANGLE_FIELDS[part.id].map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {field.label} ({field.unit})
                              </label>
                              <input
                                type="number"
                                min={field.min}
                                max={field.max}
                                step={field.key.includes('Count') ? 10 : 1}
                                value={bodyPartData[part.id]?.angles[field.key] ?? 0}
                                onChange={(e) =>
                                  handleAngleChange(part.id, field.key, parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">부가요인</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {Object.entries(FACTOR_LABELS[part.id]).map(([key, label]) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={bodyPartData[part.id]?.factors[key] ?? false}
                                onChange={(e) => handleFactorChange(part.id, key, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t">
                        <Button onClick={() => handleSaveBodyPart(part.id)} disabled={savingPart === part.id}>
                          {savingPart === part.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              저장 중...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              {part.name} 점수 저장
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">점수 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {BODY_PARTS.map((part) => {
                  const score = elementWork.bodyPartScores.find((s) => s.bodyPart === part.id)
                  const level = score ? getScoreLevel(score.totalScore) : null
                  const levelInfo = level ? SCORE_LEVEL_INFO[level] : null

                  return (
                    <div
                      key={part.id}
                      className={`text-center p-3 rounded-lg border ${
                        score ? levelInfo?.color : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="text-xl mb-1">{part.icon}</div>
                      <div className="text-xs text-gray-600 mb-1">{part.name}</div>
                      {score ? (
                        <>
                          <div className="text-2xl font-bold">{score.totalScore}</div>
                          <div className="text-xs">{levelInfo?.label}</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">미입력</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Sheet3 Content - RULA/REBA */}
      {activeTab === 'sheet3' && (
        <>
          {/* Instructions */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="py-4">
              <p className="text-sm text-purple-800">
                RULA와 REBA는 전신 자세를 종합적으로 평가하는 도구입니다.
                각 신체 부위의 점수를 입력하면 자동으로 최종 점수가 계산됩니다.
              </p>
            </CardContent>
          </Card>

          {/* Current Results */}
          {(elementWork.rulaScore !== null || elementWork.rebaScore !== null) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">현재 평가 결과</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {elementWork.rulaScore !== null && (
                    <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="text-sm text-blue-600 mb-1">RULA</div>
                      <div className="text-3xl font-bold text-blue-700">{elementWork.rulaScore}</div>
                      <div className={`text-sm mt-1 px-2 py-0.5 rounded inline-block ${
                        elementWork.rulaLevel === '안전' ? 'bg-green-100 text-green-700' :
                        elementWork.rulaLevel === '보통' ? 'bg-yellow-100 text-yellow-700' :
                        elementWork.rulaLevel === '위험' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {elementWork.rulaLevel}
                      </div>
                    </div>
                  )}
                  {elementWork.rebaScore !== null && (
                    <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                      <div className="text-sm text-purple-600 mb-1">REBA</div>
                      <div className="text-3xl font-bold text-purple-700">{elementWork.rebaScore}</div>
                      <div className={`text-sm mt-1 px-2 py-0.5 rounded inline-block ${
                        elementWork.rebaLevel === '안전' ? 'bg-green-100 text-green-700' :
                        elementWork.rebaLevel === '보통' ? 'bg-yellow-100 text-yellow-700' :
                        elementWork.rebaLevel === '위험' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {elementWork.rebaLevel}
                      </div>
                    </div>
                  )}
                  {elementWork.pushPullArm && (
                    <div className="text-center p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">밀고당기기 (팔)</div>
                      <div className={`text-lg font-bold ${
                        elementWork.pushPullArm === '안전' ? 'text-green-700' :
                        elementWork.pushPullArm === '보통' ? 'text-yellow-700' :
                        elementWork.pushPullArm === '위험' ? 'text-orange-700' :
                        elementWork.pushPullArm === '고위험' ? 'text-red-700' :
                        'text-gray-700'
                      }`}>
                        {elementWork.pushPullArm}
                      </div>
                    </div>
                  )}
                  {elementWork.pushPullHand && (
                    <div className="text-center p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">밀고당기기 (손)</div>
                      <div className={`text-lg font-bold ${
                        elementWork.pushPullHand === '안전' ? 'text-green-700' :
                        elementWork.pushPullHand === '위험' ? 'text-red-700' :
                        'text-gray-700'
                      }`}>
                        {elementWork.pushPullHand}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* RULA Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-blue-700">RULA (Rapid Upper Limb Assessment)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Group A - Upper Limb */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">그룹 A: 상지 (팔/손목)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">상완 점수 (1-6)</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={rulaInputs.upperArmScore}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, upperArmScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">전완 점수 (1-3)</label>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={rulaInputs.forearmScore}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, forearmScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">손목 점수 (1-4)</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={rulaInputs.wristScore}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, wristScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">손목 비틀림 (1-2)</label>
                    <input
                      type="number"
                      min={1}
                      max={2}
                      value={rulaInputs.wristTwist}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, wristTwist: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rulaInputs.muscleUseA}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, muscleUseA: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">근육 사용 (+1)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">힘/부하 (0-3):</span>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={rulaInputs.forceLoadA}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, forceLoadA: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Group B - Neck/Trunk/Legs */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">그룹 B: 목/몸통/다리</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">목 점수 (1-6)</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={rulaInputs.neckScore}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, neckScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">몸통 점수 (1-6)</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={rulaInputs.trunkScore}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, trunkScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">다리 점수 (1-2)</label>
                    <input
                      type="number"
                      min={1}
                      max={2}
                      value={rulaInputs.legScore}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, legScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rulaInputs.muscleUseB}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, muscleUseB: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">근육 사용 (+1)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">힘/부하 (0-3):</span>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={rulaInputs.forceLoadB}
                      onChange={(e) => setRulaInputs({ ...rulaInputs, forceLoadB: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSaveSheet3('rula')} disabled={isSavingSheet3}>
                  {isSavingSheet3 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      계산 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      RULA 점수 계산 및 저장
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* REBA Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-purple-700">REBA (Rapid Entire Body Assessment)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Group A - Trunk/Neck/Legs */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">그룹 A: 몸통/목/다리</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">목 점수 (1-3)</label>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={rebaInputs.neckScore}
                      onChange={(e) => setRebaInputs({ ...rebaInputs, neckScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">몸통 점수 (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={rebaInputs.trunkScore}
                      onChange={(e) => setRebaInputs({ ...rebaInputs, trunkScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">다리 점수 (1-4)</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={rebaInputs.legScore}
                      onChange={(e) => setRebaInputs({ ...rebaInputs, legScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">힘/부하 (0-3)</label>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={rebaInputs.forceLoadA}
                      onChange={(e) => setRebaInputs({ ...rebaInputs, forceLoadA: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Group B - Arms/Wrists */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">그룹 B: 상완/전완/손목</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">상완 점수 (1-6)</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={rebaInputs.upperArmScore}
                      onChange={(e) => setRebaInputs({ ...rebaInputs, upperArmScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">전완 점수 (1-2)</label>
                    <input
                      type="number"
                      min={1}
                      max={2}
                      value={rebaInputs.forearmScore}
                      onChange={(e) => setRebaInputs({ ...rebaInputs, forearmScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">손목 점수 (1-3)</label>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={rebaInputs.wristScore}
                      onChange={(e) => setRebaInputs({ ...rebaInputs, wristScore: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">커플링 (0-3)</label>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={rebaInputs.couplingScore}
                      onChange={(e) => setRebaInputs({ ...rebaInputs, couplingScore: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSaveSheet3('reba')} disabled={isSavingSheet3}>
                  {isSavingSheet3 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      계산 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      REBA 점수 계산 및 저장
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Push-Pull Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">밀고당기기 평가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <label className="block text-sm text-gray-700 mb-2">밀고당기기 힘 (kgf)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={pushPullForce}
                  onChange={(e) => setPushPullForce(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  팔: 9kgf 미만=안전, 14.5kgf 미만=보통, 23kgf 미만=위험, 이상=고위험
                </p>
                <p className="text-xs text-gray-500">
                  손: 5kgf 미만=안전, 이상=위험
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSaveSheet3('pushpull')} disabled={isSavingSheet3}>
                  {isSavingSheet3 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      밀고당기기 평가 저장
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Additional Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">추가 요인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={additionalFactors.hasArmSupport}
                    onChange={(e) => setAdditionalFactors({ ...additionalFactors, hasArmSupport: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">팔이 지탱된 상태에서 작업</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={additionalFactors.hasUnstableLeg}
                    onChange={(e) => setAdditionalFactors({ ...additionalFactors, hasUnstableLeg: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">다리/발이 불안정한 상태</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={additionalFactors.hasRapidPosture}
                    onChange={(e) => setAdditionalFactors({ ...additionalFactors, hasRapidPosture: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">급속 자세 변경 발생</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={additionalFactors.hasRapidForce}
                    onChange={(e) => setAdditionalFactors({ ...additionalFactors, hasRapidForce: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">급격한 힘 사용</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Back Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => router.push(`/musculoskeletal/survey/${assessmentId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          조사 상세로 돌아가기
        </Button>
      </div>
    </div>
  )
}
