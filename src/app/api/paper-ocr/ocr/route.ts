import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { parseJsonBody } from '@/lib/api-utils'
import { loadStructure, buildCodeToId, ocrSurvey, paperOcrPath } from '@/lib/paper-ocr'

export const runtime = 'nodejs'
export const maxDuration = 300

// POST /api/paper-ocr/ocr — 단일 응답자 OCR
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await parseJsonBody(req)
  const { sessionId, surveyId, startPage, endPage } = body as {
    sessionId?: string
    surveyId?: string
    startPage?: number
    endPage?: number
  }
  if (!sessionId || !surveyId || !startPage || !endPage) {
    return NextResponse.json(
      { error: 'sessionId, surveyId, startPage, endPage가 필요합니다.' },
      { status: 400 }
    )
  }

  const structure = await loadStructure(surveyId, prisma)
  if (!structure) {
    return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await fs.readFile(paperOcrPath(sessionId))
  } catch {
    return NextResponse.json({ error: '업로드된 PDF를 찾을 수 없습니다.' }, { status: 404 })
  }

  try {
    const result = await ocrSurvey(pdfBuffer, structure, startPage, endPage)
    return NextResponse.json({
      ocrResult: result,
      codeToId: buildCodeToId(structure),
      structure,
    })
  } catch (e) {
    return NextResponse.json(
      { error: `OCR 실패: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    )
  }
}
