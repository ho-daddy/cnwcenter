import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - 프로필 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        organization: true,
        role: true,
        status: true,
        image: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[GET /api/user/profile]', error)
    return NextResponse.json({ error: '프로필 조회 실패' }, { status: 500 })
  }
}

// PATCH - 프로필 수정
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, organization } = body

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        phone: phone || null,
        organization: organization || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/user/profile]', error)
    return NextResponse.json({ error: '프로필 수정 실패' }, { status: 500 })
  }
}
