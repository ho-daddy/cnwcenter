import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'
import { DiaryAuthorType } from '@prisma/client'

const ADMIN_KEY = process.env.ADMIN_PASSWORD ?? ''

function isAdminKey(req: NextRequest) {
  return req.headers.get('x-admin-key') === ADMIN_KEY && ADMIN_KEY !== ''
}

// GET /api/diary — 일기 목록 (날짜 내림차순, 페이지네이션)
export async function GET(req: NextRequest) {
  if (!isAdminKey(req)) {
    const auth = await requireStaffOrAbove()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '30')
  const skip = (page - 1) * limit

  const [entries, total] = await Promise.all([
    prisma.diary.findMany({
      orderBy: { entryDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.diary.count(),
  ])

  return NextResponse.json({ entries, total, page, limit })
}

// POST /api/diary — 일기 작성 (STAFF 이상 또는 AI 에이전트)
export async function POST(req: NextRequest) {
  const aiRequest = isAdminKey(req)

  if (!aiRequest) {
    const auth = await requireStaffOrAbove()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const body = await req.json()
  const { authorName, content, entryDate, authorType } = body

  if (!authorName?.trim() || !content?.trim() || !entryDate) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  const parsedDate = new Date(entryDate)
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const entry = await prisma.diary.create({
    data: {
      authorName: authorName.trim(),
      authorType: authorType === 'AI' ? DiaryAuthorType.AI : DiaryAuthorType.HUMAN,
      content: content.trim(),
      entryDate: parsedDate,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
