import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { resolveChemicalComponent } from '@/lib/chemical-component'

// GET /api/risk-assessment/chemicals — 화학제품 목록
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const workplaceId = searchParams.get('workplaceId')
  const q = searchParams.get('q')?.trim() || ''

  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)

  const where: Prisma.ChemicalProductWhereInput = {
    ...(accessibleIds !== null ? { workplaceId: { in: accessibleIds } } : {}),
    ...(workplaceId ? { workplaceId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { manufacturer: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const chemicals = await prisma.chemicalProduct.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    ...(q ? { take: 20 } : {}),
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

  try {
    const body = await parseJsonBody(req)
    const {
      workplaceId, name, manufacturer, description, managementMethod, severityStandard,
      productHazards, productRegulations, productSeverityScore,
      components,
    } = body

    if (!workplaceId || !name) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }

    const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)
    if (accessibleIds !== null && !accessibleIds.includes(workplaceId)) {
      return NextResponse.json({ error: '해당 사업장에 대한 권한이 없습니다.' }, { status: 403 })
    }

    const standardValue: 'SAEUMTER' | 'METAL_UNION' =
      severityStandard === 'METAL_UNION' ? 'METAL_UNION' : 'SAEUMTER'

    const compArr: Array<{ casNumber: string; name: string; concentration?: string; hazards?: string; regulations?: string; severityScore?: number }> = components || []
    const componentScores = compArr.map(c => c.severityScore ?? 1)
    const componentsMax = componentScores.length > 0 ? Math.max(...componentScores) : 0
    const productScore = typeof productSeverityScore === 'number' ? productSeverityScore : 0
    const candidates = [componentsMax, productScore].filter(s => s > 0)
    const severityScore = candidates.length > 0 ? Math.max(...candidates) : null

    const chemical = await prisma.$transaction(async (tx) => {
      const product = await tx.chemicalProduct.create({
        data: {
          workplaceId,
          name,
          manufacturer: manufacturer || null,
          description: description || null,
          managementMethod: managementMethod || null,
          severityScore,
          severityStandard: standardValue,
          productHazards: productHazards || null,
          productRegulations: productRegulations || null,
          productSeverityScore: typeof productSeverityScore === 'number' ? productSeverityScore : null,
        },
      })

      for (const comp of compArr) {
        const component = await resolveChemicalComponent(tx, comp)
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
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
