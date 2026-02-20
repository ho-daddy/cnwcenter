import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'

type Params = { params: { cardId: string; hazardId: string; photoId: string } }

// DELETE /api/risk-assessment/[cardId]/hazards/[hazardId]/photos/[photoId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const photo = await prisma.riskHazardPhoto.findUnique({
    where: { id: params.photoId },
    include: { hazard: { select: { cardId: true, workplaceId: true } } },
  })

  if (!photo || photo.hazardId !== params.hazardId || photo.hazard.cardId !== params.cardId) {
    return NextResponse.json({ error: '사진을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(photo.hazard.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  // 물리 파일 삭제 (실패해도 계속 진행)
  try {
    await unlink(path.join(process.cwd(), 'public', photo.photoPath))
  } catch {
    // 파일이 이미 없을 수 있음
  }

  await prisma.riskHazardPhoto.delete({ where: { id: params.photoId } })

  return NextResponse.json({ success: true })
}
