import { NextResponse } from 'next/server'
import { requireStaffOrAbove } from '@/lib/auth-utils'
import { getDonationsWithMemberMatch } from '@/lib/donation'
import { handleApiError } from '@/lib/api-utils'

// GET /api/finance/donations — saeum-homepage Donation을 cross-schema로 조회 + Member 매칭
export async function GET() {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const donations = await getDonationsWithMemberMatch()
    return NextResponse.json({ donations })
  } catch (error) {
    return handleApiError(error)
  }
}
