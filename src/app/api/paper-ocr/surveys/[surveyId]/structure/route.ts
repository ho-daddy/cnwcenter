import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { loadStructure, buildCodeToId } from '@/lib/paper-ocr'

type Params = { params: { surveyId: string } }

// GET /api/paper-ocr/surveys/[surveyId]/structure — 설문 구조
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const structure = await loadStructure(params.surveyId, prisma)
  if (!structure) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 })
  }
  return NextResponse.json({ structure, codeToId: buildCodeToId(structure) })
}
