import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth-utils'
import { ensurePaperOcrDir, paperOcrPath } from '@/lib/paper-ocr'
// @ts-expect-error pdf-parse 타입 정의 없음
import pdf from 'pdf-parse'

export const runtime = 'nodejs'

// POST /api/paper-ocr/upload — PDF 업로드 → 서버 저장 + 페이지 수 반환
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'PDF 파일이 필요합니다.' }, { status: 400 })
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let pageCount = 0
  try {
    const data = await pdf(buffer)
    pageCount = data.numpages
  } catch (e) {
    return NextResponse.json(
      { error: `PDF 분석 실패: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    )
  }

  const sessionId = crypto.randomUUID().substring(0, 8)
  await ensurePaperOcrDir()
  await fs.writeFile(paperOcrPath(sessionId), buffer)

  return NextResponse.json({ sessionId, pageCount })
}
