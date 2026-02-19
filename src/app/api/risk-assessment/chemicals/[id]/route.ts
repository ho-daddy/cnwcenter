import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

type Params = { params: { id: string } }

// DELETE /api/risk-assessment/chemicals/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  await prisma.chemicalProduct.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
