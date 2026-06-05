import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaffOrAbove } from "@/lib/auth-utils"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await requireStaffOrAbove()
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 })
    }

    // STAFF는 SUPER_ADMIN 계정을 정지할 수 없음
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

    await prisma.user.update({
      where: { id: params.id },
      data: {
        status: "SUSPENDED",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[POST /api/admin/users/[id]/suspend]", error)
    return NextResponse.json({ error: "정지 처리 실패" }, { status: 500 })
  }
}
