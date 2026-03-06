import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QuestionType, Prisma } from '@prisma/client'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// GET /api/surveys — 설문조사 목록
export async function GET(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const year = searchParams.get('year')
  const workplaceId = searchParams.get('workplaceId')
  const status = searchParams.get('status')

  const where: Prisma.SurveyWhereInput = {}
  if (year) where.year = parseInt(year)
  if (workplaceId) where.workplaceId = workplaceId
  if (status) where.status = status as Prisma.EnumSurveyStatusFilter['equals']

  const surveys = await prisma.survey.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      workplace: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: {
        select: {
          responses: true,
          sections: true,
        },
      },
    },
  })

  return NextResponse.json(surveys)
}

// POST /api/surveys — 설문조사 생성
export async function POST(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { title, year, purpose, workplaceId, templateId } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
    }
    if (!year) {
      return NextResponse.json({ error: '연도를 입력해주세요.' }, { status: 400 })
    }

    // 템플릿이 있으면 구조 가져오기
    let templateStructure: TemplateStructure | null = null
    if (templateId) {
      const template = await prisma.surveyTemplate.findUnique({
        where: { id: templateId },
      })
      if (!template) {
        return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 })
      }
      templateStructure = template.structure as unknown as TemplateStructure
    }

    // 섹션 생성 데이터 준비
    const sectionsCreate: Prisma.SurveySectionCreateWithoutSurveyInput[] | undefined =
      templateStructure
        ? templateStructure.sections.map(
            (section: TemplateSection, sIdx: number) => ({
              title: section.title,
              description: section.description || null,
              sortOrder: sIdx,
              questions: {
                create: section.questions.map(
                  (question: TemplateQuestion, qIdx: number) => ({
                    questionCode: question.questionCode || null,
                    questionText: question.questionText,
                    questionType: question.questionType as QuestionType,
                    required: question.required ?? false,
                    sortOrder: qIdx,
                    options: question.options
                      ? (question.options as Prisma.InputJsonValue)
                      : Prisma.JsonNull,
                    conditionalLogic: question.conditionalLogic
                      ? (question.conditionalLogic as Prisma.InputJsonValue)
                      : Prisma.JsonNull,
                  })
                ),
              },
            })
          )
        : undefined

    const survey = await prisma.survey.create({
      data: {
        title: title.trim(),
        year: parseInt(year),
        purpose: purpose || null,
        workplaceId: workplaceId || null,
        templateId: templateId || null,
        createdById: auth.user!.id,
        ...(sectionsCreate
          ? {
              sections: {
                create: sectionsCreate,
              },
            }
          : {}),
      },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        workplace: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(survey, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 템플릿 구조 타입
interface TemplateQuestion {
  questionCode?: string
  questionText: string
  questionType: string
  required?: boolean
  sortOrder?: number
  options?: Record<string, unknown>
  conditionalLogic?: Record<string, unknown>
}

interface TemplateSection {
  title: string
  description?: string
  questions: TemplateQuestion[]
}

interface TemplateStructure {
  sections: TemplateSection[]
}
