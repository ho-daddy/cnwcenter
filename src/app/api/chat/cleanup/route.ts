import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

const RETENTION_DAYS = 90

// POST /api/chat/cleanup
// X-Cleanup-Key 헤더로 인증 (CHAT_BOT_KEY 재사용)
export async function POST(req: NextRequest) {
  const key = req.headers.get('X-Cleanup-Key')
  if (key !== process.env.CHAT_BOT_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  // 파일 첨부된 오래된 메시지 — 파일 먼저 삭제
  const oldWithFiles = await prisma.chatMessage.findMany({
    where: { createdAt: { lt: cutoff }, fileUrl: { not: null } },
    select: { id: true, fileUrl: true },
  })

  let filesDeleted = 0
  for (const msg of oldWithFiles) {
    if (!msg.fileUrl) continue
    try {
      const filePath = path.join(process.cwd(), 'public', msg.fileUrl)
      await unlink(filePath)
      filesDeleted++
    } catch {
      // 파일이 이미 없으면 무시
    }
  }

  // 오래된 메시지 DB 삭제
  const { count } = await prisma.chatMessage.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  return NextResponse.json({
    deleted: count,
    filesDeleted,
    cutoff: cutoff.toISOString(),
    retentionDays: RETENTION_DAYS,
  })
}
