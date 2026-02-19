import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'

// GET /api/risk-assessment/improvements — 개선이력 전체 목록
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const workplaceId = searchParams.get('workplaceId')
  const status = searchParams.get('status')
  const year = searchParams.get('year')

  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)

  const where: Prisma.RiskImprovementRecordWhereInput = {
    hazard: {
      ...(accessibleIds !== null ? { workplaceId: { in: accessibleIds } } : {}),
      ...(workplaceId ? { workplaceId } : {}),
      ...(year ? { year: parseInt(year) } : {}),
    },
    ...(status ? { status: status as 'PLANNED' | 'COMPLETED' } : {}),
  }

  const records = await prisma.riskImprovementRecord.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      hazard: {
        include: {
          card: {
            include: {
              workplace: { select: { id: true, name: true } },
              organizationUnit: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  return NextResponse.json({ records })
}
