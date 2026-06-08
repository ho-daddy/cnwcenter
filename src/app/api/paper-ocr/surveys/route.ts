import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

// GET /api/paper-ocr/surveys — 게시된 설문 목록
export async function GET() {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const surveys = await prisma.survey.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      year: true,
      accessToken: true,
      _count: { select: { responses: true } },
    },
    orderBy: { year: 'desc' },
  })

  return NextResponse.json(surveys)
}
