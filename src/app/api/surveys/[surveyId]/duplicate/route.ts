import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

type Params = { params: { surveyId: string } }

// POST /api/surveys/[surveyId]/duplicate — 설문 복제
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { title, year, purpose, workplaceId } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
    }

    // 원본 설문 + 섹션 + 질문 로드
    const original = await prisma.survey.findUnique({
      where: { id: params.surveyId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    })

    if (!original) {
      return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 새 설문 생성 (DRAFT 상태, 응답 없이 구조만 복제)
    const duplicated = await prisma.survey.create({
      data: {
        title: title.trim(),
        year: year ? parseInt(year) : original.year,
        purpose: purpose ?? original.purpose,
        workplaceId: workplaceId !== undefined ? (workplaceId || null) : original.workplaceId,
        templateId: original.templateId,
        createdById: auth.user!.id,
        sections: {
          create: original.sections.map((section) => ({
            title: section.title,
            description: section.description,
            sortOrder: section.sortOrder,
            questions: {
              create: section.questions.map((q) => ({
                questionCode: q.questionCode,
                questionText: q.questionText,
                questionType: q.questionType,
                required: q.required,
                sortOrder: q.sortOrder,
                options: q.options !== null ? (q.options as Prisma.InputJsonValue) : Prisma.JsonNull,
                conditionalLogic: q.conditionalLogic !== null ? (q.conditionalLogic as Prisma.InputJsonValue) : Prisma.JsonNull,
              })),
            },
          })),
        },
      },
      include: {
        sections: { include: { questions: true } },
        workplace: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(duplicated, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
