import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import {
  createResumableUploadSession,
  getUploadFolderId,
} from '@/lib/google-drive'

/**
 * Resumable Upload 세션 시작 API
 *
 * 클라이언트가 직접 Google Drive 로 영상을 업로드하기 위해
 * (1) DB 에 UPLOADING 레코드를 만들고
 * (2) Drive Resumable Session URL 을 발급해서 응답한다.
 *
 * 클라이언트는 응답으로 받은 uploadUrl 에 PUT 으로 파일 데이터를 보낸 후
 * /api/videos/[id]/complete-upload 를 호출한다.
 */

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = [
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
]
const MAX_SIZE = 500 * 1024 * 1024

interface InitiateBody {
  fileName?: string
  fileSize?: number
  mimeType?: string
  elementWorkId?: string
  processName?: string
  recorder?: string
  durationSec?: number
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized)
    return NextResponse.json({ error: auth.error }, { status: 401 })

  let body: InitiateBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON body required' }, { status: 400 })
  }

  const {
    fileName,
    fileSize,
    mimeType,
    elementWorkId,
    processName,
    recorder,
    durationSec,
  } = body

  if (!fileName || !fileSize || !mimeType || !elementWorkId || !processName) {
    return NextResponse.json(
      {
        error:
          'fileName, fileSize, mimeType, elementWorkId, processName 은 필수입니다.',
      },
      { status: 400 }
    )
  }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: '지원하지 않는 파일 형식입니다. (mp4, webm, mov, avi, mkv)' },
      { status: 400 }
    )
  }

  if (fileSize > MAX_SIZE) {
    return NextResponse.json(
      { error: '파일 크기는 500MB 이하여야 합니다.' },
      { status: 400 }
    )
  }

  // 요소작업 + 사업장 권한 확인
  const elementWork = await prisma.elementWork.findUnique({
    where: { id: elementWorkId },
    include: {
      assessment: {
        include: { workplace: true, organizationUnit: true },
      },
    },
  })

  if (!elementWork) {
    return NextResponse.json(
      { error: '요소작업을 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  const access = await requireWorkplaceAccess(elementWork.assessment.workplaceId)
  if (!access.authorized)
    return NextResponse.json({ error: access.error }, { status: 403 })

  // DB UPLOADING 레코드 생성
  const video = await prisma.workVideo.create({
    data: {
      elementWorkId,
      processName,
      recorder: recorder || auth.user!.name || '촬영자',
      fileName,
      mimeType,
      originalSize: BigInt(fileSize),
      durationSec: durationSec ?? null,
      status: 'UPLOADING',
      uploadProgress: 0,
      uploadedById: auth.user!.id,
    },
  })

  try {
    const workplaceName = elementWork.assessment.workplace?.name || '미분류'
    const assessmentLabel = `${elementWork.assessment.year}년_${elementWork.assessment.assessmentType}`
    const folderId = await getUploadFolderId(
      workplaceName,
      assessmentLabel,
      elementWork.name
    )

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const driveFileName = `${processName}_${timestamp}_${fileName}`

    // 클라이언트 Origin — Drive uploadUrl 의 cross-origin 허용을 위해 필수.
    // same-origin 요청이면 origin 헤더가 없을 수 있으므로 host 로 fallback.
    const protoHeader = req.headers.get('x-forwarded-proto')
    const fallbackProto = protoHeader || 'http'
    const clientOrigin =
      req.headers.get('origin') ||
      `${fallbackProto}://${req.headers.get('host') || 'localhost'}`

    const { uploadUrl } = await createResumableUploadSession({
      folderId,
      fileName: driveFileName,
      mimeType,
      fileSize,
      origin: clientOrigin,
    })

    return NextResponse.json({
      success: true,
      videoId: video.id,
      uploadUrl,
      driveFileName,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '알 수 없는 오류'
    await prisma.workVideo.update({
      where: { id: video.id },
      data: { status: 'FAILED', errorMessage: errMsg },
    })
    console.error('[initiate-upload]', err)
    return NextResponse.json(
      {
        error: 'Resumable Upload 세션을 시작할 수 없습니다.',
        detail: errMsg,
        videoId: video.id,
      },
      { status: 500 }
    )
  }
}
