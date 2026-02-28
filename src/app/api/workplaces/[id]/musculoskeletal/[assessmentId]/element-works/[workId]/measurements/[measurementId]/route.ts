import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

type Params = { params: { id: string; assessmentId: string; workId: string; measurementId: string } }

// PUT - 측정 수정
export async function PUT(req: NextRequest, { params }: Params) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  const existing = await prisma.workMeasurement.findUnique({
    where: { id: params.measurementId },
  })
  if (!existing || existing.elementWorkId !== params.workId) {
    return NextResponse.json({ error: '측정을 찾을 수 없습니다.' }, { status: 404 })
  }

  const body = await req.json()
  const measurement = await prisma.workMeasurement.update({
    where: { id: params.measurementId },
    data: {
      name: body.name ?? existing.name,
      weight: body.weight !== undefined ? (body.weight != null ? parseFloat(body.weight) : null) : existing.weight,
      force: body.force !== undefined ? (body.force != null ? parseFloat(body.force) : null) : existing.force,
      frequency: body.frequency !== undefined ? (body.frequency != null ? parseInt(body.frequency) : null) : existing.frequency,
      exposureHours: body.exposureHours !== undefined ? (body.exposureHours != null ? parseFloat(body.exposureHours) : null) : existing.exposureHours,
    },
  })

  return NextResponse.json(measurement)
}

// DELETE - 측정 삭제
export async function DELETE(req: NextRequest, { params }: Params) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  const existing = await prisma.workMeasurement.findUnique({
    where: { id: params.measurementId },
  })
  if (!existing || existing.elementWorkId !== params.workId) {
    return NextResponse.json({ error: '측정을 찾을 수 없습니다.' }, { status: 404 })
  }

  await prisma.workMeasurement.delete({ where: { id: params.measurementId } })

  return NextResponse.json({ success: true })
}
