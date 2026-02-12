import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 아카이브된 조사 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const archives = await prisma.archivedAssessment.findMany({
      where: { workplaceId: params.id },
      select: {
        id: true,
        unitName: true,
        unitPath: true,
        year: true,
        assessmentType: true,
        archivedAt: true,
        archivedReason: true,
        originalAssessmentId: true,
      },
      orderBy: { archivedAt: 'desc' },
    })

    return NextResponse.json({ archives })
  } catch (error) {
    console.error('[ArchivedAssessment] 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '아카이브 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
