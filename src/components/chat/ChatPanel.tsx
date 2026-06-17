'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChatMessage {
  id: string
  roomId: string
  authorName: string
  authorType: string // 'human' | 'bot'
  content: string | null
  fileUrl: string | null
  fileName: string | null
  createdAt: string
}

interface ChatPanelProps {
  // 비어 있으면 기본 방을 자동 선택
  roomId?: string
  // 본인 이름 (말풍선 정렬용). 세션의 user.name
  myName?: string | null
  className?: string
  // 입력창 높이/패딩 등 풀스크린 vs 위젯 변형
  variant?: 'widget' | 'full'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export function ChatPanel({ roomId: roomIdProp, myName, className, variant = 'widget' }: ChatPanelProps) {
  const [roomId, setRoomId] = useState<string | undefined>(roomIdProp)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cursorRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  // 기본 방 확보
  useEffect(() => {
    if (roomIdProp) {
      setRoomId(roomIdProp)
      return
    }
    let cancelled = false
    fetch('/api/chat/rooms')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (cancelled) return
        const first = data.rooms?.[0]
        if (first) setRoomId(first.id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [roomIdProp])

  // 초기 로드
  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/chat/rooms/${roomId}/messages?limit=50`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { messages: ChatMessage[] }) => {
        if (cancelled) return
        setMessages(data.messages)
        const last = data.messages[data.messages.length - 1]
        cursorRef.current = last ? last.id : null
        setLoading(false)
        scrollToBottom()
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [roomId, scrollToBottom])

  // 폴링 (3초 간격) — 새 메시지만 cursor 이후로 가져옴
  useEffect(() => {
    if (!roomId) return

    const poll = async () => {
      try {
        const url = cursorRef.current
          ? `/api/chat/rooms/${roomId}/messages?cursor=${cursorRef.current}&limit=50`
          : `/api/chat/rooms/${roomId}/messages?limit=50`
        const r = await fetch(url)
        if (!r.ok) return
        const data: { messages: ChatMessage[] } = await r.json()
        if (data.messages.length > 0) {
          setMessages((prev) => {
            const existing = new Set(prev.map((m) => m.id))
            const fresh = data.messages.filter((m) => !existing.has(m.id))
            if (fresh.length === 0) return prev
            return [...prev, ...fresh]
          })
          const last = data.messages[data.messages.length - 1]
          cursorRef.current = last.id
          scrollToBottom()
        }
      } catch {
        // 무시
      }
    }

    pollRef.current = setInterval(poll, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [roomId, scrollToBottom])

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && !pendingFile) || !roomId || sending) return
    setSending(true)
    try {
      let fileUrl: string | null = null
      let fileName: string | null = null

      if (pendingFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', pendingFile)
        const up = await fetch(`/api/chat/rooms/${roomId}/upload`, { method: 'POST', body: fd })
        setUploading(false)
        if (!up.ok) { setSending(false); return }
        const upData = await up.json()
        fileUrl = upData.fileUrl
        fileName = upData.fileName
      }

      const r = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text || null, fileUrl, fileName }),
      })
      if (r.ok) {
        const data: { message: ChatMessage } = await r.json()
        setInput('')
        setPendingFile(null)
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
        cursorRef.current = data.message.id
        scrollToBottom()
      }
    } catch {
      // 무시
    } finally {
      setSending(false)
      setUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* 메시지 목록 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-8">불러오는 중...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">
            아직 메시지가 없습니다. 대화를 시작해보세요.
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.authorType === 'human' && !!myName && m.authorName === myName
            const isBot = m.authorType === 'bot'
            return (
              <div
                key={m.id}
                className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}
              >
                {!isMine && (
                  <span
                    className={cn(
                      'text-xs mb-0.5 px-1',
                      isBot ? 'text-purple-600 font-medium' : 'text-gray-500'
                    )}
                  >
                    {m.authorName}
                    {isBot && ' 🤖'}
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
                    isMine
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : isBot
                        ? 'bg-purple-50 text-purple-900 border border-purple-100 rounded-bl-sm'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                  )}
                >
                  {m.content}
                  {m.fileUrl && (
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'block mt-1 underline text-xs',
                        isMine ? 'text-blue-100' : 'text-blue-600'
                      )}
                    >
                      📎 {m.fileName || '첨부파일'}
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                  {formatTime(m.createdAt)}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* 파일 첨부 미리보기 */}
      {pendingFile && (
        <div className="px-3 py-1.5 bg-blue-50 border-t border-blue-100 flex items-center gap-2 text-sm text-blue-700">
          <Paperclip className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate flex-1">{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)} className="shrink-0 hover:text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 입력창 */}
      <div className={cn('border-t border-gray-200 bg-white p-2 flex items-center gap-2')}>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.hwp,.zip,.xls,.xlsx,.ppt,.pptx,.mp4,.txt"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = '' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!roomId}
          className="shrink-0 w-8 h-8 rounded-full text-gray-400 hover:text-blue-500 hover:bg-gray-100 flex items-center justify-center disabled:opacity-40 transition-colors"
          aria-label="파일 첨부"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={pendingFile ? '파일 설명 (선택)' : '메시지를 입력하세요...'}
          disabled={!roomId}
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          onClick={handleSend}
          disabled={(!input.trim() && !pendingFile) || sending || uploading || !roomId}
          className="shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors"
          aria-label="전송"
        >
          {uploading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
