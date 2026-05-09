import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import { getThumbnailUrl, setFilePublicReader } from '@/lib/google-drive'

/**
 * Resumable Upload 완료 처리
 *
 * 클라이언트가 Drive 에 직접 업로드를 완료한 후
 * { driveFileId } 를 보내 호출한다.
 *
 * 서버는
 * - 권한 재확인
 * - DB 레코드를 UPLOADED 로 업데이트
 * - Drive 파일에 anyone reader 권한 설정
 */

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth.authorized)
    return NextResponse.json({ error: auth.error }, { status: 401 })

  let body: { driveFileId?: string; driveUrl?: string; durationSec?: number } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON body required' }, { status: 400 })
  }

  const { driveFileId, driveUrl, durationSec } = body
  if (!driveFileId) {
    return NextResponse.json(
      { error: 'driveFileId 가 필요합니다.' },
      { status: 400 }
    )
  }

  const video = await prisma.workVideo.findUnique({
    where: { id: params.id },
    include: {
      elementWork: { include: { assessment: { select: { workplaceId: true } } } },
    },
  })

  if (!video) {
    return NextResponse.json(
      { error: '영상 레코드를 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  const access = await requireWorkplaceAccess(
    video.elementWork.assessment.workplaceId
  )
  if (!access.authorized)
    return NextResponse.json({ error: access.error }, { status: 403 })

  try {
    // anyone with link reader 권한 설정 (실패해도 업로드는 완료된 상태)
    await setFilePublicReader(driveFileId).catch((err) => {
      console.warn('[complete-upload] setFilePublicReader failed', err)
    })

    const thumbnailUrl = getThumbnailUrl(driveFileId)
    const finalDriveUrl =
      driveUrl || `https://drive.google.com/file/d/${driveFileId}/view`

    const updated = await prisma.workVideo.update({
      where: { id: params.id },
      data: {
        driveFileId,
        driveUrl: finalDriveUrl,
        thumbnailUrl,
        status: 'UPLOADED',
        uploadProgress: 100,
        durationSec: durationSec ?? video.durationSec,
        errorMessage: null,
      },
    })

    return NextResponse.json({
      success: true,
      video: {
        id: updated.id,
        driveFileId: updated.driveFileId,
        driveUrl: updated.driveUrl,
        thumbnailUrl: updated.thumbnailUrl,
        status: updated.status,
      },
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '알 수 없는 오류'
    console.error('[complete-upload]', err)
    return NextResponse.json(
      { error: '완료 처리 중 오류', detail: errMsg },
      { status: 500 }
    )
  }
}

/**
 * 업로드 실패 처리 (선택)
 * 클라이언트가 청크 업로드를 포기했을 때 DB 상태를 FAILED 로 마킹
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth.authorized)
    return NextResponse.json({ error: auth.error }, { status: 401 })

  const video = await prisma.workVideo.findUnique({
    where: { id: params.id },
    include: {
      elementWork: { include: { assessment: { select: { workplaceId: true } } } },
    },
  })
  if (!video)
    return NextResponse.json(
      { error: '영상 레코드를 찾을 수 없습니다.' },
      { status: 404 }
    )

  const access = await requireWorkplaceAccess(
    video.elementWork.assessment.workplaceId
  )
  if (!access.authorized)
    return NextResponse.json({ error: access.error }, { status: 403 })

  const errorMessage =
    new URL(req.url).searchParams.get('reason') || '업로드 취소됨'

  await prisma.workVideo.update({
    where: { id: params.id },
    data: { status: 'FAILED', errorMessage },
  })

  return NextResponse.json({ success: true })
}
