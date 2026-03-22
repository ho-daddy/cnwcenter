'use client'

import { useContext } from 'react'
import { TutorialContext } from '@/components/tutorial/TutorialProvider'

export function useTutorial() {
  return useContext(TutorialContext)
}
