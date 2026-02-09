import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 담당자 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const contacts = await prisma.workplaceContact.findMany({
      where: { workplaceId: params.id },
      orderBy: [{ contactType: 'asc' }, { isPrimary: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('[Contacts] 조회 오류:', error)
    return NextResponse.json(
      { error: '담당자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 담당자 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { contactType, name, position, phone, email, isPrimary } = body

    if (!contactType || !name) {
      return NextResponse.json(
        { error: '담당자 유형과 이름은 필수입니다.' },
        { status: 400 }
      )
    }

    // 대표 담당자로 설정 시 기존 대표 담당자 해제
    if (isPrimary) {
      await prisma.workplaceContact.updateMany({
        where: { workplaceId: params.id, contactType, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const contact = await prisma.workplaceContact.create({
      data: {
        workplaceId: params.id,
        contactType,
        name,
        position,
        phone,
        email,
        isPrimary: isPrimary || false,
      },
    })

    return NextResponse.json({
      success: true,
      message: '담당자가 추가되었습니다.',
      contact,
    })
  } catch (error) {
    console.error('[Contacts] 추가 오류:', error)
    return NextResponse.json(
      { error: '담당자 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
