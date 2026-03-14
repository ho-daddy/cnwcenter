import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import { extractAllPhotoPaths } from '@/lib/archive-utils'

type Params = { params: { id: string } }

// GET /api/trash/[id] — 아카이브 상세 조회
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const archived = await prisma.archivedAssessment.findUnique({
    where: { id: params.id },
    include: {
      workplace: { select: { id: true, name: true } },
      deletedBy: { select: { id: true, name: true, email: true } },
    },
  })

  if (!archived) {
    return NextResponse.json({ error: '아카이브를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 사업장 접근 권한 확인
  const access = await requireWorkplaceAccess(archived.workplaceId)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: 403 })
  }

  return NextResponse.json({ archived })
}

// DELETE /api/trash/[id] — 영구 삭제
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const archived = await prisma.archivedAssessment.findUnique({
    where: { id: params.id },
  })

  if (!archived) {
    return NextResponse.json({ error: '아카이브를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 사업장 접근 권한 확인
  const access = await requireWorkplaceAccess(archived.workplaceId)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: 403 })
  }

  // 물리 파일 삭제
  const photoPaths = extractAllPhotoPaths(archived.assessmentData)
  for (const photoPath of photoPaths) {
    try {
      const fullPath = path.join(process.cwd(), 'public', photoPath)
      await unlink(fullPath)
    } catch {
      // 파일이 이미 없을 수 있음
    }
  }

  await prisma.archivedAssessment.delete({ where: { id: params.id } })

  return NextResponse.json({
    success: true,
    message: '영구 삭제되었습니다.',
  })
}
