import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkplaceAccess } from '@/lib/auth-utils'

// 근골조사 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const status = searchParams.get('status')

    const where: any = {
      workplaceId: params.id,
    }

    if (year) where.year = parseInt(year)
    if (status) where.status = status

    const assessments = await prisma.musculoskeletalAssessment.findMany({
      where,
      include: {
        organizationUnit: {
          select: {
            id: true,
            name: true,
            level: true,
            parent: {
              select: { name: true },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            elementWorks: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({
      assessments: assessments.map((a) => ({
        id: a.id,
        year: a.year,
        assessmentType: a.assessmentType,
        status: a.status,
        organizationUnit: a.organizationUnit,
        elementWorkCount: a._count.elementWorks,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    })
  } catch (error) {
    console.error('[Musculoskeletal] 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '근골조사 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 새 근골조사 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requireWorkplaceAccess(params.id)
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { organizationUnitId, year, assessmentType } = body

    // 필수 필드 검증
    if (!organizationUnitId || !year || !assessmentType) {
      return NextResponse.json(
        { error: '필수 항목이 누락되었습니다. (평가단위, 연도, 조사유형)' },
        { status: 400 }
      )
    }

    // 조직단위가 평가대상(isLeaf=true)인지 확인
    const unit = await prisma.organizationUnit.findUnique({
      where: { id: organizationUnitId },
      select: { isLeaf: true, name: true },
    })

    if (!unit) {
      return NextResponse.json(
        { error: '평가대상 단위를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!unit.isLeaf) {
      return NextResponse.json(
        { error: '평가대상으로 지정된 단위만 조사할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 같은 연도, 같은 단위, 같은 유형의 조사가 이미 있는지 확인
    const existing = await prisma.musculoskeletalAssessment.findFirst({
      where: {
        workplaceId: params.id,
        organizationUnitId,
        year: parseInt(year),
        assessmentType,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `${year}년도 해당 단위의 ${assessmentType}가 이미 존재합니다.` },
        { status: 400 }
      )
    }

    const assessment = await prisma.musculoskeletalAssessment.create({
      data: {
        workplaceId: params.id,
        organizationUnitId,
        year: parseInt(year),
        assessmentType,
        status: 'DRAFT',
        createdById: authCheck.user!.id,
      },
      include: {
        organizationUnit: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `${unit.name} ${assessmentType}가 생성되었습니다.`,
      assessment,
    })
  } catch (error) {
    console.error('[Musculoskeletal] 생성 오류:', error)
    return NextResponse.json(
      { error: '근골조사 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
