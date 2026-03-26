import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

// GET /api/popups/active — 현재 활성화된 팝업 목록 (인증된 사용자)
export async function GET() {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const now = new Date()

  const popups = await prisma.popup.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
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
