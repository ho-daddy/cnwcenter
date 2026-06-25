import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// GET /api/sms/logs
export async function GET(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.smsLog.findMany({
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
      include: {
        sentBy: { select: { id: true, name: true } },
        groups: { include: { group: { select: { id: true, name: true } } } },
        _count: { select: { recipients: true } },
      },
    }),
    prisma.smsLog.count(),
  ])

  return NextResponse.json({ logs, total, page, limit })
}
