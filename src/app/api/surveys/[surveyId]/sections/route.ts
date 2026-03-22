import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireSurveyAccess } from '@/lib/auth-utils'

type Params = { params: { surveyId: string } }

// POST /api/surveys/[surveyId]/sections — 섹션 추가
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireSurveyAccess(params.surveyId)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (survey.status !== 'DRAFT') {
    return NextResponse.json({ error: '작성 중 상태의 설문만 수정할 수 있습니다.' }, { status: 400 })
  }

  try {
    const body = await parseJsonBody(req)
    const { title, description } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: '섹션 제목을 입력해주세요.' }, { status: 400 })
    }

    // 현재 최대 sortOrder 조회
    const maxSection = await prisma.surveySection.findFirst({
      where: { surveyId: params.surveyId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const sortOrder = maxSection ? maxSection.sortOrder + 1 : 0

    const section = await prisma.surveySection.create({
      data: {
        surveyId: params.surveyId,
        title: title.trim(),
        description: description?.trim() || null,
        sortOrder,
      },
      include: {
        questions: true,
      },
    })

    return NextResponse.json(section, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
