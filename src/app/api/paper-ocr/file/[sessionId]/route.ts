import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { requireAuth } from '@/lib/auth-utils'
import { paperOcrPath } from '@/lib/paper-ocr'

export const runtime = 'nodejs'

type Params = { params: { sessionId: string } }

// GET /api/paper-ocr/file/[sessionId] — 업로드된 PDF 원본 반환 (iframe 렌더링용)
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const buffer = await fs.readFile(paperOcrPath(params.sessionId))
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'PDF를 찾을 수 없습니다.' }, { status: 404 })
  }
}
