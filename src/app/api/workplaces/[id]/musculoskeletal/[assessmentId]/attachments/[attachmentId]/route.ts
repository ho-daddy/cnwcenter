import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'
import { unlink } from 'fs/promises'
import path from 'path'

// 첨부파일 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assessmentId: string; attachmentId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const existing = await prisma.mSurveyAttachment.findUnique({
      where: { id: params.attachmentId },
      include: {
        assessment: { select: { workplaceId: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '첨부파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (existing.assessment.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 실제 파일 삭제
    try {
      const absolutePath = path.join(process.cwd(), 'public', existing.filePath)
      await unlink(absolutePath)
    } catch (fileError) {
      console.error('[Attachments] 파일 삭제 오류 (계속 진행):', fileError)
      // 파일 삭제 실패해도 DB 레코드는 삭제 진행
    }

    // DB 레코드 삭제
    await prisma.mSurveyAttachment.delete({
      where: { id: params.attachmentId },
    })

    return NextResponse.json({
      success: true,
      message: '첨부파일이 삭제되었습니다.',
    })
  } catch (error) {
    console.error('[Attachments] 삭제 오류:', error)
    return NextResponse.json(
      { error: '첨부파일 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
