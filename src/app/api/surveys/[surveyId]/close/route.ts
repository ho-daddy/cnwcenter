import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: { surveyId: string } }

// POST /api/surveys/[surveyId]/close — 설문조사 마감
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

  if (survey.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: '배포중(PUBLISHED) 상태의 설문만 마감할 수 있습니다.' },
      { status: 400 }
    )
  }

  const updated = await prisma.survey.update({
    where: { id: params.surveyId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
  })

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    closedAt: updated.closedAt,
  })
}
