import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: { surveyId: string } }

// POST /api/surveys/[surveyId]/sections/reorder — 섹션 순서 변경
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
  const { sectionIds } = body

  if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
    return NextResponse.json({ error: '섹션 ID 목록이 필요합니다.' }, { status: 400 })
  }

  // 해당 설문의 모든 섹션이 포함되었는지 검증
  const existingSections = await prisma.surveySection.findMany({
    where: { surveyId: params.surveyId },
    select: { id: true },
  })

  const existingIds = new Set(existingSections.map((s) => s.id))
  const providedIds = new Set(sectionIds as string[])

  if (existingIds.size !== providedIds.size || ![...existingIds].every((id) => providedIds.has(id))) {
    return NextResponse.json({ error: '모든 섹션 ID가 정확히 포함되어야 합니다.' }, { status: 400 })
  }

  // 트랜잭션으로 순서 업데이트
  await prisma.$transaction(
    (sectionIds as string[]).map((id, index) =>
      prisma.surveySection.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  const updatedSections = await prisma.surveySection.findMany({
    where: { surveyId: params.surveyId },
    orderBy: { sortOrder: 'asc' },
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  })

  return NextResponse.json({ sections: updatedSections })
}
