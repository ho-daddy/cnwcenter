import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 사용자의 소속 사업장 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const workplaces = await prisma.workplaceUser.findMany({
      where: { userId: params.id },
      include: {
        workplace: {
          select: { id: true, name: true, industry: true },
        },
      },
    })

    return NextResponse.json({
      workplaces: workplaces.map((wu) => wu.workplace),
    })
  } catch (error) {
    console.error('[User Workplace] 조회 오류:', error)
    return NextResponse.json(
      { error: '소속 사업장 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 사용자의 소속 사업장 설정 (WORKPLACE_USER용 - 하나만 설정)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { workplaceId } = body

    // 사용자 정보 확인
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { role: true, name: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // WORKPLACE_USER만 이 API로 설정 가능
    if (user.role !== 'WORKPLACE_USER') {
      return NextResponse.json(
        { error: '사업장 사용자만 소속 사업장을 설정할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 기존 사업장 연결 모두 해제
    await prisma.workplaceUser.deleteMany({
      where: { userId: params.id },
    })

    // 새 사업장이 지정된 경우에만 연결
    if (workplaceId) {
      // 사업장 존재 확인
      const workplace = await prisma.workplace.findUnique({
        where: { id: workplaceId },
      })

      if (!workplace) {
        return NextResponse.json({ error: '사업장을 찾을 수 없습니다.' }, { status: 404 })
      }

      await prisma.workplaceUser.create({
        data: {
          userId: params.id,
          workplaceId,
        },
      })

      return NextResponse.json({
        success: true,
        message: `${user.name || user.email}님이 ${workplace.name}에 배정되었습니다.`,
        workplace: { id: workplace.id, name: workplace.name },
      })
    }

    return NextResponse.json({
      success: true,
      message: '소속 사업장이 해제되었습니다.',
      workplace: null,
    })
  } catch (error) {
    console.error('[User Workplace] 설정 오류:', error)
    return NextResponse.json(
      { error: '소속 사업장 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
