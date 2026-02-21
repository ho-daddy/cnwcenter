import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: { token: string } }

// GET /api/surveys/public/[token] — 공개 설문 조회 (인증 불필요)
export async function GET(req: NextRequest, { params }: Params) {
  const survey = await prisma.survey.findUnique({
    where: {
      accessToken: params.token,
    },
    include: {
      workplace: { select: { id: true, name: true } },
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 })
  }

  if (survey.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: '현재 응답할 수 없는 설문입니다.' },
      { status: 400 }
    )
  }

  // 관리자 전용 필드 제외하고 반환
  return NextResponse.json({
    id: survey.id,
    title: survey.title,
    description: survey.description,
    year: survey.year,
    purpose: survey.purpose,
    workplace: survey.workplace,
    sections: survey.sections,
  })
}
