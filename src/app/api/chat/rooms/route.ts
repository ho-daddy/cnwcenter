import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { ensureDefaultRoom } from '@/lib/chat'

// GET /api/chat/rooms — 방 목록 (로그인 필요)
export async function GET() {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  // 첫 실행 시 기본 방 자동 생성
  await ensureDefaultRoom()

  const rooms = await prisma.chatRoom.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { messages: true } } },
  })

  return NextResponse.json({ rooms })
}
