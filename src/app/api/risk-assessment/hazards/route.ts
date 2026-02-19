import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'

// GET /api/risk-assessment/hazards — 전체 유해위험요인 목록 (모아보기용)
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const year = searchParams.get('year')
  const workplaceId = searchParams.get('workplaceId')

  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)

  const where: Prisma.RiskHazardWhereInput = {}

  if (accessibleIds !== null) {
    where.workplaceId = { in: accessibleIds }
  }
  if (year) where.year = parseInt(year)
  if (workplaceId) {
    if (accessibleIds === null || accessibleIds.includes(workplaceId)) {
      where.workplaceId = workplaceId
    }
  }

  const hazards = await prisma.riskHazard.findMany({
    where,
    orderBy: [{ riskScore: 'desc' }, { createdAt: 'asc' }],
    include: {
      chemicalProduct: { select: { id: true, name: true } },
      improvements: {
        select: {
          id: true,
          status: true,
          improvementContent: true,
          riskScore: true,
          severityScore: true,
          likelihoodScore: true,
          additionalPoints: true,
          updateDate: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      card: {
        select: {
          id: true,
          evaluationNumber: true,
          year: true,
          evaluationType: true,
          organizationUnit: {
            select: {
              id: true,
              name: true,
              parent: { select: { id: true, name: true } },
            },
          },
          workplace: { select: { id: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json({ hazards })
}
