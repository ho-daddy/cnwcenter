import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWorkplaceAccess } from '@/lib/auth-utils'
import { HazardCategory } from '@prisma/client'

type Params = { params: { cardId: string; hazardId: string } }

function calcRiskScore(category: HazardCategory, severity: number, likelihood: number, additional: number) {
  if (category === 'ABSOLUTE') return 16
  return severity * likelihood + additional
}

// GET /api/risk-assessment/[cardId]/hazards/[hazardId]
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const hazard = await prisma.riskHazard.findUnique({
    where: { id: params.hazardId },
    include: {
      chemicalProduct: { select: { id: true, name: true } },
      improvements: { orderBy: { createdAt: 'desc' } },
      photos: { orderBy: { createdAt: 'asc' }, select: { id: true, photoPath: true, thumbnailPath: true } },
    },
  })

  if (!hazard || hazard.cardId !== params.cardId) {
    return NextResponse.json({ error: '유해요인을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(hazard.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  return NextResponse.json(hazard)
}

// PUT /api/risk-assessment/[cardId]/hazards/[hazardId]
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const hazard = await prisma.riskHazard.findUnique({ where: { id: params.hazardId } })
  if (!hazard || hazard.cardId !== params.cardId) {
    return NextResponse.json({ error: '유해요인을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(hazard.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  const body = await req.json()
  const category = (body.hazardCategory ?? hazard.hazardCategory) as HazardCategory
  const severity = parseInt(body.severityScore ?? hazard.severityScore)
  const likelihood = parseInt(body.likelihoodScore ?? hazard.likelihoodScore)
  const additional = parseInt(body.additionalPoints ?? hazard.additionalPoints)
  const riskScore = calcRiskScore(category, severity, likelihood, additional)

  const updated = await prisma.riskHazard.update({
    where: { id: params.hazardId },
    data: {
      hazardCategory: category,
      hazardFactor: body.hazardFactor,
      severityScore: severity,
      likelihoodScore: likelihood,
      additionalPoints: additional,
      additionalDetails: body.additionalDetails !== undefined ? (body.additionalDetails || null) : undefined,
      riskScore,
      improvementPlan: body.improvementPlan || null,
      chemicalProductId: category === 'CHEMICAL' ? (body.chemicalProductId || null) : null,
    },
    include: {
      chemicalProduct: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/risk-assessment/[cardId]/hazards/[hazardId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const hazard = await prisma.riskHazard.findUnique({ where: { id: params.hazardId } })
  if (!hazard || hazard.cardId !== params.cardId) {
    return NextResponse.json({ error: '유해요인을 찾을 수 없습니다.' }, { status: 404 })
  }

  const access = await requireWorkplaceAccess(hazard.workplaceId)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: 403 })

  // 연결된 사진 파일 물리 삭제 (DB는 onDelete:Cascade로 자동 정리)
  const photos = await prisma.riskHazardPhoto.findMany({
    where: { hazardId: params.hazardId },
  })
  for (const photo of photos) {
    try {
      await unlink(path.join(process.cwd(), 'public', photo.photoPath))
    } catch { /* 파일이 이미 없을 수 있음 */ }
  }

  await prisma.riskHazard.delete({ where: { id: params.hazardId } })
  return NextResponse.json({ success: true })
}
