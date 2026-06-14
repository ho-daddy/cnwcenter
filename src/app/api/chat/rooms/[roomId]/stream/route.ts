import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

type Params = { params: { roomId: string } }

// GET /api/chat/rooms/[roomId]/stream — SSE 스트림 (새 메시지 알림)
// 서버에서 DB를 폴링하여 새 메시지를 SSE 이벤트로 push. 클라이언트는 EventSource 사용.
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) {
    return new Response('Unauthorized', { status: 401 })
  }

  const roomId = params.roomId
  const { searchParams } = req.nextUrl
  let lastSeen = searchParams.get('cursor')?.trim() || null
  let lastSeenAt: Date | null = null

  if (lastSeen) {
    const c = await prisma.chatMessage.findUnique({
      where: { id: lastSeen },
      select: { createdAt: true },
    })
    lastSeenAt = c?.createdAt ?? null
  }

  const encoder = new TextEncoder()
  let closed = false
  let timer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      send('connected', { roomId })

      const poll = async () => {
        if (closed) return
        try {
          const messages = await prisma.chatMessage.findMany({
            where: {
              roomId,
              ...(lastSeenAt
                ? {
                    OR: [
                      { createdAt: { gt: lastSeenAt } },
                      ...(lastSeen
                        ? [{ createdAt: lastSeenAt, id: { gt: lastSeen } }]
                        : []),
                    ],
                  }
                : {}),
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            take: 50,
          })

          if (messages.length > 0) {
            const last = messages[messages.length - 1]
            lastSeen = last.id
            lastSeenAt = last.createdAt
            send('messages', { messages })
          } else {
            // keep-alive
            send('ping', { t: Date.now() })
          }
        } catch {
          // DB 에러 시 무시하고 다음 폴링
        }
      }

      timer = setInterval(poll, 3000)
      // 초기 미수신 메시지 즉시 전송
      await poll()
    },
    cancel() {
      closed = true
      if (timer) clearInterval(timer)
    },
  })

  // 클라이언트 연결 종료 감지
  req.signal.addEventListener('abort', () => {
    closed = true
    if (timer) clearInterval(timer)
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
