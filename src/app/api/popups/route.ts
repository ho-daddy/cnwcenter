import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// GET /api/popups — 팝업 목록 (STAFF+ 전용)
export async function GET() {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const popups = await prisma.popup.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ popups })
}

// POST /api/popups — 팝업 생성 (STAFF+ 전용)
export async function POST(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { title, content, startDate, endDate, isActive } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 })
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: '표시 기간을 설정해주세요.' }, { status: 400 })
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json({ error: '종료일은 시작일 이후여야 합니다.' }, { status: 400 })
    }

    const popup = await prisma.popup.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== false,
        createdById: auth.user!.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(popup, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
