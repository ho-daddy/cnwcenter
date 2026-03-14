import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getAccessibleWorkplaceIds } from '@/lib/auth-utils'

// GET /api/trash — 아카이브 목록 조회
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dataType = searchParams.get('dataType')
  const reason = searchParams.get('reason')
  const year = searchParams.get('year')
  const workplaceId = searchParams.get('workplaceId')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  // 접근 가능한 사업장 필터
  const accessibleIds = await getAccessibleWorkplaceIds(auth.user!.id, auth.user!.role)

  const where: Record<string, unknown> = {}

  if (accessibleIds) {
    where.workplaceId = { in: accessibleIds }
  }

  if (dataType) where.dataType = dataType
  if (reason) where.archivedReason = reason
  if (year) where.year = parseInt(year)
  if (workplaceId) {
    // WORKPLACE_USER가 자기 사업장이 아닌 곳 조회 시 차단
    if (accessibleIds && !accessibleIds.includes(workplaceId)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
    where.workplaceId = workplaceId
  }

  if (search) {
    where.OR = [
      { unitName: { contains: search, mode: 'insensitive' } },
      { unitPath: { contains: search, mode: 'insensitive' } },
      { originalAssessmentId: { contains: search } },
    ]
  }

  try {
    const [archives, total] = await Promise.all([
      prisma.archivedAssessment.findMany({
        where,
        select: {
          id: true,
          workplaceId: true,
          dataType: true,
          unitName: true,
          unitPath: true,
          year: true,
          assessmentType: true,
          originalAssessmentId: true,
          archivedAt: true,
          archivedReason: true,
          deletedBy: { select: { id: true, name: true, email: true } },
          workplace: { select: { id: true, name: true } },
        },
        orderBy: { archivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.archivedAssessment.count({ where }),
    ])

    // 필터용 연도, 사업장 목록
    const filterWhere: Record<string, unknown> = {}
    if (accessibleIds) filterWhere.workplaceId = { in: accessibleIds }

    const [years, workplaces] = await Promise.all([
      prisma.archivedAssessment.findMany({
        where: filterWhere,
        select: { year: true },
        distinct: ['year'],
        orderBy: { year: 'desc' },
      }),
      prisma.archivedAssessment.findMany({
        where: filterWhere,
        select: { workplace: { select: { id: true, name: true } } },
        distinct: ['workplaceId'],
      }),
    ])

    return NextResponse.json({
      archives,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filters: {
        years: years.map(y => y.year),
        workplaces: workplaces.map(w => w.workplace),
      },
    })
  } catch (error) {
    console.error('[Trash] 목록 조회 오류:', error)
    return NextResponse.json({ error: '목록 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
