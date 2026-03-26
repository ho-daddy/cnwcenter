import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// GET /api/popups/[id] — 팝업 상세
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const popup = await prisma.popup.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!popup) {
    return NextResponse.json({ error: '팝업을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(popup)
}

// PUT /api/popups/[id] — 팝업 수정
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { title, content, startDate, endDate, isActive } = body

    const existing = await prisma.popup.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: '팝업을 찾을 수 없습니다.' }, { status: 404 })
    }

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

    const popup = await prisma.popup.update({
      where: { id: params.id },
      data: {
        title: title.trim(),
        content: content.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== false,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(popup)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE /api/popups/[id] — 팝업 삭제
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const existing = await prisma.popup.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: '팝업을 찾을 수 없습니다.' }, { status: 404 })
  }

  await prisma.popup.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
