import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireStaffOrAbove } from '@/lib/auth-utils'
import { writeFile, mkdir, unlink, rmdir } from 'fs/promises'
import path from 'path'

type Params = { params: { id: string } }

// GET /api/board/[id] — 게시글 상세 + 댓글 + 첨부파일
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const post = await prisma.boardPost.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true } } },
      },
      attachments: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 조회수 증가 (비동기, 에러 무시)
  prisma.boardPost.update({
    where: { id: params.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  return NextResponse.json(post)
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
const MAX_FILE_SIZE = 20 * 1024 * 1024

// PUT /api/board/[id] — 게시글 수정 (작성자 본인 또는 STAFF+)
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const existing = await prisma.boardPost.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const isStaff = auth.user!.role === 'SUPER_ADMIN' || auth.user!.role === 'STAFF'
  if (existing.authorId !== auth.user!.id && !isStaff) {
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 })
  }

  const formData = await req.formData()
  const title = (formData.get('title') as string)?.trim()
  const content = (formData.get('content') as string) || null
  const deleteAttachmentIds = formData.getAll('deleteAttachments') as string[]
  const newFiles = formData.getAll('files') as File[]

  if (!title) {
    return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
  }

  // 새 파일 검증
  for (const file of newFiles) {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.hwp')) {
      return NextResponse.json({ error: `허용되지 않는 파일 형식입니다: ${file.name}` }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `파일 크기가 20MB를 초과합니다: ${file.name}` }, { status: 400 })
    }
  }

  // 삭제할 첨부파일 처리
  if (deleteAttachmentIds.length > 0) {
    const attachments = await prisma.boardAttachment.findMany({
      where: { id: { in: deleteAttachmentIds }, postId: params.id },
    })
    for (const att of attachments) {
      try {
        await unlink(path.join(process.cwd(), 'public', att.filePath))
      } catch {}
    }
    await prisma.boardAttachment.deleteMany({
      where: { id: { in: deleteAttachmentIds } },
    })
  }

  // 새 첨부파일 저장
  if (newFiles.length > 0) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'board', params.id)
    await mkdir(uploadDir, { recursive: true })

    for (const file of newFiles) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = path.extname(file.name)
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
      const filePath = path.join(uploadDir, safeName)
      await writeFile(filePath, buffer)

      await prisma.boardAttachment.create({
        data: {
          postId: params.id,
          fileName: file.name,
          filePath: `/uploads/board/${params.id}/${safeName}`,
          fileType: file.type || 'application/octet-stream',
          fileSize: buffer.length,
        },
      })
    }
  }

  const post = await prisma.boardPost.update({
    where: { id: params.id },
    data: { title, content },
    include: {
      author: { select: { id: true, name: true } },
      attachments: true,
    },
  })

  return NextResponse.json(post)
}

// DELETE /api/board/[id] — 게시글 삭제 (작성자 본인 또는 STAFF+)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const existing = await prisma.boardPost.findUnique({
    where: { id: params.id },
    include: { attachments: true },
  })
  if (!existing) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  }

  const isStaff = auth.user!.role === 'SUPER_ADMIN' || auth.user!.role === 'STAFF'
  if (existing.authorId !== auth.user!.id && !isStaff) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  }

  // 첨부파일 물리 삭제
  for (const att of existing.attachments) {
    try {
      await unlink(path.join(process.cwd(), 'public', att.filePath))
    } catch {}
  }
  try {
    await rmdir(path.join(process.cwd(), 'public', 'uploads', 'board', params.id))
  } catch {}

  await prisma.boardPost.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
