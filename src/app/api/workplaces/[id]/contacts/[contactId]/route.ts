import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 담당자 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { contactType, name, position, phone, email, isPrimary } = body

    // 대표 담당자로 변경 시 기존 대표 담당자 해제
    if (isPrimary && contactType) {
      await prisma.workplaceContact.updateMany({
        where: {
          workplaceId: params.id,
          contactType,
          isPrimary: true,
          id: { not: params.contactId },
        },
        data: { isPrimary: false },
      })
    }

    const contact = await prisma.workplaceContact.update({
      where: { id: params.contactId },
      data: {
        ...(contactType && { contactType }),
        ...(name && { name }),
        ...(position !== undefined && { position }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(isPrimary !== undefined && { isPrimary }),
      },
    })

    return NextResponse.json({
      success: true,
      message: '담당자 정보가 수정되었습니다.',
      contact,
    })
  } catch (error) {
    console.error('[Contacts] 수정 오류:', error)
    return NextResponse.json(
      { error: '담당자 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 담당자 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    await prisma.workplaceContact.delete({
      where: { id: params.contactId },
    })

    return NextResponse.json({
      success: true,
      message: '담당자가 삭제되었습니다.',
    })
  } catch (error) {
    console.error('[Contacts] 삭제 오류:', error)
    return NextResponse.json(
      { error: '담당자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
