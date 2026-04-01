import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 전체 개선사항 목록 조회 (개선작업 페이지용)
export async function GET(request: NextRequest) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const improvements = await prisma.mSurveyImprovement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assessment: {
          select: {
            id: true,
            organizationUnit: {
              select: { name: true },
            },
            workplace: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ improvements })
  } catch (error) {
    console.error('[Improvements] 전체 조회 오류:', error)
    return NextResponse.json(
      { error: '개선사항 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
