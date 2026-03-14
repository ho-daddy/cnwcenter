import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: params.id },
      data: {
        status: 'SUSPENDED',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/admin/users/[id]/suspend]', error)
    return NextResponse.json({ error: '정지 처리 실패' }, { status: 500 })
  }
}
