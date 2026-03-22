'use client'

import React, { createContext, useState, useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TutorialId, tutorialSteps, TUTORIAL_START_PAGES } from './tutorial-steps'
import { TutorialOverlay } from './TutorialOverlay'

interface TutorialContextValue {
  /** Start a specific tutorial */
  startTutorial: (id: TutorialId) => void
  /** Whether any tutorial is currently active */
  isActive: boolean
  /** The currently active tutorial id */
  activeTutorial: TutorialId | null
}

export const TutorialContext = createContext<TutorialContextValue>({
  startTutorial: () => {},
  isActive: false,
  activeTutorial: null,
})

const STORAGE_KEY_PREFIX = 'tutorial_completed_'

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [activeTutorial, setActiveTutorial] = useState<TutorialId | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  // Auto-start tutorial on first visit
  useEffect(() => {
    if (activeTutorial) return

    const tutorialMap: Record<string, TutorialId> = {
      '/risk-assessment/conduct': 'riskAssessment',
      '/musculoskeletal/survey': 'musculoskeletal',
      '/workplaces': 'workplaces',
    }

    const tutorialId = tutorialMap[pathname]
    if (!tutorialId) return

    try {
      const completed = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tutorialId}`)
      if (!completed) {
        // Small delay to let the page render first
        const timer = setTimeout(() => {
          setActiveTutorial(tutorialId)
          setCurrentStep(0)
        }, 800)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage not available
    }
  }, [pathname, activeTutorial])

  const startTutorial = useCallback((id: TutorialId) => {
    const targetPage = TUTORIAL_START_PAGES[id]
    if (pathname !== targetPage) {
      router.push(targetPage)
    }
    // Small delay to let navigation complete
    setTimeout(() => {
      setActiveTutorial(id)
      setCurrentStep(0)
    }, pathname !== targetPage ? 500 : 100)
  }, [pathname, router])

  const handleNext = useCallback(() => {
    if (!activeTutorial) return
    const steps = tutorialSteps[activeTutorial]
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleClose()
    }
  }, [activeTutorial, currentStep])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleClose = useCallback(() => {
    if (activeTutorial) {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${activeTutorial}`, 'true')
      } catch {
        // localStorage not available
      }
    }
    setActiveTutorial(null)
    setCurrentStep(0)
  }, [activeTutorial])

  const steps = activeTutorial ? tutorialSteps[activeTutorial] : []
  const step = steps[currentStep] || null

  return (
    <TutorialContext.Provider value={{ startTutorial, isActive: !!activeTutorial, activeTutorial }}>
      {children}
      {activeTutorial && step && (
        <TutorialOverlay
          step={step}
          currentStep={currentStep}
          totalSteps={steps.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={handleClose}
        />
      )}
    </TutorialContext.Provider>
  )
}
