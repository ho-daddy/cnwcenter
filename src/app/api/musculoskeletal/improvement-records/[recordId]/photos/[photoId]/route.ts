import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'

type Params = { params: { recordId: string; photoId: string } }

// DELETE — 사진 삭제
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const photo = await prisma.mSurveyImprovementPhoto.findUnique({
    where: { id: params.photoId },
    include: {
      record: {
        include: {
          improvement: {
            include: { assessment: { select: { workplaceId: true } } },
          },
        },
      },
    },
  })

  if (!photo || photo.recordId !== params.recordId) {
    return NextResponse.json({ error: '사진을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(photo.record.improvement.assessment.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  try {
    await unlink(path.join(process.cwd(), 'public', photo.photoPath))
  } catch {
    // 파일이 이미 없을 수 있음
  }

  await prisma.mSurveyImprovementPhoto.delete({ where: { id: params.photoId } })

  return NextResponse.json({ success: true })
}
