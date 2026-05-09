import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 더미 사업장 데이터 생성 시작...')

  // 기존 테스트 사업장이 있으면 삭제 (재실행 가능하도록)
  const existing = await prisma.workplace.findMany({
    where: { name: '유성기업 아산공장 (테스트)' },
  })
  if (existing.length > 0) {
    for (const wp of existing) {
      await prisma.workplace.delete({ where: { id: wp.id } })
    }
    console.log(`🧹 기존 테스트 사업장 ${existing.length}개 삭제`)
  }

  // 관리자 찾기 (Workplace 권한 부여용)
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@saewoomter.org' },
  })
  if (!admin) {
    throw new Error('admin@saewoomter.org 계정을 먼저 seed 로 만들어주세요.')
  }

  // 1) 사업장
  const workplace = await prisma.workplace.create({
    data: {
      name: '유성기업 아산공장 (테스트)',
      industry: '자동차부품 제조',
      products: '엔진피스톤링, 캠샤프트, 실린더라이너',
      address: '충남 아산시 둔포면 아산밸리북로 100',
      employeeCount: 320,
    },
  })
  console.log(`✅ 사업장 생성: ${workplace.name} (id=${workplace.id})`)

  // 2) 사용자 권한 연결
  await prisma.workplaceUser.create({
    data: {
      userId: admin.id,
      workplaceId: workplace.id,
    },
  })
  console.log(`✅ 관리자에게 사업장 접근 권한 부여`)

  // 3) 사업장 담당자 (선택)
  await prisma.workplaceContact.createMany({
    data: [
      {
        workplaceId: workplace.id,
        contactType: 'SAFETY_OFFICER',
        isPrimary: true,
        name: '김안전',
        position: '안전보건팀장',
        phone: '010-1111-2222',
        email: 'safety@example.test',
      },
      {
        workplaceId: workplace.id,
        contactType: 'UNION_REPRESENTATIVE',
        name: '박노조',
        position: '노조 산업안전부장',
        phone: '010-3333-4444',
        email: 'union@example.test',
      },
    ],
  })
  console.log(`✅ 담당자 2명 등록`)

  // 4) Organization (사업장당 1개)
  const org = await prisma.organization.create({
    data: { workplaceId: workplace.id },
  })

  // 5) OrganizationUnit 트리 — level1: 부서, level2: 공정 (leaf)
  // 구조 예:
  //   생산1팀
  //     - 가공공정
  //     - 조립공정
  //   생산2팀
  //     - 도장공정
  //     - 검사포장공정
  //   품질팀
  //     - 시험분석공정
  const departments: Array<{
    name: string
    processes: string[]
  }> = [
    {
      name: '생산1팀',
      processes: ['가공공정', '조립공정'],
    },
    {
      name: '생산2팀',
      processes: ['도장공정', '검사포장공정'],
    },
    {
      name: '품질팀',
      processes: ['시험분석공정'],
    },
  ]

  let deptOrder = 0
  for (const dept of departments) {
    const deptUnit = await prisma.organizationUnit.create({
      data: {
        organizationId: org.id,
        name: dept.name,
        level: 1,
        sortOrder: deptOrder++,
        isLeaf: false,
      },
    })

    let procOrder = 0
    for (const procName of dept.processes) {
      await prisma.organizationUnit.create({
        data: {
          organizationId: org.id,
          parentId: deptUnit.id,
          name: procName,
          level: 2,
          sortOrder: procOrder++,
          isLeaf: true, // 평가대상
        },
      })
    }
    console.log(`  └ ${dept.name} → ${dept.processes.join(', ')}`)
  }

  console.log('🌱 더미 데이터 생성 완료!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
