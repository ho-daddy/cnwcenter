import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import {
  uploadVideoToDrive,
  getUploadFolderId,
  getThumbnailUrl,
} from '@/lib/google-drive'

const ALLOWED_TYPES = [
  'video/webm',
  'video/mp4',
  'video/quicktime',   // .mov
  'video/x-msvideo',   // .avi
  'video/x-matroska',  // .mkv
]
const MAX_SIZE = 500 * 1024 * 1024 // 500MB

// GET /api/videos?elementWorkId=xxx — 특정 요소작업의 영상 목록
// GET /api/videos?assessmentId=xxx — 특정 근골조사의 모든 영상
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const elementWorkId = req.nextUrl.searchParams.get('elementWorkId')
  const assessmentId = req.nextUrl.searchParams.get('assessmentId')

  if (!elementWorkId && !assessmentId) {
    return NextResponse.json({ error: 'elementWorkId 또는 assessmentId가 필요합니다.' }, { status: 400 })
  }

  // 권한 확인: 요소작업 → 근골조사 → 사업장
  let workplaceId: string

  if (elementWorkId) {
    const elementWork = await prisma.elementWork.findUnique({
      where: { id: elementWorkId },
      select: { assessment: { select: { workplaceId: true } } },
    })
    if (!elementWork) {
      return NextResponse.json({ error: '요소작업을 찾을 수 없습니다.' }, { status: 404 })
    }
    workplaceId = elementWork.assessment.workplaceId
  } else {
    const assessment = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: assessmentId! },
      select: { workplaceId: true },
    })
    if (!assessment) {
      return NextResponse.json({ error: '근골조사를 찾을 수 없습니다.' }, { status: 404 })
    }
    workplaceId = assessment.workplaceId
  }

  const access = await requireWorkplaceAccess(workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  // 영상 조회
  const where = elementWorkId
    ? { elementWorkId }
    : { elementWork: { assessmentId: assessmentId! } }

  const videos = await prisma.workVideo.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
    select: {
      id: true,
      elementWorkId: true,
      processName: true,
      recorder: true,
      recordedAt: true,
      driveFileId: true,
      driveUrl: true,
      thumbnailUrl: true,
      fileName: true,
      mimeType: true,
      originalSize: true,
      durationSec: true,
      resolution: true,
      status: true,
      uploadProgress: true,
      errorMessage: true,
      createdAt: true,
      elementWork: {
        select: { id: true, name: true, sortOrder: true },
      },
    },
  })

  // BigInt → number 변환 (JSON 직렬화)
  const serialized = videos.map((v) => ({
    ...v,
    originalSize: v.originalSize ? Number(v.originalSize) : null,
  }))

  return NextResponse.json({ videos: serialized })
}

// POST /api/videos — 영상 업로드
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const formData = await req.formData()

  const file = formData.get('file') as File | null
  const elementWorkId = formData.get('elementWorkId') as string | null
  const processName = formData.get('processName') as string | null
  const recorder = formData.get('recorder') as string | null
  const durationSec = formData.get('durationSec') as string | null

  // 필수 필드 검증
  if (!file || !elementWorkId || !processName) {
    return NextResponse.json(
      { error: '파일, elementWorkId, processName은 필수입니다.' },
      { status: 400 }
    )
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: '지원하지 않는 파일 형식입니다. (mp4, webm, mov, avi, mkv)' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: '파일 크기는 500MB 이하여야 합니다.' },
      { status: 400 }
    )
  }

  // 요소작업 존재 + 사업장 권한 확인
  const elementWork = await prisma.elementWork.findUnique({
    where: { id: elementWorkId },
    include: {
      assessment: {
        include: {
          workplace: true,
          organizationUnit: true,
        },
      },
    },
  })

  if (!elementWork) {
    return NextResponse.json({ error: '요소작업을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(elementWork.assessment.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  // DB 레코드 먼저 생성 (UPLOADING 상태)
  const video = await prisma.workVideo.create({
    data: {
      elementWorkId,
      processName,
      recorder: recorder || auth.user!.name || '촬영자',
      fileName: file.name,
      mimeType: file.type,
      originalSize: BigInt(file.size),
      durationSec: durationSec ? parseInt(durationSec) : null,
      status: 'UPLOADING',
      uploadProgress: 0,
      uploadedById: auth.user!.id,
    },
  })

  // Google Drive 업로드
  try {
    const workplaceName = elementWork.assessment.workplace?.name || '미분류'
    const assessmentLabel = `${elementWork.assessment.year}년_${elementWork.assessment.assessmentType}`
    const folderId = await getUploadFolderId(workplaceName, assessmentLabel, elementWork.name)

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const driveFileName = `${processName}_${timestamp}_${file.name}`

    const { fileId, webViewLink } = await uploadVideoToDrive({
      buffer,
      fileName: driveFileName,
      mimeType: file.type,
      folderId,
    })

    // 업로드 성공 → DB 업데이트
    const thumbnailUrl = getThumbnailUrl(fileId)

    const updatedVideo = await prisma.workVideo.update({
      where: { id: video.id },
      data: {
        driveFileId: fileId,
        driveUrl: webViewLink,
        thumbnailUrl,
        status: 'UPLOADED',
        uploadProgress: 100,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '영상이 업로드되었습니다.',
        video: {
          id: updatedVideo.id,
          driveFileId: updatedVideo.driveFileId,
          driveUrl: updatedVideo.driveUrl,
          thumbnailUrl: updatedVideo.thumbnailUrl,
          status: updatedVideo.status,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    // 업로드 실패 → DB 상태 업데이트
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류'
    await prisma.workVideo.update({
      where: { id: video.id },
      data: {
        status: 'FAILED',
        errorMessage: errorMsg,
      },
    })

    console.error('[Video Upload Error]', error)
    return NextResponse.json(
      { error: '영상 업로드에 실패했습니다.', detail: errorMsg, videoId: video.id },
      { status: 500 }
    )
  }
}
