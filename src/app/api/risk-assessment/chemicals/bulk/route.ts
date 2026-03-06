import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { parseJsonBody, ApiError } from '@/lib/api-utils'

interface BulkComponent {
  casNumber: string
  name: string
  concentration: string
  severityScore: number
}

interface BulkProduct {
  name: string
  manufacturer: string
  description: string
  severityScore: number
  components: BulkComponent[]
}

// POST /api/risk-assessment/chemicals/bulk — 화학제품 일괄등록
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { workplaceId, products } = body as { workplaceId: string; products: BulkProduct[] }

    if (!workplaceId || !products || products.length === 0) {
      return NextResponse.json({ error: '사업장과 제품 데이터가 필요합니다.' }, { status: 400 })
    }

    const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)
    if (accessibleIds !== null && !accessibleIds.includes(workplaceId)) {
      return NextResponse.json({ error: '해당 사업장에 대한 권한이 없습니다.' }, { status: 403 })
    }

    const results: { created: number; errors: { row: number; message: string }[] } = {
      created: 0,
      errors: [],
    }

    // 트랜잭션으로 일괄 처리
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < products.length; i++) {
        const p = products[i]
        try {
          if (!p.name || p.name.trim() === '') {
            results.errors.push({ row: i + 1, message: `제품명이 비어있습니다.` })
            continue
          }

          // 제품 중대성 = 구성성분 최대값
          const compScores = p.components.map(c => c.severityScore || 1)
          const productSeverity = compScores.length > 0 ? Math.max(...compScores) : (p.severityScore || null)

          const product = await tx.chemicalProduct.create({
            data: {
              workplaceId,
              name: p.name.trim(),
              manufacturer: p.manufacturer?.trim() || null,
              description: p.description?.trim() || null,
              severityScore: productSeverity,
            },
          })

          for (const comp of p.components) {
            if (!comp.casNumber || !comp.name) continue

            // CAS번호 기반 글로벌 성분 upsert
            const component = await tx.chemicalComponent.upsert({
              where: { casNumber: comp.casNumber.trim() },
              create: {
                casNumber: comp.casNumber.trim(),
                name: comp.name.trim(),
              },
              update: {
                name: comp.name.trim(),
              },
            })

            await tx.productComponent.create({
              data: {
                productId: product.id,
                componentId: component.id,
                concentration: comp.concentration?.trim() || null,
                severityScore: comp.severityScore || 1,
              },
            })
          }

          results.created++
        } catch (err) {
          const msg = err instanceof Error ? err.message : '알 수 없는 오류'
          results.errors.push({ row: i + 1, message: msg })
        }
      }
    })
    return NextResponse.json(results)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    const msg = error instanceof Error ? error.message : '트랜잭션 오류'
    console.error('[API Error]', error)
    return NextResponse.json({ error: `일괄등록 중 오류: ${msg}` }, { status: 500 })
  }
}
