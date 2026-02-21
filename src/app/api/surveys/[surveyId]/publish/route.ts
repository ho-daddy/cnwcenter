import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

type Params = { params: { surveyId: string } }

// POST /api/surveys/[surveyId]/publish — 설문조사 배포
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'STAFF')) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
    include: {
      _count: { select: { sections: true } },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: '설문조사를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (survey.status !== 'DRAFT') {
    return NextResponse.json(
      { error: '작성중(DRAFT) 상태의 설문만 배포할 수 있습니다.' },
      { status: 400 }
    )
  }

  if (survey._count.sections === 0) {
    return NextResponse.json(
      { error: '섹션이 없는 설문은 배포할 수 없습니다.' },
      { status: 400 }
    )
  }

  const accessToken = crypto.randomBytes(16).toString('hex')

  const updated = await prisma.survey.update({
    where: { id: params.surveyId },
    data: {
      status: 'PUBLISHED',
      accessToken,
      publishedAt: new Date(),
    },
  })

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    accessToken: updated.accessToken,
    publishedAt: updated.publishedAt,
  })
}
