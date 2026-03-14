import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'

// 조직 단위의 상위 경로를 구성 (N+1 방지: 전체 로드 후 메모리 순회)
async function buildUnitPath(unitId: string, organizationId: string): Promise<string> {
  const allUnits = await prisma.organizationUnit.findMany({
    where: { organizationId },
    select: { id: true, name: true, parentId: true },
  })
  const unitMap = new Map(allUnits.map(u => [u.id, u]))
  const parts: string[] = []
  let currentId: string | null = unitId
  while (currentId) {
    const unit = unitMap.get(currentId)
    if (!unit) break
    parts.unshift(unit.name)
    currentId = unit.parentId
  }
  return parts.join(' > ')
}

// 하위 단위 ID를 재귀적으로 수집 (N+1 방지: 전체 로드 후 메모리 순회)
async function collectDescendantIds(unitId: string, organizationId: string): Promise<string[]> {
  const allUnits = await prisma.organizationUnit.findMany({
    where: { organizationId },
    select: { id: true, parentId: true },
  })
  const childrenMap = new Map<string, string[]>()
  for (const u of allUnits) {
    if (u.parentId) {
      const children = childrenMap.get(u.parentId) ?? []
      children.push(u.id)
      childrenMap.set(u.parentId, children)
    }
  }
  const result: string[] = []
  const queue = [unitId]
  while (queue.length > 0) {
    const current = queue.shift()!
    result.push(current)
    const children = childrenMap.get(current) ?? []
    queue.push(...children)
  }
  return result
}

// 조직 단위 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string; unitId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, parentId, sortOrder, isLeaf } = body

    // 부모 변경 시 레벨 유효성 검사
    if (parentId !== undefined) {
      const currentUnit = await prisma.organizationUnit.findUnique({
        where: { id: params.unitId },
      })

      if (parentId) {
        const newParent = await prisma.organizationUnit.findUnique({
          where: { id: parentId },
        })
        if (!newParent) {
          return NextResponse.json({ error: '부모 조직을 찾을 수 없습니다.' }, { status: 400 })
        }
        if (currentUnit && newParent.level >= currentUnit.level) {
          return NextResponse.json(
            { error: '상위 조직의 단계가 현재 단계보다 낮아야 합니다.' },
            { status: 400 }
          )
        }
      }
    }

    const unit = await prisma.organizationUnit.update({
      where: { id: params.unitId },
      data: {
        ...(name !== undefined && { name }),
        ...(parentId !== undefined && { parentId }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isLeaf !== undefined && { isLeaf }),
      },
    })

    return NextResponse.json({
      success: true,
      message: '조직 단위가 수정되었습니다.',
      unit,
    })
  } catch (error) {
    console.error('[Unit] 수정 오류:', error)
    return NextResponse.json(
      { error: '조직 단위 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 조직 단위 삭제 (하위 단위도 함께, 조사 데이터 아카이브)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; orgId: string; unitId: string } }
) {
  const authCheck = await requireStaffOrAbove()
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 })
  }

  try {
    // 1. 삭제 대상 단위 + 모든 하위 단위 ID 수집
    const unitIds = await collectDescendantIds(params.unitId, params.orgId)

    // 2. 해당 단위들에 연결된 근골조사 조회
    const assessments = await prisma.musculoskeletalAssessment.findMany({
      where: { organizationUnitId: { in: unitIds } },
      include: {
        organizationUnit: { select: { name: true } },
        elementWorks: {
          include: { bodyPartScores: true, measurements: true },
        },
        improvements: true,
        attachments: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    let archivedCount = 0

    // 3. 근골조사 아카이브
    if (assessments.length > 0) {
      for (const assessment of assessments) {
        const unitPath = await buildUnitPath(assessment.organizationUnitId, params.orgId)

        await prisma.archivedAssessment.create({
          data: {
            workplaceId: params.id,
            dataType: 'MUSCULOSKELETAL',
            unitName: assessment.organizationUnit.name,
            unitPath,
            assessmentData: JSON.parse(JSON.stringify(assessment)),
            year: assessment.year,
            assessmentType: assessment.assessmentType,
            originalAssessmentId: assessment.id,
            archivedReason: '조직 단위 삭제',
            deletedById: authCheck.user!.id,
          },
        })
        archivedCount++
      }

      await prisma.musculoskeletalAssessment.deleteMany({
        where: { organizationUnitId: { in: unitIds } },
      })
    }

    // 4. 해당 단위들에 연결된 위험성평가 조회 및 아카이브
    const riskCards = await prisma.riskAssessmentCard.findMany({
      where: { organizationUnitId: { in: unitIds } },
      include: {
        organizationUnit: { select: { name: true } },
        photos: true,
        hazards: {
          include: {
            photos: true,
            improvements: { include: { photos: true, files: true } },
          },
        },
      },
    })

    if (riskCards.length > 0) {
      for (const card of riskCards) {
        const unitPath = await buildUnitPath(card.organizationUnitId, params.orgId)

        await prisma.archivedAssessment.create({
          data: {
            workplaceId: params.id,
            dataType: 'RISK_ASSESSMENT',
            unitName: card.organizationUnit.name,
            unitPath,
            assessmentData: JSON.parse(JSON.stringify(card)),
            year: card.year,
            assessmentType: card.evaluationType,
            originalAssessmentId: card.id,
            archivedReason: '조직 단위 삭제',
            deletedById: authCheck.user!.id,
          },
        })
        archivedCount++
      }

      await prisma.riskAssessmentCard.deleteMany({
        where: { organizationUnitId: { in: unitIds } },
      })
    }

    // 5. 하위 단위들 먼저 삭제 (재귀적으로)
    const deleteChildren = async (parentId: string) => {
      const children = await prisma.organizationUnit.findMany({
        where: { parentId },
        select: { id: true },
      })

      for (const child of children) {
        await deleteChildren(child.id)
        await prisma.organizationUnit.delete({ where: { id: child.id } })
      }
    }

    await deleteChildren(params.unitId)
    await prisma.organizationUnit.delete({ where: { id: params.unitId } })

    return NextResponse.json({
      success: true,
      message:
        archivedCount > 0
          ? `조직 단위 및 하위 단위가 삭제되었습니다. (${archivedCount}건의 조사 데이터가 아카이브됨)`
          : '조직 단위 및 하위 단위가 삭제되었습니다.',
      archivedCount,
    })
  } catch (error) {
    console.error('[Unit] 삭제 오류:', error)
    return NextResponse.json(
      { error: '조직 단위 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
