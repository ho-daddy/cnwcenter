import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'

type Params = { params: { id: string } }

// GET /api/risk-assessment/chemicals/[id] — 화학제품 상세 (구성성분 포함)
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const product = await prisma.chemicalProduct.findUnique({
    where: { id: params.id },
    include: {
      workplace: { select: { id: true, name: true } },
      components: {
        include: { component: true },
        orderBy: { component: { name: 'asc' } },
      },
      unitLinks: {
        include: {
          organizationUnit: {
            select: { id: true, name: true, parent: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })
  if (!product) return NextResponse.json({ error: '화학제품을 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(product.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  return NextResponse.json(product)
}

// PUT /api/risk-assessment/chemicals/[id] — 화학제품 수정 (구성성분 일괄교체)
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const product = await prisma.chemicalProduct.findUnique({ where: { id: params.id } })
  if (!product) return NextResponse.json({ error: '화학제품을 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(product.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  const body = await req.json()
  const { name, manufacturer, description, components } = body
  if (!name) return NextResponse.json({ error: '제품명은 필수입니다.' }, { status: 400 })

  const compArr: Array<{ casNumber: string; name: string; concentration?: string; hazards?: string; regulations?: string; severityScore?: number }> = components || []
  const scores = compArr.map(c => c.severityScore ?? 1)
  const severityScore = scores.length > 0 ? Math.max(...scores) : null

  const updated = await prisma.$transaction(async (tx) => {
    await tx.productComponent.deleteMany({ where: { productId: params.id } })

    for (const comp of compArr) {
      const component = await tx.chemicalComponent.upsert({
        where: { casNumber: comp.casNumber },
        create: { casNumber: comp.casNumber, name: comp.name, hazards: comp.hazards || null, regulations: comp.regulations || null },
        update: { name: comp.name, hazards: comp.hazards || null, regulations: comp.regulations || null },
      })
      await tx.productComponent.create({
        data: {
          productId: params.id,
          componentId: component.id,
          concentration: comp.concentration || null,
          severityScore: comp.severityScore ?? 1,
        },
      })
    }

    return tx.chemicalProduct.update({
      where: { id: params.id },
      data: { name, manufacturer: manufacturer || null, description: description || null, severityScore },
      include: {
        workplace: { select: { id: true, name: true } },
        components: { include: { component: true } },
      },
    })
  })

  return NextResponse.json(updated)
}

// DELETE /api/risk-assessment/chemicals/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const product = await prisma.chemicalProduct.findUnique({ where: { id: params.id } })
  if (!product) return NextResponse.json({ error: '화학제품을 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(product.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  await prisma.chemicalProduct.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
