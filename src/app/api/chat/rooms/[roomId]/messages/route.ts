import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { isValidBotKey } from '@/lib/chat'

type Params = { params: { roomId: string } }

// GET /api/chat/rooms/[roomId]/messages?cursor=&limit=50
// 메시지 목록 (오래된 → 최신 순으로 반환). cursor 이후의 새 메시지만 받을 때도 사용.
export async function GET(req: NextRequest, { params }: Params) {
  // 봇 또는 로그인 사용자 허용
  const botOk = isValidBotKey(req)
  if (!botOk) {
    const auth = await requireAuth()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor')?.trim() || null
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50') || 50, 100)

  const room = await prisma.chatRoom.findUnique({ where: { id: params.roomId } })
  if (!room) return NextResponse.json({ error: '채팅방을 찾을 수 없습니다.' }, { status: 404 })

  if (cursor) {
    // cursor(마지막으로 본 메시지 id) 이후의 새 메시지만 (폴링용)
    const cursorMsg = await prisma.chatMessage.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    })

    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId: params.roomId,
        ...(cursorMsg
          ? {
              OR: [
                { createdAt: { gt: cursorMsg.createdAt } },
                { createdAt: cursorMsg.createdAt, id: { gt: cursor } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
    })

    return NextResponse.json({ messages })
  }

  // 초기 로드: 최신 limit개를 가져와 오름차순으로 정렬해 반환
  const latest = await prisma.chatMessage.findMany({
    where: { roomId: params.roomId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  })

  const messages = latest.reverse()
  return NextResponse.json({ messages })
}

// POST /api/chat/rooms/[roomId]/messages — 메시지 전송
// 로그인 사용자: NextAuth 세션으로 authorName 추출
// 봇: X-Bot-Key 헤더 검증 → authorName은 body에서 받음
export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json().catch(() => ({}))
  const content: string | null = typeof body.content === 'string' ? body.content.trim() : null
  const fileUrl: string | null = typeof body.fileUrl === 'string' ? body.fileUrl : null
  const fileName: string | null = typeof body.fileName === 'string' ? body.fileName : null

  let authorName: string
  let authorType: 'human' | 'bot'

  if (isValidBotKey(req)) {
    // 봇 인증
    const botName = typeof body.authorName === 'string' ? body.authorName.trim() : ''
    if (!botName) {
      return NextResponse.json({ error: 'authorName이 필요합니다.' }, { status: 400 })
    }
    authorName = botName
    authorType = 'bot'
  } else {
    // 세션 인증
    const auth = await requireAuth()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })
    authorName = auth.user!.name || '익명'
    authorType = 'human'
  }

  if (!content && !fileUrl) {
    return NextResponse.json({ error: '내용 또는 파일이 필요합니다.' }, { status: 400 })
  }

  const room = await prisma.chatRoom.findUnique({ where: { id: params.roomId } })
  if (!room) return NextResponse.json({ error: '채팅방을 찾을 수 없습니다.' }, { status: 404 })

  const message = await prisma.chatMessage.create({
    data: {
      roomId: params.roomId,
      authorName,
      authorType,
      content,
      fileUrl,
      fileName,
    },
  })

  return NextResponse.json({ message }, { status: 201 })
}
