import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// 첨부파일 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const elementWorkId = searchParams.get('elementWorkId')

    const assessment = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: params.assessmentId },
      select: { workplaceId: true },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: '조사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (assessment.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const where: { assessmentId: string; elementWorkId?: string | null } = {
      assessmentId: params.assessmentId,
    }

    if (elementWorkId) {
      where.elementWorkId = elementWorkId
    }

    const attachments = await prisma.mSurveyAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ attachments })
  } catch (error) {
    console.error('[Attachments] 조회 오류:', error)
    return NextResponse.json(
      { error: '첨부파일 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 첨부파일 업로드
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const elementWorkId = formData.get('elementWorkId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 제한 (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 50MB를 초과할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 허용된 파일 타입
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '허용되지 않는 파일 형식입니다.' },
        { status: 400 }
      )
    }

    const assessment = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: params.assessmentId },
      include: {
        organizationUnit: { select: { name: true } },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: '조사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (assessment.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 요소작업 정보 조회 (있는 경우)
    let elementWorkName = ''
    if (elementWorkId) {
      const elementWork = await prisma.elementWork.findUnique({
        where: { id: elementWorkId },
        select: { name: true },
      })
      if (elementWork) {
        elementWorkName = elementWork.name
      }
    }

    // 저장 경로 생성: /uploads/musculoskeletal/{assessmentId}/{timestamp}_{originalName}
    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'musculoskeletal',
      params.assessmentId
    )

    await mkdir(uploadDir, { recursive: true })

    // 파일명 생성: {공정명}_{요소작업명}_{timestamp}.{ext}
    const ext = path.extname(file.name)
    const timestamp = Date.now()
    const safeName = assessment.organizationUnit.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')
    const safeWorkName = elementWorkName.replace(/[^a-zA-Z0-9가-힣]/g, '_')
    const fileName = safeWorkName
      ? `${safeName}_${safeWorkName}_${timestamp}${ext}`
      : `${safeName}_${timestamp}${ext}`

    const filePath = path.join(uploadDir, fileName)
    const publicPath = `/uploads/musculoskeletal/${params.assessmentId}/${fileName}`

    // 파일 저장
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // DB에 기록
    const attachment = await prisma.mSurveyAttachment.create({
      data: {
        assessmentId: params.assessmentId,
        elementWorkId: elementWorkId || null,
        fileName,
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: publicPath,
      },
    })

    return NextResponse.json({
      success: true,
      message: '파일이 업로드되었습니다.',
      attachment,
    })
  } catch (error) {
    console.error('[Attachments] 업로드 오류:', error)
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
