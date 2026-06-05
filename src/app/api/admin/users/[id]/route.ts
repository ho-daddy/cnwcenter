import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaffOrAbove } from "@/lib/auth-utils"

// PATCH - 사용자 기본 정보 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await requireStaffOrAbove()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 })
    }

    // STAFF는 SUPER_ADMIN 계정을 수정할 수 없음
    if (authCheck.user!.role === "STAFF") {
      const target = await prisma.user.findUnique({
        where: { id: params.id },
        select: { role: true },
      })
      if (target?.role === "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "최고관리자 계정은 관리할 수 없습니다." },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { name, phone, organization } = body

    await prisma.user.update({
      where: { id: params.id },
      data: {
        name: name || null,
        phone: phone || null,
        organization: organization || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PATCH /api/admin/users/[id]]", error)
    return NextResponse.json({ error: "수정 실패" }, { status: 500 })
  }
}

// DELETE - 사용자 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await requireStaffOrAbove()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 })
    }

    // STAFF는 SUPER_ADMIN 계정을 삭제할 수 없음
    if (authCheck.user!.role === "STAFF") {
      const target = await prisma.user.findUnique({
        where: { id: params.id },
        select: { role: true },
      })
      if (target?.role === "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "최고관리자 계정은 관리할 수 없습니다." },
          { status: 403 }
        )
      }
    }

    // 자기 자신은 삭제 불가
    if (authCheck.user!.id === params.id) {
      return NextResponse.json({ error: "자신의 계정은 삭제할 수 없습니다." }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/admin/users/[id]]", error)
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 })
  }
}
