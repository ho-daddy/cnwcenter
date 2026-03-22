'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { TutorialStep } from './tutorial-steps'

interface TutorialOverlayProps {
  step: TutorialStep
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

export function TutorialOverlay({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onClose,
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const calculatePosition = useCallback(() => {
    if (step.isModal || !step.target) {
      setTargetRect(null)
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      })
      return
    }

    const el = document.querySelector(step.target)
    if (!el) {
      setTargetRect(null)
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      })
      return
    }

    // Scroll element into view if needed
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

    const rect = el.getBoundingClientRect()
    const padding = 8
    setTargetRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })

    // Calculate tooltip position
    const tooltipWidth = 360
    const tooltipHeight = 200
    const gap = 16
    const placement = step.placement || 'bottom'

    let top = 0
    let left = 0

    switch (placement) {
      case 'bottom':
        top = rect.bottom + gap
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case 'top':
        top = rect.top - tooltipHeight - gap
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2
        left = rect.right + gap
        break
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2
        left = rect.left - tooltipWidth - gap
        break
    }

    // Clamp to viewport
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (left < 16) left = 16
    if (left + tooltipWidth > vw - 16) left = vw - tooltipWidth - 16
    if (top < 16) top = 16
    if (top + tooltipHeight > vh - 16) top = vh - tooltipHeight - 16

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
    })
  }, [step])

  useEffect(() => {
    calculatePosition()

    // Recalculate on resize/scroll
    const handleResize = () => calculatePosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
    }
  }, [calculatePosition])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext()
      if (e.key === 'ArrowLeft' && currentStep > 0) onPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrev, currentStep])

  if (!mounted) return null

  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  const overlay = (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tutorial-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tutorial-spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={onClose}
        />
      </svg>

      {/* Highlight border around target */}
      {targetRect && (
        <div
          className="absolute rounded-lg ring-2 ring-blue-500 ring-offset-2"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            pointerEvents: 'none',
            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[360px] max-w-[calc(100vw-32px)] animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ ...tooltipStyle, zIndex: 10000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            {currentStep + 1} / {totalSteps}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-3">
          <h3 className="text-base font-semibold text-gray-900 mb-1.5">{step.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{step.content}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            건너뛰기
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>
            )}
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {isLast ? '완료' : '다음'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
