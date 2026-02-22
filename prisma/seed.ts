import { Prisma, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 시드 데이터 생성 시작...')

  // 최고관리자 계정 생성
  const adminEmail = 'admin@saewoomter.org'
  const adminPassword = 'admin1234' // 첫 로그인 후 변경 필요

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log('⚠️  최고관리자 계정이 이미 존재합니다:', adminEmail)
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    await prisma.user.create({
      data: {
        email: adminEmail,
        name: '최고관리자',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    })

    console.log('✅ 최고관리자 계정 생성 완료:')
    console.log('   이메일:', adminEmail)
    console.log('   비밀번호:', adminPassword)
    console.log('   ⚠️  첫 로그인 후 비밀번호를 변경해주세요!')
  }

  // 기본 설문 템플릿 생성
  const existingTemplate = await prisma.surveyTemplate.findFirst({
    where: { isDefault: true },
  })

  const {
    DEFAULT_SURVEY_TEMPLATE,
    RISK_ASSESSMENT_TEMPLATE,
    MUSCULOSKELETAL_TEMPLATE,
  } = await import('../src/lib/survey/templates')

  if (existingTemplate) {
    await prisma.surveyTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        structure: DEFAULT_SURVEY_TEMPLATE as unknown as Prisma.InputJsonValue,
      },
    })
    console.log('✅ 기본 설문 템플릿 업데이트 완료:', existingTemplate.name)
  } else {
    await prisma.surveyTemplate.create({
      data: {
        name: '위험성평가/근골격계 유해요인조사 통합 설문지',
        description: '산업안전보건법에 따른 위험성평가 및 근골격계 유해요인조사를 위한 통합 설문지입니다. 개인정보, 사고경험, 질환 및 유해요인, 노동강도, 근골격계질환 5개 섹션으로 구성되어 있습니다.',
        structure: DEFAULT_SURVEY_TEMPLATE as unknown as Prisma.InputJsonValue,
        isDefault: true,
      },
    })
    console.log('✅ 기본 설문 템플릿 생성 완료: 위험성평가/근골격계 유해요인조사 통합 설문지')
  }

  // 위험성평가용 템플릿
  const TEMPLATES = [
    {
      name: '위험성평가 설문지',
      description: '위험성평가를 위한 설문지입니다. 개인정보, 사고경험, 질환 및 유해요인 3개 섹션으로 구성되어 있습니다.',
      structure: RISK_ASSESSMENT_TEMPLATE as unknown as Prisma.InputJsonValue,
    },
    {
      name: '근골격계 유해요인조사 설문지',
      description: '근골격계 유해요인조사를 위한 설문지입니다. 개인정보, 노동강도, 근골격계질환 3개 섹션으로 구성되어 있습니다.',
      structure: MUSCULOSKELETAL_TEMPLATE as unknown as Prisma.InputJsonValue,
    },
  ]

  for (const tmpl of TEMPLATES) {
    const existing = await prisma.surveyTemplate.findFirst({
      where: { name: tmpl.name },
    })
    if (existing) {
      await prisma.surveyTemplate.update({
        where: { id: existing.id },
        data: { structure: tmpl.structure },
      })
      console.log('✅ 설문 템플릿 업데이트 완료:', tmpl.name)
    } else {
      await prisma.surveyTemplate.create({
        data: { ...tmpl, isDefault: false },
      })
      console.log('✅ 설문 템플릿 생성 완료:', tmpl.name)
    }
  }

  console.log('🌱 시드 데이터 생성 완료!')
}

main()
  .catch((e) => {
    console.error('시드 데이터 생성 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
