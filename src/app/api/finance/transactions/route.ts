import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireStaffOrAbove } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-utils'

const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024

// GET /api/finance/transactions — 목록 (계좌·유형·연월 필터)
export async function GET(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const accountType = searchParams.get('accountType') ?? undefined
  const kind = searchParams.get('kind') ?? undefined
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  let dateRange: { gte: Date; lt: Date } | undefined
  if (year && month) {
    const y = parseInt(year), m = parseInt(month)
    dateRange = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
  } else if (year) {
    const y = parseInt(year)
    dateRange = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) }
  }

  const where = {
    ...(accountType ? { accountType: accountType as 'PROFIT' | 'NONPROFIT' } : {}),
    ...(kind ? { kind: kind as 'INCOME' | 'EXPENSE' } : {}),
    ...(dateRange ? { date: dateRange } : {}),
  }

  const [transactions, balances] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        category: { select: { id: true, name: true, level: true } },
        createdBy: { select: { id: true, name: true } },
        secretaryApprover: { select: { id: true, name: true } },
        directorApprover: { select: { id: true, name: true } },
      },
    }),
    // 계좌별 전체 잔액(수입 - 지출, 필터 무관 전체 누적)
    prisma.transaction.groupBy({
      by: ['accountType', 'kind'],
      _sum: { amount: true },
    }),
  ])

  const balanceMap: Record<string, number> = { PROFIT: 0, NONPROFIT: 0 }
  for (const b of balances) {
    const sign = b.kind === 'INCOME' ? 1 : -1
    balanceMap[b.accountType] += sign * (b._sum.amount ?? 0)
  }

  return NextResponse.json({ transactions, balances: balanceMap })
}

// POST /api/finance/transactions — 신규 거래 등록 (영수증 사진 첨부 가능, multipart/form-data)
export async function POST(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      throw new ApiError(400, 'multipart/form-data 형식으로 요청해주세요 (영수증 파일 첨부를 위해 FormData 사용).')
    }
    const formData = await req.formData()
    const kind = formData.get('kind') as string
    const accountType = formData.get('accountType') as string
    const date = formData.get('date') as string
    const amount = formData.get('amount') as string
    const categoryId = formData.get('categoryId') as string | null
    const description = formData.get('description') as string | null
    const counterparty = formData.get('counterparty') as string | null
    const payMethod = formData.get('payMethod') as string | null
    const receipt = formData.get('receipt') as File | null

    if (!['INCOME', 'EXPENSE'].includes(kind)) throw new ApiError(400, '수입/지출 구분을 선택해주세요.')
    if (!['PROFIT', 'NONPROFIT'].includes(accountType)) throw new ApiError(400, '계좌 구분(수익/비영리)을 선택해주세요.')
    if (!date) throw new ApiError(400, '날짜를 입력해주세요.')
    const amountNum = parseInt(amount)
    if (!amountNum || amountNum <= 0) throw new ApiError(400, '금액을 올바르게 입력해주세요.')

    let receiptUrl: string | null = null
    if (receipt && receipt.size > 0) {
      if (!ALLOWED_RECEIPT_TYPES.includes(receipt.type)) throw new ApiError(400, 'JPG, PNG, WebP, PDF 파일만 업로드할 수 있습니다.')
      if (receipt.size > MAX_RECEIPT_SIZE) throw new ApiError(400, '영수증 파일 크기는 10MB 이하여야 합니다.')

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'finance', 'receipts')
      await mkdir(uploadDir, { recursive: true })
      const ext = path.extname(receipt.name) || '.jpg'
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
      await writeFile(path.join(uploadDir, fileName), Buffer.from(await receipt.arrayBuffer()))
      receiptUrl = `/uploads/finance/receipts/${fileName}`
    }

    const transaction = await prisma.transaction.create({
      data: {
        kind: kind as 'INCOME' | 'EXPENSE',
        accountType: accountType as 'PROFIT' | 'NONPROFIT',
        date: new Date(date),
        amount: amountNum,
        categoryId: categoryId || null,
        description: description?.trim() || null,
        counterparty: counterparty?.trim() || null,
        payMethod: payMethod?.trim() || null,
        receiptUrl,
        createdById: auth.user!.id,
      },
      include: {
        category: { select: { id: true, name: true, level: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
