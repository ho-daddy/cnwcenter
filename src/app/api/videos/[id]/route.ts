import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import { getEmbedUrl, getStreamUrl, deleteFileFromDrive } from '@/lib/google-drive'

type Params = { params: { id: string } }

// GET /api/videos/[id] — 영상 상세 조회 + 스트리밍 URL
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const video = await prisma.workVideo.findUnique({
    where: { id: params.id },
    include: {
      elementWork: {
        select: {
          id: true,
          name: true,
          assessment: {
            select: { workplaceId: true },
          },
        },
      },
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
  })

  if (!video) {
    return NextResponse.json({ error: '영상을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(video.elementWork.assessment.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  return NextResponse.json({
    video: {
      id: video.id,
      elementWorkId: video.elementWorkId,
      elementWorkName: video.elementWork.name,
      processName: video.processName,
      recorder: video.recorder,
      recordedAt: video.recordedAt,
      driveFileId: video.driveFileId,
      driveUrl: video.driveUrl,
      thumbnailUrl: video.thumbnailUrl,
      fileName: video.fileName,
      mimeType: video.mimeType,
      originalSize: video.originalSize ? Number(video.originalSize) : null,
      durationSec: video.durationSec,
      resolution: video.resolution,
      status: video.status,
      uploadProgress: video.uploadProgress,
      errorMessage: video.errorMessage,
      uploadedBy: video.uploadedBy,
      createdAt: video.createdAt,
      // 스트리밍/임베드 URL
      streamUrl: video.driveFileId ? getStreamUrl(video.driveFileId) : null,
      embedUrl: video.driveFileId ? getEmbedUrl(video.driveFileId) : null,
    },
  })
}

// DELETE /api/videos/[id] — 영상 삭제 (Drive + DB)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const video = await prisma.workVideo.findUnique({
    where: { id: params.id },
    include: {
      elementWork: {
        select: { assessment: { select: { workplaceId: true } } },
      },
    },
  })

  if (!video) {
    return NextResponse.json({ error: '영상을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(video.elementWork.assessment.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  // 본인 업로드 또는 STAFF 이상만 삭제 가능
  const user = auth.user!
  if (video.uploadedById !== user.id && user.role === 'WORKPLACE_USER') {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  }

  // Google Drive에서 삭제
  if (video.driveFileId) {
    try {
      await deleteFileFromDrive(video.driveFileId)
    } catch (error) {
      console.error('[Drive Delete Error]', error)
      // Drive 삭제 실패해도 DB는 정리
    }
  }

  await prisma.workVideo.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true, message: '영상이 삭제되었습니다.' })
}
