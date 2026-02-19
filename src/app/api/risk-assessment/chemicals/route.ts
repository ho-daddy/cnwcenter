import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'

// GET /api/risk-assessment/chemicals — 화학제품 목록
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const workplaceId = searchParams.get('workplaceId')

  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)

  const where: Prisma.ChemicalProductWhereInput = {
    ...(accessibleIds !== null ? { workplaceId: { in: accessibleIds } } : {}),
    ...(workplaceId ? { workplaceId } : {}),
  }

  const chemicals = await prisma.chemicalProduct.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      workplace: { select: { id: true, name: true } },
      _count: { select: { components: true, unitLinks: true } },
    },
  })

  return NextResponse.json({ chemicals })
}

// POST /api/risk-assessment/chemicals — 화학제품 등록 (구성성분 포함)
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await req.json()
  const { workplaceId, name, manufacturer, description, components } = body

  if (!workplaceId || !name) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
  }

  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)
  if (accessibleIds !== null && !accessibleIds.includes(workplaceId)) {
    return NextResponse.json({ error: '해당 사업장에 대한 권한이 없습니다.' }, { status: 403 })
  }

  const compArr: Array<{ casNumber: string; name: string; concentration?: string; hazards?: string; regulations?: string; severityScore?: number }> = components || []
  const scores = compArr.map(c => c.severityScore ?? 1)
  const severityScore = scores.length > 0 ? Math.max(...scores) : null

  const chemical = await prisma.$transaction(async (tx) => {
    const product = await tx.chemicalProduct.create({
      data: { workplaceId, name, manufacturer: manufacturer || null, description: description || null, severityScore },
    })

    for (const comp of compArr) {
      const component = await tx.chemicalComponent.upsert({
        where: { casNumber: comp.casNumber },
        create: { casNumber: comp.casNumber, name: comp.name, hazards: comp.hazards || null, regulations: comp.regulations || null },
        update: { name: comp.name, hazards: comp.hazards || null, regulations: comp.regulations || null },
      })
      await tx.productComponent.create({
        data: {
          productId: product.id,
          componentId: component.id,
          concentration: comp.concentration || null,
          severityScore: comp.severityScore ?? 1,
        },
      })
    }

    return tx.chemicalProduct.findUnique({
      where: { id: product.id },
      include: {
        workplace: { select: { name: true } },
        _count: { select: { components: true, unitLinks: true } },
      },
    })
  })

  return NextResponse.json(chemical, { status: 201 })
}
