'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export function AnalyzeButton() {
  const router = useRouter()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setResult(null)

    try {
      const res = await fetch('/api/briefing/analyze', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        if (data.alreadyExists) {
          setResult('오늘 리포트가 이미 존재합니다')
        } else {
          setResult(`분석 완료: ${data.articleCount}건 → ${data.topIssues?.length || 0}개 이슈`)
        }
        router.refresh()
      } else {
        setResult('분석 실패: ' + (data.error || '알 수 없는 오류'))
      }
    } catch {
      setResult('분석 중 오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
      setTimeout(() => setResult(null), 5000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-sm text-gray-600">{result}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="gap-2"
      >
        <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
        {isAnalyzing ? 'AI 분석 중...' : 'AI 분석'}
      </Button>
    </div>
  )
}
