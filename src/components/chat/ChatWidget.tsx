'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { MessageSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatPanel } from './ChatPanel'

export function ChatWidget() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)

  // STAFF 이상만 위젯 노출 (사이드바/미들웨어 조건과 일치)
  const role = session?.user?.role
  if (status !== 'authenticated' || (role !== 'SUPER_ADMIN' && role !== 'STAFF')) {
    return null
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-colors',
          open ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'
        )}
        aria-label="실무 채팅"
      >
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* 슬라이드 패널 (overlay 아님 — 기존 페이지 그대로 보임) */}
      <div
        className={cn(
          'fixed top-0 right-0 z-[55] h-screen w-[350px] max-w-[90vw] bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* 헤더 */}
        <div className="h-14 shrink-0 flex items-center gap-2 px-4 border-b border-gray-200 bg-blue-600 text-white">
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold">새움터 실무방</span>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto p-1 rounded hover:bg-blue-700"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 패널 본문 — 열려 있을 때만 폴링 시작 */}
        <div className="flex-1 min-h-0">
          {open && <ChatPanel myName={session?.user?.name} variant="widget" />}
        </div>
      </div>
    </>
  )
}
