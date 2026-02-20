import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import * as XLSX from 'xlsx'
import { Prisma } from '@prisma/client'

// GET /api/risk-assessment/chemicals/export?workplaceId=xxx
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const workplaceId = req.nextUrl.searchParams.get('workplaceId')
  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)

  const where: Prisma.ChemicalProductWhereInput = {
    ...(accessibleIds !== null ? { workplaceId: { in: accessibleIds } } : {}),
    ...(workplaceId ? { workplaceId } : {}),
  }

  const products = await prisma.chemicalProduct.findMany({
    where,
    orderBy: [{ workplace: { name: 'asc' } }, { name: 'asc' }],
    include: {
      workplace: { select: { name: true } },
      components: {
        include: { component: true },
        orderBy: { component: { name: 'asc' } },
      },
      unitLinks: {
        include: {
          organizationUnit: {
            select: { name: true, parent: { select: { name: true } } },
          },
        },
      },
    },
  })

  // ─── Sheet 1: 화학제품 목록 ───
  const productRows = products.map((p, idx) => ({
    '번호': idx + 1,
    '사업장': p.workplace.name,
    '제품명': p.name,
    '제조사': p.manufacturer || '',
    '용도/설명': p.description || '',
    '구성성분 수': p.components.length,
    '제품 중대성': p.severityScore ?? '',
    '사용 평가단위': p.unitLinks
      .map(u => {
        const parent = u.organizationUnit.parent?.name
        return parent ? `${parent} > ${u.organizationUnit.name}` : u.organizationUnit.name
      })
      .join(', ') || '',
    '등록일': p.createdAt.toISOString().slice(0, 10),
  }))

  // ─── Sheet 2: 구성성분 상세 ───
  const componentRows: Record<string, string | number>[] = []
  let rowNum = 0
  for (const p of products) {
    for (const pc of p.components) {
      rowNum++
      componentRows.push({
        '번호': rowNum,
        '사업장': p.workplace.name,
        '제품명': p.name,
        'CAS 번호': pc.component.casNumber,
        '성분명': pc.component.name,
        '함유량': pc.concentration || '',
        '유해성': pc.component.hazards || '',
        '규제사항': pc.component.regulations || '',
        '성분 중대성': pc.severityScore ?? '',
      })
    }
  }

  // ─── Excel 생성 ───
  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.json_to_sheet(productRows)
  ws1['!cols'] = [
    { wch: 5 },  // 번호
    { wch: 15 }, // 사업장
    { wch: 25 }, // 제품명
    { wch: 15 }, // 제조사
    { wch: 30 }, // 용도/설명
    { wch: 10 }, // 구성성분 수
    { wch: 10 }, // 제품 중대성
    { wch: 30 }, // 사용 평가단위
    { wch: 12 }, // 등록일
  ]
  XLSX.utils.book_append_sheet(wb, ws1, '화학제품 목록')

  const ws2 = XLSX.utils.json_to_sheet(componentRows)
  ws2['!cols'] = [
    { wch: 5 },  // 번호
    { wch: 15 }, // 사업장
    { wch: 25 }, // 제품명
    { wch: 14 }, // CAS 번호
    { wch: 25 }, // 성분명
    { wch: 12 }, // 함유량
    { wch: 40 }, // 유해성
    { wch: 40 }, // 규제사항
    { wch: 10 }, // 성분 중대성
  ]
  XLSX.utils.book_append_sheet(wb, ws2, '구성성분 상세')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `화학제품_관리대장_${today}.xlsx`

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
