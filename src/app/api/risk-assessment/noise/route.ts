import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { Prisma, NoisePeriod } from '@prisma/client'

// GET /api/risk-assessment/noise — 소음 측정 목록
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const workplaceId = searchParams.get('workplaceId')
  const year = searchParams.get('year')

  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)

  // organizationUnit을 통해 workplace 필터링
  const where: Prisma.NoiseMeasurementWhereInput = {
    organizationUnit: {
      organization: {
        ...(accessibleIds !== null
          ? { workplaceId: { in: accessibleIds } }
          : {}),
        ...(workplaceId ? { workplaceId } : {}),
      },
    },
    ...(year ? { year: parseInt(year) } : {}),
  }

  const measurements = await prisma.noiseMeasurement.findMany({
    where,
    orderBy: [{ year: 'desc' }, { period: 'asc' }],
    include: {
      organizationUnit: {
        select: {
          id: true,
          name: true,
          organization: {
            select: { workplaceId: true, workplace: { select: { name: true } } },
          },
        },
      },
    },
  })

  return NextResponse.json({ measurements })
}

// POST /api/risk-assessment/noise — 소음 측정 등록
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await req.json()
  const { organizationUnitId, year, period, measurementValue, notes } = body

  if (!organizationUnitId || !year || !period || measurementValue == null) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
  }

  try {
    const measurement = await prisma.noiseMeasurement.upsert({
      where: {
        organizationUnitId_year_period: {
          organizationUnitId,
          year: parseInt(year),
          period: period as NoisePeriod,
        },
      },
      update: { measurementValue, notes: notes || null },
      create: {
        organizationUnitId,
        year: parseInt(year),
        period: period as NoisePeriod,
        measurementValue,
        notes: notes || null,
      },
      include: {
        organizationUnit: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(measurement, { status: 201 })
  } catch (e: unknown) {
    console.error(e)
    return NextResponse.json({ error: '소음 측정값 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
