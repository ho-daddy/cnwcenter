import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const dateParam = searchParams.get('date')

    // 기본: 최근 7일간의 브리핑
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const from = startOfDay(subDays(targetDate, 7))
    const to = endOfDay(targetDate)

    const [items, total] = await Promise.all([
      prisma.newsBriefing.findMany({
        where: { publishedAt: { gte: from, lte: to } },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      }),
      prisma.newsBriefing.count({
        where: { publishedAt: { gte: from, lte: to } },
      }),
    ])

    return NextResponse.json({ items, total })
  } catch (error) {
    console.error('Failed to fetch briefings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch briefings' },
      { status: 500 }
    )
  }
}
