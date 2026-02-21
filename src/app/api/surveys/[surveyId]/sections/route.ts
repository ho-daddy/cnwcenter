import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: { surveyId: string } }

// POST /api/surveys/[surveyId]/sections — 섹션 추가
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'STAFF')) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (survey.status !== 'DRAFT') {
    return NextResponse.json({ error: '작성 중 상태의 설문만 수정할 수 있습니다.' }, { status: 400 })
  }

  const body = await req.json()
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
}
