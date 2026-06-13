import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { readFile } from 'fs/promises'
import path from 'path'

type Params = { params: { caseId: string; filename: string } }

// GET /api/files/counseling/[caseId]/[filename]
// 상담 케이스 첨부파일 서빙 (로그인 + 담당자 확인)
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  // 케이스 존재 및 담당자 확인
  const c = await prisma.counselingCase.findUnique({
    where: { id: params.caseId },
    select: { assignedTo: true },
  })
  if (!c) return NextResponse.json({ error: '케이스를 찾을 수 없습니다.' }, { status: 404 })

  // WORKPLACE_USER는 자신이 담당자인 케이스의 파일만
  if (auth.user!.role === 'WORKPLACE_USER' && c.assignedTo !== auth.user!.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  // 경로 조작(path traversal) 방지: 파일명에서 디렉토리 구분자 제거
  const safeName = path.basename(params.filename)
  if (safeName !== params.filename || safeName.includes('..')) {
    return NextResponse.json({ error: '잘못된 파일 경로입니다.' }, { status: 400 })
  }

  const fileUrl = `/uploads/counseling/${params.caseId}/${safeName}`

  // DB에 등록된 문서인지 확인 (원본 파일명/타입 조회)
  const doc = await prisma.document.findFirst({
    where: { caseId: params.caseId, fileUrl },
    select: { fileName: true, fileType: true },
  })
  if (!doc) return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })

  const filePath = path.join(process.cwd(), 'public', 'uploads', 'counseling', params.caseId, safeName)

  let buffer: Buffer
  try {
    buffer = await readFile(filePath)
  } catch {
    return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
  }

  const contentType = doc.fileType || 'application/octet-stream'
  const encodedName = encodeURIComponent(doc.fileName)

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Content-Disposition': `inline; filename*=UTF-8''${encodedName}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}
