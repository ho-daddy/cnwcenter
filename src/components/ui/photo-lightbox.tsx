'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface PhotoLightboxProps {
  photos: { id: string; photoPath: string }[]
  initialIndex: number
  onClose: () => void
}

export function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const total = photos.length

  const goPrev = useCallback(() => setIndex(i => (i > 0 ? i - 1 : total - 1)), [total])
  const goNext = useCallback(() => setIndex(i => (i < total - 1 ? i + 1 : 0)), [total])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose, goPrev, goNext])

  if (total === 0) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Close button */}
      <button onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      {total > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
          {index + 1} / {total}
        </div>
      )}

      {/* Prev arrow */}
      {total > 1 && (
        <button onClick={goPrev}
          className="absolute left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Image */}
      <div className="relative z-[1] max-w-[90vw] max-h-[85vh] flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[index].photoPath}
          alt={`사진 ${index + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* Next arrow */}
      {total > 1 && (
        <button onClick={goNext}
          className="absolute right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
    </div>
  )
}
