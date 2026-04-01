import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'

type Params = { params: { recordId: string } }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// GET — 사진 목록
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const record = await prisma.mSurveyImprovementRecord.findUnique({
    where: { id: params.recordId },
    include: {
      improvement: {
        include: { assessment: { select: { workplaceId: true } } },
      },
    },
  })
  if (!record) return NextResponse.json({ error: '개선이력을 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(record.improvement.assessment.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  const photos = await prisma.mSurveyImprovementPhoto.findMany({
    where: { recordId: params.recordId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, photoPath: true, thumbnailPath: true },
  })

  return NextResponse.json({ photos })
}

// POST — 사진 업로드
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const record = await prisma.mSurveyImprovementRecord.findUnique({
    where: { id: params.recordId },
    include: {
      improvement: {
        include: { assessment: { select: { workplaceId: true } } },
      },
    },
  })
  if (!record) return NextResponse.json({ error: '개선이력을 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(record.improvement.assessment.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'JPG, PNG, GIF, WebP 파일만 업로드할 수 있습니다.' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 })

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'musculoskeletal', 'improvement-records', params.recordId)
  await mkdir(uploadDir, { recursive: true })

  const ext = path.extname(file.name) || '.jpg'
  const safeName = file.name.replace(ext, '').replace(/[^a-zA-Z0-9가-힣._-]/g, '_').slice(0, 50)
  const fileName = `${Date.now()}_${safeName}${ext}`
  const filePath = path.join(uploadDir, fileName)

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  const publicPath = `/uploads/musculoskeletal/improvement-records/${params.recordId}/${fileName}`

  const photo = await prisma.mSurveyImprovementPhoto.create({
    data: { recordId: params.recordId, photoPath: publicPath },
    select: { id: true, photoPath: true, thumbnailPath: true },
  })

  return NextResponse.json(photo, { status: 201 })
}
