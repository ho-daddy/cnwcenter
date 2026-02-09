import { cn } from '@/lib/utils'

const typeConfig: Record<string, { label: string; className: string }> = {
  WEBSITE: { label: '웹사이트', className: 'bg-blue-100 text-blue-700' },
  WEBSITE_JS: { label: 'JS 사이트', className: 'bg-yellow-100 text-yellow-700' },
  TELEGRAM: { label: '텔레그램', className: 'bg-purple-100 text-purple-700' },
  RSS: { label: 'RSS', className: 'bg-green-100 text-green-700' },
  NEWSLETTER: { label: '뉴스레터', className: 'bg-orange-100 text-orange-700' },
}

export function SourceTypeBadge({ type }: { type: string }) {
  const config = typeConfig[type] || { label: type, className: 'bg-gray-100 text-gray-700' }

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
