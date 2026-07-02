import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'
import { parseJsonBody, handleApiError } from '@/lib/api-utils'

// GET /api/finance/categories — 관/항/목 트리 전체
export async function GET() {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const categories = await prisma.budgetCategory.findMany({
    orderBy: [{ kind: 'asc' }, { order: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({ categories })
}

// POST /api/finance/categories — 신규 계정과목 추가
export async function POST(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { name, level, kind, parentId } = body

    if (!name?.trim()) return NextResponse.json({ error: '항목명을 입력해주세요.' }, { status: 400 })
    if (!['관', '항', '목'].includes(level)) return NextResponse.json({ error: '분류 단계가 올바르지 않습니다.' }, { status: 400 })
    if (!['INCOME', 'EXPENSE'].includes(kind)) return NextResponse.json({ error: '수입/지출 구분이 올바르지 않습니다.' }, { status: 400 })

    const category = await prisma.budgetCategory.create({
      data: { name: name.trim(), level, kind, parentId: parentId || null },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
