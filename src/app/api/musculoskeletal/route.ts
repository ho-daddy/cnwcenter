import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'
import { MSurveyStatus, Prisma } from '@prisma/client'

// 전체 조사 목록 조회 (모아보기용)
export async function GET(request: NextRequest) {
  const authCheck = await requireAuth()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const status = searchParams.get('status')
    const workplaceId = searchParams.get('workplaceId')

    const where: Prisma.MusculoskeletalAssessmentWhereInput = {}

    // WORKPLACE_USER의 경우 할당된 사업장만 조회
    const user = authCheck.user!
    const accessibleIds = await getAccessibleWorkplaceIds(user.id, user.role)
    if (accessibleIds !== null) {
      where.workplaceId = { in: accessibleIds }
    }

    if (year) where.year = parseInt(year)
    if (status && Object.values(MSurveyStatus).includes(status as MSurveyStatus)) {
      where.status = status as MSurveyStatus
    }
    // workplaceId 필터가 있으면 추가 (이미 accessibleIds로 제한되어 있으면 AND 조건)
    if (workplaceId) {
      if (accessibleIds === null || accessibleIds.includes(workplaceId)) {
        where.workplaceId = workplaceId
      }
    }

    const assessments = await prisma.musculoskeletalAssessment.findMany({
      where,
      orderBy: [{ year: 'desc' }, { updatedAt: 'desc' }],
      include: {
        workplace: {
          select: { id: true, name: true },
        },
        organizationUnit: {
          select: { name: true },
        },
        elementWorks: {
          include: {
            bodyPartScores: {
              select: { bodyPart: true, totalScore: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('[Musculoskeletal] 전체 조회 오류:', error)
    return NextResponse.json(
      { error: '조사 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
