import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

type Params = { params: { caseId: string } }

// POST /api/counseling/[caseId]/documents — 파일 업로드 (최대 10개)
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const c = await prisma.counselingCase.findUnique({
    where: { id: params.caseId },
    include: { _count: { select: { documents: true } } },
  })
  if (!c) return NextResponse.json({ error: '케이스를 찾을 수 없습니다.' }, { status: 404 })

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: '파일을 선택해주세요.' }, { status: 400 })
  }

  if (c._count.documents + files.length > 10) {
    return NextResponse.json({ error: '첨부파일은 최대 10개까지 가능합니다.' }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'counseling', params.caseId)
  await mkdir(uploadDir, { recursive: true })

  const savedDocs = []

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = path.extname(file.name)
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    const filePath = path.join(uploadDir, safeName)

    await writeFile(filePath, buffer)

    const doc = await prisma.document.create({
      data: {
        caseId: params.caseId,
        fileName: file.name,
        fileUrl: `/uploads/counseling/${params.caseId}/${safeName}`,
        fileType: file.type || 'application/octet-stream',
        fileSize: buffer.length,
      },
    })

    savedDocs.push(doc)
  }

  return NextResponse.json(savedDocs, { status: 201 })
}
