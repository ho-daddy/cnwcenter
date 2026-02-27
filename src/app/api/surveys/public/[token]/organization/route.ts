import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: { token: string } }

// GET /api/surveys/public/[token]/organization — 설문 연결 사업장의 조직도 조회 (인증 불필요)
export async function GET(req: NextRequest, { params }: Params) {
  const survey = await prisma.survey.findUnique({
    where: { accessToken: params.token },
    select: { workplaceId: true, status: true },
  })

  if (!survey || survey.status !== 'PUBLISHED') {
    return NextResponse.json({ units: [], maxLevel: 0 })
  }

  if (!survey.workplaceId) {
    return NextResponse.json({ units: [], maxLevel: 0 })
  }

  const organization = await prisma.organization.findUnique({
    where: { workplaceId: survey.workplaceId },
  })

  if (!organization) {
    return NextResponse.json({ units: [], maxLevel: 0 })
  }

  const units = await prisma.organizationUnit.findMany({
    where: { organizationId: organization.id },
    select: {
      id: true,
      name: true,
      level: true,
      parentId: true,
      isLeaf: true,
      sortOrder: true,
    },
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
  })

  const maxLevel = units.length > 0 ? Math.max(...units.map(u => u.level)) : 0

  return NextResponse.json({ units, maxLevel })
}
