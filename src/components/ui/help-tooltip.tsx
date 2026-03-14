'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpTooltipProps {
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

export function HelpTooltip({ content, side = 'top', className }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isTouched, setIsTouched] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const [mounted, setMounted] = React.useState(false)
  const iconRef = React.useRef<HTMLSpanElement>(null)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = () => {
    if (!iconRef.current) return
    const rect = iconRef.current.getBoundingClientRect()
    setPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
    })
  }

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    updatePosition()
    setIsVisible(true)
  }

  const hide = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(false), 150)
  }

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault()
    updatePosition()
    setIsTouched((prev) => !prev)
    setIsVisible((prev) => !prev)
  }

  React.useEffect(() => {
    if (!isTouched) return
    const handleOutside = () => {
      setIsTouched(false)
      setIsVisible(false)
    }
    document.addEventListener('touchstart', handleOutside)
    return () => document.removeEventListener('touchstart', handleOutside)
  }, [isTouched])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const getTooltipStyle = (): React.CSSProperties => {
    const offset = 8
    const iconSize = 16
    
    switch (side) {
      case 'top':
        return {
          top: position.top - offset,
          left: position.left + iconSize / 2,
          transform: 'translate(-50%, -100%)',
        }
      case 'bottom':
        return {
          top: position.top + iconSize + offset,
          left: position.left + iconSize / 2,
          transform: 'translateX(-50%)',
        }
      case 'left':
        return {
          top: position.top + iconSize / 2,
          left: position.left - offset,
          transform: 'translate(-100%, -50%)',
        }
      case 'right':
        return {
          top: position.top + iconSize / 2,
          left: position.left + iconSize + offset,
          transform: 'translateY(-50%)',
        }
      default:
        return {}
    }
  }

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent',
  }

  const tooltipContent = isVisible && mounted ? (
    <span
      style={getTooltipStyle()}
      className={cn(
        'fixed z-[9999] w-max max-w-[300px] px-3 py-2 text-xs leading-relaxed text-white bg-gray-800 rounded-lg shadow-lg whitespace-pre-line pointer-events-none',
      )}
      role="tooltip"
    >
      {content}
      <span className={cn('absolute border-4', arrowClasses[side])} />
    </span>
  ) : null

  return (
    <>
      <span
        ref={iconRef}
        className={cn('inline-flex items-center', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onTouchStart={handleTouch}
      >
        <HelpCircle
          className="h-4 w-4 text-gray-400 hover:text-blue-500 cursor-help transition-colors"
          aria-label="도움말"
        />
      </span>
      {mounted && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  )
}
