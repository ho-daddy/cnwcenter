import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { Prisma, NoisePeriod } from '@prisma/client'
import { parseJsonBody, ApiError } from '@/lib/api-utils'

// GET /api/risk-assessment/noise — 소음 측정 목록
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const workplaceId = searchParams.get('workplaceId')
  const year = searchParams.get('year')
  const unitId = searchParams.get('unitId')

  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)

  const where: Prisma.NoiseMeasurementWhereInput = {
    ...(unitId ? { organizationUnitId: unitId } : {}),
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
    orderBy: [{ year: 'desc' }, { period: 'desc' }],
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

// POST /api/risk-assessment/noise — 소음 측정 등록 (상/하반기 동시 입력 지원)
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { organizationUnitId, year, firstHalf, secondHalf } = body

    if (!organizationUnitId || !year) {
      return NextResponse.json({ error: '조직단위와 연도를 선택해주세요.' }, { status: 400 })
    }

    const yearInt = parseInt(year)
    const results = []

    // 상반기
    if (firstHalf && firstHalf.measurementValue != null && firstHalf.measurementValue !== '') {
      const m = await prisma.noiseMeasurement.upsert({
        where: {
          organizationUnitId_year_period: {
            organizationUnitId,
            year: yearInt,
            period: NoisePeriod.first_half,
          },
        },
        update: { measurementValue: firstHalf.measurementValue, notes: firstHalf.notes || null },
        create: {
          organizationUnitId,
          year: yearInt,
          period: NoisePeriod.first_half,
          measurementValue: firstHalf.measurementValue,
          notes: firstHalf.notes || null,
        },
        include: { organizationUnit: { select: { id: true, name: true } } },
      })
      results.push(m)
    }

    // 하반기
    if (secondHalf && secondHalf.measurementValue != null && secondHalf.measurementValue !== '') {
      const m = await prisma.noiseMeasurement.upsert({
        where: {
          organizationUnitId_year_period: {
            organizationUnitId,
            year: yearInt,
            period: NoisePeriod.second_half,
          },
        },
        update: { measurementValue: secondHalf.measurementValue, notes: secondHalf.notes || null },
        create: {
          organizationUnitId,
          year: yearInt,
          period: NoisePeriod.second_half,
          measurementValue: secondHalf.measurementValue,
          notes: secondHalf.notes || null,
        },
        include: { organizationUnit: { select: { id: true, name: true } } },
      })
      results.push(m)
    }

    if (results.length === 0) {
      return NextResponse.json({ error: '상반기 또는 하반기 중 하나 이상의 측정값을 입력해주세요.' }, { status: 400 })
    }

    return NextResponse.json({ measurements: results }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
