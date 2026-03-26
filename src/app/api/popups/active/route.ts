import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

// GET /api/popups/active — 현재 활성화된 팝업 목록 (인증된 사용자)
export async function GET() {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const now = new Date()
  
  // 오늘 날짜 (시간 제외)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1) // 내일 00:00

  const popups = await prisma.popup.findMany({
    where: {
      isActive: true,
      startDate: { lt: todayEnd },   // 시작일 < 내일 00:00
      endDate: { gte: todayStart },  // 종료일 >= 오늘 00:00
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      content: true,
      startDate: true,
      endDate: true,
    },
  })

  return NextResponse.json({ popups })
}
