'use client'

import { CollectionLog } from '@prisma/client'
import { SourceDefinition, SourceCategory } from '@/types/briefing'
import { CATEGORY_LABELS } from '@/lib/briefing/sources'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CheckCircle, XCircle, Clock, Pause } from 'lucide-react'

interface SourceStatusListProps {
  sources: SourceDefinition[]
  logs: CollectionLog[]
}

export function SourceStatusList({ sources, logs }: SourceStatusListProps) {
  // 소스별 최신 로그 매핑
  const latestLogs = new Map<string, CollectionLog>()
  for (const log of logs) {
    if (!latestLogs.has(log.sourceId)) {
      latestLogs.set(log.sourceId, log)
    }
  }

  // 카테고리별 그룹화
  const groupedSources = sources.reduce((acc, source) => {
    if (!acc[source.category]) {
      acc[source.category] = []
    }
    acc[source.category].push(source)
    return acc
  }, {} as Record<SourceCategory, SourceDefinition[]>)

  const renderStatus = (source: SourceDefinition, log?: CollectionLog) => {
    if (!source.isActive) {
      return (
        <span className="flex items-center gap-1 text-gray-400">
          <Pause className="w-4 h-4" />
          비활성화
        </span>
      )
    }

    if (!log) {
      return (
        <span className="flex items-center gap-1 text-gray-500">
          <Clock className="w-4 h-4" />
          수집 전
        </span>
      )
    }

    if (log.status === 'SUCCESS') {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-4 h-4" />
          {log.articlesCount}건
        </span>
      )
    }

    if (log.status === 'FAILED') {
      return (
        <span className="flex items-center gap-1 text-red-600">
          <XCircle className="w-4 h-4" />
          실패
        </span>
      )
    }

    return (
      <span className="flex items-center gap-1 text-yellow-600">
        <Clock className="w-4 h-4 animate-spin" />
        수집 중
      </span>
    )
  }

  const formatTime = (date: Date | null) => {
    if (!date) return '-'
    return formatDistanceToNow(date, { addSuffix: true, locale: ko })
  }

  return (
    <div className="space-y-6">
      {(Object.entries(groupedSources) as [SourceCategory, SourceDefinition[]][]).map(
        ([category, categorySources]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="bg-white rounded-lg border divide-y">
              {categorySources.map((source) => {
                const log = latestLogs.get(source.id)
                return (
                  <div
                    key={source.id}
                    className={`px-4 py-3 flex items-center justify-between ${
                      !source.isActive ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          source.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {source.name}
                        </div>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate max-w-xs block"
                        >
                          {source.url}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {renderStatus(source, log)}
                      {log?.completedAt && (
                        <span className="text-gray-400 text-xs">
                          {formatTime(log.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}
    </div>
  )
}
