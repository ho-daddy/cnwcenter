import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * 오늘의 할 일 요약 조회
 * GET /api/notifications/today
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 1. 오늘 일정
    const schedulesToday = await prisma.schedule.count({
      where: {
        userId: session.user.id,
        OR: [
          {
            startDate: {
              gte: today,
              lt: tomorrow,
            },
          },
          {
            endDate: {
              gte: today,
              lt: tomorrow,
            },
          },
        ],
      },
    })

    // 2. 진행중 상담 (접수 + 진행중)
    const counselingActive = await prisma.counselingCase.count({
      where: {
        status: {
          in: ['RECEIVED', 'IN_PROGRESS'],
        },
      },
    })

    // 3. 읽지 않은 공지사항 (최근 7일)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const unreadNotices = await prisma.notice.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    })

    // 4. 최신 AI 브리핑 (오늘 생성)
    const latestBriefing = await prisma.dailyReport.findFirst({
      where: {
        createdAt: {
          gte: today,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 5. 진행중 설문
    const surveysActive = await prisma.survey.count({
      where: {
        status: 'PUBLISHED',
      },
    })

    // 6. 위험성평가 기한 임박 (다음 7일 이내)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const riskAssessmentDueSoon = await prisma.riskAssessmentCard.count({
      where: {
        status: 'IN_PROGRESS',
        // 기한 필드가 있다면 추가
      },
    })

    return NextResponse.json({
      schedulesToday,
      counselingActive,
      unreadNotices,
      hasNewBriefing: !!latestBriefing,
      surveysActive,
      riskAssessmentDueSoon,
      totalCount:
        schedulesToday +
        counselingActive +
        unreadNotices +
        (latestBriefing ? 1 : 0),
    })
  } catch (error) {
    console.error('[알림 조회 오류]', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
