import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { parseJsonBody, ApiError } from '@/lib/api-utils'

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

  try {
    const body = await parseJsonBody(req)
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
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST - 측정 사진 업로드
export async function POST(req: NextRequest, { params }: Params) {
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

  const formData = await req.formData()
  const file = formData.get('photo') as File | null
  if (!file) {
    return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하만 가능합니다.' }, { status: 400 })
  }

  // 기존 사진 삭제
  if (existing.photoPath) {
    try {
      await unlink(path.join(process.cwd(), 'public', existing.photoPath))
    } catch { /* ignore */ }
  }

  const ext = path.extname(file.name) || '.jpg'
  const fileName = `${params.measurementId}_${Date.now()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'musculoskeletal', params.assessmentId, 'measurements')
  await mkdir(uploadDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filePath = path.join(uploadDir, fileName)
  await writeFile(filePath, buffer)

  const photoPath = `/uploads/musculoskeletal/${params.assessmentId}/measurements/${fileName}`
  const measurement = await prisma.workMeasurement.update({
    where: { id: params.measurementId },
    data: { photoPath },
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

  // 사진 파일 삭제
  if (existing.photoPath) {
    try {
      await unlink(path.join(process.cwd(), 'public', existing.photoPath))
    } catch { /* ignore */ }
  }

  await prisma.workMeasurement.delete({ where: { id: params.measurementId } })

  return NextResponse.json({ success: true })
}
