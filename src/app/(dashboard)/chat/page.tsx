'use client'

import { useSession } from 'next-auth/react'
import { MessageSquare } from 'lucide-react'
import { ChatPanel } from '@/components/chat/ChatPanel'

export default function ChatPage() {
  const { data: session } = useSession()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">회의실</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-12rem)]">
        <ChatPanel myName={session?.user?.name} variant="full" />
      </div>
    </div>
  )
}
