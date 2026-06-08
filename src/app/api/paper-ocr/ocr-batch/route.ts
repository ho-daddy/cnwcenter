import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { parseJsonBody } from '@/lib/api-utils'
import { loadStructure, buildCodeToId, ocrSurvey, paperOcrPath } from '@/lib/paper-ocr'

export const runtime = 'nodejs'
export const maxDuration = 300

interface PageRange {
  startPage: number
  endPage: number
}

// POST /api/paper-ocr/ocr-batch — 여러 응답자 병렬 OCR
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await parseJsonBody(req)
  const { sessionId, surveyId, personsPageRanges } = body as {
    sessionId?: string
    surveyId?: string
    personsPageRanges?: PageRange[]
  }
  if (!sessionId || !surveyId || !Array.isArray(personsPageRanges) || personsPageRanges.length === 0) {
    return NextResponse.json(
      { error: 'sessionId, surveyId, personsPageRanges가 필요합니다.' },
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
    // 토큰 한도 보호: 전체를 한 번에 보내지 않고 페이지 범위별로 잘라서
    // BATCH_SIZE명씩 순차 처리 (각 배치 내에서만 병렬)
    const BATCH_SIZE = 5
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = []
    for (let i = 0; i < personsPageRanges.length; i += BATCH_SIZE) {
      const batch = personsPageRanges.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map((r) => ocrSurvey(pdfBuffer, structure, r.startPage, r.endPage))
      )
      results.push(...batchResults)
    }
    return NextResponse.json({
      results,
      codeToId: buildCodeToId(structure),
      structure,
    })
  } catch (e) {
    return NextResponse.json(
      { error: `배치 OCR 실패: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    )
  }
}
