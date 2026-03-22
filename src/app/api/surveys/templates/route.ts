import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

// GET /api/surveys/templates — 설문 템플릿 목록
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const templates = await prisma.surveyTemplate.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return NextResponse.json(templates)
}
