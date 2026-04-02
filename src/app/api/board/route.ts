import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// GET /api/board — 게시글 목록 (최신순, 페이지네이션)
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const search = searchParams.get('search')?.trim() || ''
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { content: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [posts, total] = await Promise.all([
    prisma.boardPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    }),
    prisma.boardPost.count({ where }),
  ])

  return NextResponse.json({ posts, total, page, limit })
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/haansofthwp', 'application/x-hwp',
  'text/plain', 'application/zip',
]
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

// POST /api/board — 게시글 작성 (로그인 사용자)
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const formData = await req.formData()
  const title = (formData.get('title') as string)?.trim()
  const content = (formData.get('content') as string) || null
  const files = formData.getAll('files') as File[]

  if (!title) {
    return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
  }

  // 파일 검증
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.hwp')) {
      return NextResponse.json({ error: `허용되지 않는 파일 형식입니다: ${file.name}` }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `파일 크기가 20MB를 초과합니다: ${file.name}` }, { status: 400 })
    }
  }

  const post = await prisma.boardPost.create({
    data: {
      title,
      content,
      authorId: auth.user!.id,
    },
  })

  // 첨부파일 저장
  if (files.length > 0) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'board', post.id)
    await mkdir(uploadDir, { recursive: true })

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = path.extname(file.name)
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
      const filePath = path.join(uploadDir, safeName)
      await writeFile(filePath, buffer)

      await prisma.boardAttachment.create({
        data: {
          postId: post.id,
          fileName: file.name,
          filePath: `/uploads/board/${post.id}/${safeName}`,
          fileType: file.type || 'application/octet-stream',
          fileSize: buffer.length,
        },
      })
    }
  }

  return NextResponse.json(post, { status: 201 })
}
