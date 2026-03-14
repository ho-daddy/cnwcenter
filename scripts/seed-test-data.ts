import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 테스트 데이터 생성 시작...\n')

  // 관리자 계정 가져오기
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@saewoomter.org' }
  })

  if (!admin) {
    console.error('❌ 관리자 계정을 찾을 수 없습니다!')
    return
  }

  // 1. 사업장 생성
  console.log('📍 사업장 생성 중...')
  const workplace = await prisma.workplace.create({
    data: {
      name: '새움건설 본사',
      address: '서울시 강남구 테헤란로 123',
      industry: '건설업',
      products: '건축물 신축, 리모델링',
      employeeCount: 150,
      contacts: {
        create: [
          {
            contactType: 'SAFETY_OFFICER',
            name: '이안전',
            position: '안전관리자',
            phone: '010-1234-5678',
            email: 'safety@saewoom.com',
            isPrimary: true,
          }
        ]
      }
    }
  })
  console.log(`✅ 사업장 생성: ${workplace.name}\n`)

  // 2. 조직도 및 조직 단위 생성
  console.log('🏢 조직도 생성 중...')
  const organization = await prisma.organization.create({
    data: {
      workplaceId: workplace.id,
      units: {
        create: [
          {
            name: '총무팀',
            level: 1,
            sortOrder: 1,
            isLeaf: true,
          },
          {
            name: '현장관리팀',
            level: 1,
            sortOrder: 2,
            isLeaf: true,
          },
          {
            name: '안전보건팀',
            level: 1,
            sortOrder: 3,
            isLeaf: true,
          },
        ]
      }
    },
    include: {
      units: true
    }
  })
  const orgUnits = organization.units
  console.log(`✅ 조직도 생성 (${orgUnits.length}개 조직 단위)\n`)

  // 3. 위험성평가 카드 생성
  console.log('⚠️ 위험성평가 카드 생성 중...')
  const riskCard = await prisma.riskAssessmentCard.create({
    data: {
      workplaceId: workplace.id,
      organizationUnitId: orgUnits[1].id, // 현장관리팀
      year: 2026,
      evaluationType: 'OCCASIONAL',
      evaluationReason: '신규 공정 도입',
      workerName: '박현장',
      evaluatorName: admin.name || '관리자',
      dailyWorkingHours: '8시간',
      dailyProduction: '콘크리트 20m³',
      annualWorkingDays: '300일',
      workCycle: '1주일 단위 반복',
      workDescription: '철근 콘크리트 타설 작업 - 거푸집 설치 → 철근 배근 → 콘크리트 타설 → 양생',
    }
  })

  // 위험요인 추가
  const hazards = await Promise.all([
    prisma.riskHazard.create({
      data: {
        cardId: riskCard.id,
        workplaceId: workplace.id,
        year: 2026,
        hazardCategory: 'ACCIDENT',
        hazardFactor: '고소작업 중 비계 발판 불량으로 인한 추락',
        severityScore: 5,
        likelihoodScore: 3,
        additionalPoints: 1,
        riskScore: 16,
        improvementPlan: '안전난간 설치 및 안전대 착용 의무화',
      }
    }),
    prisma.riskHazard.create({
      data: {
        cardId: riskCard.id,
        workplaceId: workplace.id,
        year: 2026,
        hazardCategory: 'ACCIDENT',
        hazardFactor: '자재 적재 불량으로 인한 중량물 낙하',
        severityScore: 4,
        likelihoodScore: 2,
        additionalPoints: 0,
        riskScore: 8,
        improvementPlan: '적재 기준 준수 및 안전 펜스 설치',
      }
    }),
    prisma.riskHazard.create({
      data: {
        cardId: riskCard.id,
        workplaceId: workplace.id,
        year: 2026,
        hazardCategory: 'NOISE',
        hazardFactor: '콘크리트 펌프카 및 바이브레이터 작업 시 소음',
        severityScore: 3,
        likelihoodScore: 4,
        additionalPoints: 0,
        riskScore: 12,
        improvementPlan: '청력보호구 지급 및 착용 지도',
      }
    }),
  ])
  console.log(`✅ 위험성평가 카드 생성 (3개 위험요인 포함)\n`)

  // 4. 개선이력 추가
  console.log('🔧 개선이력 생성 중...')
  await prisma.riskImprovementRecord.create({
    data: {
      hazardId: hazards[0].id, // 첫 번째 위험요인
      status: 'PLANNED',
      updateDate: new Date('2026-04-30'),
      improvementContent: '안전난간 설치 및 안전대 착용 의무화',
      responsiblePerson: '이안전',
      severityScore: 3, // 개선 후 예상
      likelihoodScore: 1,
      additionalPoints: 0,
      riskScore: 3,
    }
  })
  console.log('✅ 개선이력 1건 생성\n')

  // 5. 근골격계 유해요인 조사 생성
  console.log('🦴 근골격계 유해요인 조사 생성 중...')
  const survey = await prisma.musculoskeletalAssessment.create({
    data: {
      workplaceId: workplace.id,
      organizationUnitId: orgUnits[1].id,
      year: 2026,
      assessmentType: '정기조사',
      status: 'DRAFT',
      workerName: '최작업',
      investigatorName: admin.name || '관리자',
      dailyWorkHours: 9.0,
      dailyProduction: '철근 배근 20톤',
      workFrequency: '상시',
      employmentType: '정규직',
      workDays: '주6일',
      shiftType: '교대없음',
      jobAutonomy: 2,
      hasNoise: true,
      hasThermal: false,
      hasBurn: false,
      hasDust: true,
      hasAccident: true,
      hasStress: false,
      hasOtherRisk: false,
      affectedHandWrist: true,
      affectedElbow: false,
      affectedShoulder: true,
      affectedNeck: true,
      affectedBack: true,
      affectedKnee: false,
    }
  })
  console.log(`✅ 근골조사 생성: 현장관리팀 근골격계 조사\n`)

  console.log('🎉 테스트 데이터 생성 완료!\n')
  console.log('📊 생성된 데이터:')
  console.log(`  - 사업장: ${workplace.name}`)
  console.log(`  - 조직 단위: ${orgUnits.length}개`)
  console.log(`  - 위험성평가: 1건 (위험요인 3개)`)
  console.log(`  - 개선계획: 1건`)
  console.log(`  - 근골조사: 1건`)
  console.log('\n✨ http://localhost:3000 에서 확인하세요!')
}

main()
  .catch((e) => {
    console.error('❌ 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
