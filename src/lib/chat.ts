import { prisma } from '@/lib/prisma'

const DEFAULT_ROOM_NAME = '새움터 실무방'

// 기본 채팅방 보장 (없으면 생성). 첫 실행 시 "새움터 실무방" 1개를 seed.
export async function ensureDefaultRoom() {
  const count = await prisma.chatRoom.count()
  if (count === 0) {
    await prisma.chatRoom.create({ data: { name: DEFAULT_ROOM_NAME } })
  }
}

// 봇 인증 (X-Bot-Key 헤더 검증). 일치하면 true.
export function isValidBotKey(req: Request): boolean {
  const key = req.headers.get('x-bot-key')
  const expected = process.env.CHAT_BOT_KEY
  return !!expected && !!key && key === expected
}
