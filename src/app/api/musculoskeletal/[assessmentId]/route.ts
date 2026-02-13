import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'

// 조사 ID로 직접 조회 (workplace ID 없이)
export async function GET(
  request: NextRequest,
  { params }: { params: { assessmentId: string } }
) {
  const authCheck = await requireAuth()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const assessment = await prisma.musculoskeletalAssessment.findUnique({
      where: { id: params.assessmentId },
      include: {
        workplace: {
          select: { id: true, name: true },
        },
        organizationUnit: {
          select: { id: true, name: true },
        },
        elementWorks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            bodyPartScores: {
              select: { bodyPart: true, totalScore: true },
            },
          },
        },
        improvements: {
          orderBy: { createdAt: 'asc' },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: '조사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // WORKPLACE_USER의 경우 해당 사업장 접근 권한 확인
    const user = authCheck.user!
    const accessibleIds = await getAccessibleWorkplaceIds(user.id, user.role)
    if (accessibleIds !== null && !accessibleIds.includes(assessment.workplaceId)) {
      return NextResponse.json(
        { error: '해당 조사에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('[Assessment Direct] 조회 오류:', error)
    return NextResponse.json(
      { error: '조사 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
