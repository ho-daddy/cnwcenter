import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSurveyAccess } from '@/lib/auth-utils'

type Params = { params: { surveyId: string } }

// GET /api/surveys/[surveyId]/responses — 설문 응답 목록 (STAFF+)
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireSurveyAccess(params.surveyId)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

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
  const q = (searchParams.get('q') ?? '').trim()

  const where = {
    surveyId: params.surveyId,
    ...(q ? { respondentName: { contains: q, mode: 'insensitive' as const } } : {}),
  }

  const [responses, total] = await Promise.all([
    prisma.surveyResponse.findMany({
      where,
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
    prisma.surveyResponse.count({ where }),
  ])

  return NextResponse.json({
    responses,
    total,
    page,
    limit,
  })
}
