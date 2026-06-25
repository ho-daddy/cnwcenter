'use client'

import { useEffect, useState } from 'react'
import { History, CheckCircle2, XCircle, Tag } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface SmsLogItem {
  id: string
  content: string
  sentAt: string
  totalCount: number
  successCount: number
  sentBy: { id: string; name: string | null }
  groups: { group: { id: string; name: string } }[]
  _count: { recipients: number }
}

export default function SmsHistoryPage() {
  const [logs, setLogs] = useState<SmsLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const PAGE_SIZE = 20
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchLogs = async (p: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/sms/logs?page=${p}&limit=${PAGE_SIZE}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchLogs(page) }, [page])

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <History className="w-6 h-6 text-blue-600" />
        발송 이력
        <span className="text-sm font-normal text-gray-500">({total}건)</span>
      </h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">발송 이력이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logs.map(log => (
              <li key={log.id}>
                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 line-clamp-2">{log.content}</p>
                      <div className="flex items-center flex-wrap gap-2 mt-1.5">
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.sentAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                        </span>
                        <span className="text-xs text-gray-500">· {log.sentBy.name ?? log.sentBy.id}</span>
                        {log.groups.map(({ group }) => (
                          <span key={group.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                            <Tag className="w-3 h-3" />{group.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        {log.successCount === log.totalCount ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={log.successCount === log.totalCount ? 'text-green-700' : 'text-red-600'}>
                          {log.successCount}/{log.totalCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                {expanded === log.id && (
                  <div className="px-5 pb-4">
                    <pre className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-sans">{log.content}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">이전</button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">다음</button>
        </div>
      )}
    </div>
  )
}
