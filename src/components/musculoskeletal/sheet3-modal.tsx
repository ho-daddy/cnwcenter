'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Loader2, Save } from 'lucide-react'

interface ElementWork {
  id: string
  name: string
  rulaScore?: number | null
  rulaLevel?: string | null
  rebaScore?: number | null
  rebaLevel?: string | null
  pushPullArm?: string | null
  pushPullHand?: string | null
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

export function Sheet3Modal({
  isOpen,
  onClose,
  workplaceId,
  assessmentId,
  elementWork,
  onSave,
}: Sheet3ModalProps) {
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
  const [isSaving, setIsSaving] = useState(false)
  const [localResults, setLocalResults] = useState({
    rulaScore: elementWork.rulaScore,
    rulaLevel: elementWork.rulaLevel,
    rebaScore: elementWork.rebaScore,
    rebaLevel: elementWork.rebaLevel,
    pushPullArm: elementWork.pushPullArm,
    pushPullHand: elementWork.pushPullHand,
  })

  // Initialize from element work
  useEffect(() => {
    setAdditionalFactors({
      hasArmSupport: elementWork.hasArmSupport || false,
      hasUnstableLeg: elementWork.hasUnstableLeg || false,
      hasRapidPosture: elementWork.hasRapidPosture || false,
      hasRapidForce: elementWork.hasRapidForce || false,
    })
    setLocalResults({
      rulaScore: elementWork.rulaScore,
      rulaLevel: elementWork.rulaLevel,
      rebaScore: elementWork.rebaScore,
      rebaLevel: elementWork.rebaLevel,
      pushPullArm: elementWork.pushPullArm,
      pushPullHand: elementWork.pushPullHand,
    })
  }, [elementWork])

  if (!isOpen) return null

  const handleSave = async (type: 'rula' | 'reba' | 'pushpull') => {
    setIsSaving(true)
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
        `/api/workplaces/${workplaceId}/musculoskeletal/${assessmentId}/element-works/${elementWork.id}/sheet3`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (res.ok) {
        const data = await res.json()
        setLocalResults({
          rulaScore: data.elementWork.rulaScore,
          rulaLevel: data.elementWork.rulaLevel,
          rebaScore: data.elementWork.rebaScore,
          rebaLevel: data.elementWork.rebaLevel,
          pushPullArm: data.elementWork.pushPullArm,
          pushPullHand: data.elementWork.pushPullHand,
        })
        onSave()
      } else {
        const error = await res.json()
        alert(error.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const getLevelColor = (level: string | null | undefined) => {
    if (!level) return 'bg-gray-100 text-gray-600'
    switch (level) {
      case '안전':
        return 'bg-green-100 text-green-700'
      case '보통':
        return 'bg-yellow-100 text-yellow-700'
      case '위험':
        return 'bg-orange-100 text-orange-700'
      case '고위험':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-600'
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
            <h2 className="text-lg font-bold text-gray-900">RULA/REBA 평가</h2>
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
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Current Results */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-sm text-blue-600">RULA</div>
              <div className="text-2xl font-bold text-blue-700">
                {localResults.rulaScore ?? '-'}
              </div>
              {localResults.rulaLevel && (
                <div className={`text-xs px-2 py-0.5 rounded inline-block ${getLevelColor(localResults.rulaLevel)}`}>
                  {localResults.rulaLevel}
                </div>
              )}
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
              <div className="text-sm text-purple-600">REBA</div>
              <div className="text-2xl font-bold text-purple-700">
                {localResults.rebaScore ?? '-'}
              </div>
              {localResults.rebaLevel && (
                <div className={`text-xs px-2 py-0.5 rounded inline-block ${getLevelColor(localResults.rebaLevel)}`}>
                  {localResults.rebaLevel}
                </div>
              )}
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-sm text-gray-600">밀당(팔)</div>
              <div className={`text-lg font-bold ${getLevelColor(localResults.pushPullArm)}`}>
                {localResults.pushPullArm || '-'}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-sm text-gray-600">밀당(손)</div>
              <div className={`text-lg font-bold ${getLevelColor(localResults.pushPullHand)}`}>
                {localResults.pushPullHand || '-'}
              </div>
            </div>
          </div>

          {/* RULA Input */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-blue-700 mb-4">RULA (Rapid Upper Limb Assessment)</h3>

            {/* Group A */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">그룹 A: 상지 (팔/손목)</h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">상완 (1-6)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={rulaInputs.upperArmScore}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, upperArmScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">전완 (1-3)</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={rulaInputs.forearmScore}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, forearmScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">손목 (1-4)</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={rulaInputs.wristScore}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, wristScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">손목비틀림 (1-2)</label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    value={rulaInputs.wristTwist}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, wristTwist: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rulaInputs.muscleUseA}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, muscleUseA: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  근육 사용 (+1)
                </label>
                <div className="flex items-center gap-2 text-sm">
                  힘/부하 (0-3):
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={rulaInputs.forceLoadA}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, forceLoadA: parseInt(e.target.value) || 0 })}
                    className="w-14 px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Group B */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">그룹 B: 목/몸통/다리</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">목 (1-6)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={rulaInputs.neckScore}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, neckScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">몸통 (1-6)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={rulaInputs.trunkScore}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, trunkScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">다리 (1-2)</label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    value={rulaInputs.legScore}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, legScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rulaInputs.muscleUseB}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, muscleUseB: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  근육 사용 (+1)
                </label>
                <div className="flex items-center gap-2 text-sm">
                  힘/부하 (0-3):
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={rulaInputs.forceLoadB}
                    onChange={(e) => setRulaInputs({ ...rulaInputs, forceLoadB: parseInt(e.target.value) || 0 })}
                    className="w-14 px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => handleSave('rula')} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                RULA 계산 및 저장
              </Button>
            </div>
          </div>

          {/* REBA Input */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-purple-700 mb-4">REBA (Rapid Entire Body Assessment)</h3>

            {/* Group A */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">그룹 A: 몸통/목/다리</h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">목 (1-3)</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={rebaInputs.neckScore}
                    onChange={(e) => setRebaInputs({ ...rebaInputs, neckScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">몸통 (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={rebaInputs.trunkScore}
                    onChange={(e) => setRebaInputs({ ...rebaInputs, trunkScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">다리 (1-4)</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={rebaInputs.legScore}
                    onChange={(e) => setRebaInputs({ ...rebaInputs, legScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
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
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Group B */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">그룹 B: 상완/전완/손목</h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">상완 (1-6)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={rebaInputs.upperArmScore}
                    onChange={(e) => setRebaInputs({ ...rebaInputs, upperArmScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">전완 (1-2)</label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    value={rebaInputs.forearmScore}
                    onChange={(e) => setRebaInputs({ ...rebaInputs, forearmScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">손목 (1-3)</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={rebaInputs.wristScore}
                    onChange={(e) => setRebaInputs({ ...rebaInputs, wristScore: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border rounded text-sm"
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
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => handleSave('reba')} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                REBA 계산 및 저장
              </Button>
            </div>
          </div>

          {/* Push-Pull */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-4">밀고당기기 평가</h3>
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
              <p className="text-xs text-gray-500">손: 5kgf 미만=안전, 이상=위험</p>
            </div>
            <div className="flex justify-end mt-4">
              <Button size="sm" onClick={() => handleSave('pushpull')} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                밀고당기기 저장
              </Button>
            </div>
          </div>

          {/* Additional Factors */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">추가 요인</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={additionalFactors.hasArmSupport}
                  onChange={(e) => setAdditionalFactors({ ...additionalFactors, hasArmSupport: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">팔이 지탱된 상태에서 작업</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={additionalFactors.hasUnstableLeg}
                  onChange={(e) => setAdditionalFactors({ ...additionalFactors, hasUnstableLeg: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">다리/발이 불안정한 상태</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={additionalFactors.hasRapidPosture}
                  onChange={(e) => setAdditionalFactors({ ...additionalFactors, hasRapidPosture: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">급속 자세 변경 발생</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={additionalFactors.hasRapidForce}
                  onChange={(e) => setAdditionalFactors({ ...additionalFactors, hasRapidForce: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">급격한 힘 사용</span>
              </label>
            </div>
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
