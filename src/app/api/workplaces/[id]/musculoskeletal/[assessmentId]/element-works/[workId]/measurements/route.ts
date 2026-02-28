import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'
import { MeasurementType } from '@prisma/client'

type Params = { params: { id: string; assessmentId: string; workId: string } }

// GET - 요소작업별 측정 목록
export async function GET(req: NextRequest, { params }: Params) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  const measurements = await prisma.workMeasurement.findMany({
    where: { elementWorkId: params.workId },
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
  })

  return NextResponse.json({ measurements })
}

// POST - 측정 추가
export async function POST(req: NextRequest, { params }: Params) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  const body = await req.json()
  const { type, name, weight, force, frequency, exposureHours } = body

  if (!type || !name) {
    return NextResponse.json({ error: '유형과 명칭은 필수입니다.' }, { status: 400 })
  }

  if (!Object.values(MeasurementType).includes(type)) {
    return NextResponse.json({ error: '올바른 유형을 선택하세요.' }, { status: 400 })
  }

  // 같은 유형 최대 10개 제한
  const count = await prisma.workMeasurement.count({
    where: { elementWorkId: params.workId, type },
  })
  if (count >= 10) {
    return NextResponse.json({ error: '같은 유형은 최대 10개까지 등록할 수 있습니다.' }, { status: 400 })
  }

  const measurement = await prisma.workMeasurement.create({
    data: {
      elementWorkId: params.workId,
      type,
      sortOrder: count,
      name,
      weight: weight != null ? parseFloat(weight) : null,
      force: force != null ? parseFloat(force) : null,
      frequency: frequency != null ? parseInt(frequency) : null,
      exposureHours: exposureHours != null ? parseFloat(exposureHours) : null,
    },
  })

  return NextResponse.json(measurement, { status: 201 })
}
