import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { CaseStatus, Prisma } from '@prisma/client'

// GET /api/counseling — 상담케이스 목록
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const where: Prisma.CounselingCaseWhereInput = {}

  // WORKPLACE_USER는 자신이 담당자인 케이스만
  if (auth.user!.role === 'WORKPLACE_USER') {
    where.assignedTo = auth.user!.id
  }

  if (status && Object.values(CaseStatus).includes(status as CaseStatus)) {
    where.status = status as CaseStatus
  }
  if (search) {
    where.OR = [
      { victimName: { contains: search, mode: 'insensitive' } },
      { caseNumber: { contains: search, mode: 'insensitive' } },
    ]
  }

  const cases = await prisma.counselingCase.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      _count: { select: { consultations: true } },
    },
  })

  return NextResponse.json({ cases })
}

// POST /api/counseling — 케이스 생성
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await req.json()
  const {
    victimName, victimContact, workplaceName, caseType,
    diseaseCategory, accidentDate, accidentType, diagnosisDate,
    diagnosisName, guardianName, guardianContact, assignedTo,
  } = body

  if (!victimName || !victimContact) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
  }

  // 케이스 번호 자동생성: YYYY-CC-NNNN
  const year = new Date().getFullYear()
  const count = await prisma.counselingCase.count({ where: { caseNumber: { startsWith: `${year}-CC-` } } })
  const caseNumber = `${year}-CC-${String(count + 1).padStart(4, '0')}`

  const counselingCase = await prisma.counselingCase.create({
    data: {
      caseNumber,
      victimName,
      victimContact,
      workplaceName: workplaceName || null,
      caseType: caseType || null,
      diseaseCategory: diseaseCategory || null,
      accidentDate: accidentDate ? new Date(accidentDate) : null,
      accidentType: accidentType || null,
      diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : null,
      diagnosisName: diagnosisName || null,
      guardianName: guardianName || null,
      guardianContact: guardianContact || null,
      assignedTo: assignedTo || auth.user!.id,
      status: 'RECEIVED',
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(counselingCase, { status: 201 })
}
