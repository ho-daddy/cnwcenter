import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'

type Params = { params: { recordId: string } }

// PUT — 개선이력 수정
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const record = await prisma.mSurveyImprovementRecord.findUnique({
    where: { id: params.recordId },
    include: {
      improvement: {
        include: { assessment: { select: { workplaceId: true } } },
      },
    },
  })
  if (!record) return NextResponse.json({ error: '개선이력을 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(record.improvement.assessment.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  try {
    const body = await req.json()

    const updated = await prisma.mSurveyImprovementRecord.update({
      where: { id: params.recordId },
      data: {
        status: body.status ?? record.status,
        updateDate: body.updateDate ? new Date(body.updateDate) : record.updateDate,
        improvementContent: body.improvementContent ?? record.improvementContent,
        responsiblePerson: body.responsiblePerson ?? record.responsiblePerson,
        remarks: body.remarks !== undefined ? (body.remarks || null) : record.remarks,
      },
      include: {
        photos: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, photoPath: true, thumbnailPath: true },
        },
      },
    })

    // MSurveyImprovement 상태를 최신 이력으로 동기화
    const latestRecord = await prisma.mSurveyImprovementRecord.findFirst({
      where: { improvementId: record.improvementId },
      orderBy: { updatedAt: 'desc' },
    })
    if (latestRecord) {
      await prisma.mSurveyImprovement.update({
        where: { id: record.improvementId },
        data: {
          status: latestRecord.status,
          updateDate: latestRecord.updateDate,
          responsiblePerson: latestRecord.responsiblePerson,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[MSurvey Records] 수정 오류:', error)
    return NextResponse.json({ error: '개선이력 수정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE — 개선이력 삭제
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const record = await prisma.mSurveyImprovementRecord.findUnique({
    where: { id: params.recordId },
    include: {
      improvement: {
        include: { assessment: { select: { workplaceId: true } } },
      },
    },
  })
  if (!record) return NextResponse.json({ error: '개선이력을 찾을 수 없습니다.' }, { status: 404 })

  const access = await requireWorkplaceAccess(record.improvement.assessment.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  await prisma.mSurveyImprovementRecord.delete({ where: { id: params.recordId } })

  // 남은 이력 중 최신으로 MSurveyImprovement 상태 동기화
  const latestRecord = await prisma.mSurveyImprovementRecord.findFirst({
    where: { improvementId: record.improvementId },
    orderBy: { updatedAt: 'desc' },
  })
  if (latestRecord) {
    await prisma.mSurveyImprovement.update({
      where: { id: record.improvementId },
      data: {
        status: latestRecord.status,
        updateDate: latestRecord.updateDate,
        responsiblePerson: latestRecord.responsiblePerson,
      },
    })
  }

  return NextResponse.json({ success: true })
}
