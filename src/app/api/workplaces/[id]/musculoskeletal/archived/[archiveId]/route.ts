import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess, requireStaffOrAbove } from '@/lib/auth-utils'

// 아카이브된 조사 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; archiveId: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const archive = await prisma.archivedAssessment.findUnique({
      where: { id: params.archiveId },
    })

    if (!archive) {
      return NextResponse.json(
        { error: '아카이브를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (archive.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ archive })
  } catch (error) {
    console.error('[ArchivedAssessment] 상세 조회 오류:', error)
    return NextResponse.json(
      { error: '아카이브 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 아카이브 영구 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; archiveId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const archive = await prisma.archivedAssessment.findUnique({
      where: { id: params.archiveId },
      select: { workplaceId: true },
    })

    if (!archive || archive.workplaceId !== params.id) {
      return NextResponse.json(
        { error: '아카이브를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    await prisma.archivedAssessment.delete({
      where: { id: params.archiveId },
    })

    return NextResponse.json({
      success: true,
      message: '아카이브가 영구 삭제되었습니다.',
    })
  } catch (error) {
    console.error('[ArchivedAssessment] 삭제 오류:', error)
    return NextResponse.json(
      { error: '아카이브 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
