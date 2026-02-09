import { PrismaClient } from '@prisma/client'
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
