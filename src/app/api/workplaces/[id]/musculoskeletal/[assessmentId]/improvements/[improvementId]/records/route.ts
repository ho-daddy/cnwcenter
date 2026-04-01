import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

type Params = { params: { id: string; assessmentId: string; improvementId: string } }

// GET — 개선이력 목록
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireWorkplaceAccess(params.id)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const records = await prisma.mSurveyImprovementRecord.findMany({
    where: { improvementId: params.improvementId },
    orderBy: { updateDate: 'asc' },
    include: {
      photos: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, photoPath: true, thumbnailPath: true },
      },
    },
  })

  return NextResponse.json({ records })
}

// POST — 개선이력 추가
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireWorkplaceAccess(params.id)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await req.json()
    const { status, updateDate, improvementContent, responsiblePerson, remarks } = body

    if (!improvementContent?.trim() || !responsiblePerson?.trim()) {
      return NextResponse.json({ error: '개선내용과 담당자는 필수입니다.' }, { status: 400 })
    }

    // 이력 생성
    const record = await prisma.mSurveyImprovementRecord.create({
      data: {
        improvementId: params.improvementId,
        status: status || 'PLANNED',
        updateDate: new Date(updateDate),
        improvementContent,
        responsiblePerson,
        remarks: remarks || null,
      },
      include: {
        photos: {
          select: { id: true, photoPath: true, thumbnailPath: true },
        },
      },
    })

    // MSurveyImprovement 상태를 최신 이력으로 동기화
    await prisma.mSurveyImprovement.update({
      where: { id: params.improvementId },
      data: {
        status: record.status,
        updateDate: record.updateDate,
        responsiblePerson: record.responsiblePerson,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('[MSurvey Records] 추가 오류:', error)
    return NextResponse.json({ error: '개선이력 추가 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
