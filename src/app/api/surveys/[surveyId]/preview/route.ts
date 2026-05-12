import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: { surveyId: string } }

// GET /api/surveys/[surveyId]/preview — 미리보기용 공개 조회 (인증 불필요)
export async function GET(req: NextRequest, { params }: Params) {
  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
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

  return NextResponse.json({
    id: survey.id,
    title: survey.title,
    description: survey.description,
    workplace: survey.workplace,
    sections: survey.sections,
  })
}
