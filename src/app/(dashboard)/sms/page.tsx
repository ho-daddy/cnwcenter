'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Send, Users, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Group {
  id: string
  name: string
  _count: { members: number }
}

const MAX_SMS = 90
const MAX_LMS = 2000

export default function SmsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; totalCount: number; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/member-groups').then(r => r.ok ? r.json() : []).then(setGroups)
  }, [])

  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  const totalRecipients = groups
    .filter(g => selectedGroupIds.includes(g.id))
    .reduce((sum, g) => sum + g._count.members, 0)

  const byteLength = new TextEncoder().encode(content).length
  const msgType = byteLength <= MAX_SMS ? 'SMS' : 'LMS'

  const handleSend = async () => {
    if (!content.trim()) { alert('메시지 내용을 입력해주세요.'); return }
    if (!selectedGroupIds.length) { alert('수신 그룹을 선택해주세요.'); return }
    if (!confirm(`${totalRecipients}명에게 문자를 발송하시겠습니까?`)) return

    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, groupIds: selectedGroupIds }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, totalCount: data.totalCount, message: `${data.totalCount}명 발송 완료` })
        setContent('')
        setSelectedGroupIds([])
      } else {
        setResult({ ok: false, totalCount: 0, message: data.error ?? '발송 실패' })
      }
    } catch {
      setResult({ ok: false, totalCount: 0, message: '네트워크 오류' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <MessageSquare className="w-6 h-6 text-blue-600" />
        단체 문자 발송
      </h1>

      {result && (
        <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium', result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {result.ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {result.message}
        </div>
      )}

      {/* 수신 그룹 선택 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          수신 그룹 선택
        </h2>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 그룹이 없습니다. 회원 관리 → 그룹 관리에서 먼저 그룹을 만들어주세요.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors',
                  selectedGroupIds.includes(g.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                )}
              >
                {g.name}
                <span className={cn('text-xs', selectedGroupIds.includes(g.id) ? 'text-blue-200' : 'text-gray-400')}>
                  ({g._count.members})
                </span>
              </button>
            ))}
          </div>
        )}
        {selectedGroupIds.length > 0 && (
          <p className="text-sm text-blue-600 font-medium">총 수신자: 약 {totalRecipients}명 (중복 제외 시 달라질 수 있음)</p>
        )}
      </div>

      {/* 메시지 입력 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">메시지 내용</h2>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', msgType === 'SMS' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700')}>
            {msgType} ({byteLength}byte)
          </span>
        </div>
        <textarea
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={8}
          maxLength={MAX_LMS}
          placeholder="발송할 메시지를 입력하세요.&#10;(90byte 이하: SMS, 초과: LMS 자동 전환)"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <p className="text-xs text-gray-400 text-right">{content.length}/{MAX_LMS}자</p>
      </div>

      {/* 발송 */}
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={sending || !content.trim() || !selectedGroupIds.length}
          className="flex items-center gap-2 bg-blue-600 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          {sending ? '발송 중...' : '문자 발송'}
        </button>
      </div>
    </div>
  )
}
