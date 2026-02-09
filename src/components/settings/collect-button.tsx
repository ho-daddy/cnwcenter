'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function CollectButton() {
  const router = useRouter()
  const [isCollecting, setIsCollecting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleCollect = async () => {
    setIsCollecting(true)
    setResult(null)

    try {
      const res = await fetch('/api/briefing/collect', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setResult(`${data.totalCollected}건 수집 완료`)
        router.refresh()
      } else {
        setResult('수집 실패: ' + (data.error || '알 수 없는 오류'))
      }
    } catch {
      setResult('수집 중 오류가 발생했습니다')
    } finally {
      setIsCollecting(false)
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
        onClick={handleCollect}
        disabled={isCollecting}
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isCollecting ? 'animate-spin' : ''}`} />
        {isCollecting ? '수집 중...' : '수집 실행'}
      </Button>
    </div>
  )
}
