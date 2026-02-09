import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Newspaper, ExternalLink, AlertTriangle, AlertCircle, Info, Circle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { NewsBriefing } from '@prisma/client'

interface BriefingWidgetProps {
  items: NewsBriefing[]
}

const PRIORITY_CONFIG = {
  critical: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: 'text-red-500',
    bg: 'bg-red-50',
    label: '긴급',
  },
  high: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    label: '높음',
  },
  medium: {
    icon: <Info className="w-3.5 h-3.5" />,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    label: '보통',
  },
  low: {
    icon: <Circle className="w-3.5 h-3.5" />,
    color: 'text-green-500',
    bg: 'bg-green-50',
    label: '낮음',
  },
}

export function BriefingWidget({ items }: BriefingWidgetProps) {
  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Newspaper className="w-5 h-5 text-green-600" />
          최근 수집 기사
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const priority = item.priority as keyof typeof PRIORITY_CONFIG | null
            const config = priority && PRIORITY_CONFIG[priority]

            return (
              <a
                key={item.id}
                href={item.url || '#'}
                target={item.url ? '_blank' : undefined}
                rel={item.url ? 'noopener noreferrer' : undefined}
                className={`block p-3 rounded-lg transition-colors group ${
                  config ? config.bg : 'bg-gray-50'
                } hover:bg-gray-100`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-blue-700">
                    {item.title}
                  </p>
                  {item.url && (
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0 mt-0.5" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {config && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${config.color}`}>
                      {config.icon}
                      {config.label}
                    </span>
                  )}
                  <span className="text-xs font-medium text-blue-600">{item.source}</span>
                  <span className="text-xs text-gray-400">{formatDate(item.publishedAt)}</span>
                </div>
              </a>
            )
          })
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            수집된 기사가 없습니다. 설정에서 수집을 실행하세요.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
