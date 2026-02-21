import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: { surveyId: string } }

// GET /api/surveys/[surveyId]/responses — 설문 응답 목록 (STAFF+)
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'STAFF')) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  // 설문 존재 확인
  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
  })
  if (!survey) {
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const [responses, total] = await Promise.all([
    prisma.surveyResponse.findMany({
      where: { surveyId: params.surveyId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        respondentName: true,
        respondentInfo: true,
        completedAt: true,
        createdAt: true,
        _count: { select: { answers: true } },
      },
    }),
    prisma.surveyResponse.count({
      where: { surveyId: params.surveyId },
    }),
  ])

  return NextResponse.json({
    responses,
    total,
    page,
    limit,
  })
}
