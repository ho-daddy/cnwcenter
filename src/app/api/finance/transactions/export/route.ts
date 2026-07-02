import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { requireStaffOrAbove } from '@/lib/auth-utils'

const ACCOUNT_LABEL: Record<string, string> = { PROFIT: '수익통장', NONPROFIT: '비영리통장' }
const KIND_LABEL: Record<string, string> = { INCOME: '수입', EXPENSE: '지출' }
const APPROVAL_LABEL: Record<string, string> = { PENDING: '결재대기', APPROVED: '승인', REJECTED: '반려' }

// GET /api/finance/transactions/export?year=2026&month=7 — 월별 거래내역 엑셀 다운로드
export async function GET(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null

  const dateRange = month
    ? { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) }
    : { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }

  const transactions = await prisma.transaction.findMany({
    where: { date: dateRange },
    orderBy: { date: 'asc' },
    include: {
      category: { select: { name: true, level: true } },
      createdBy: { select: { name: true } },
    },
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = '새움터'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('거래내역')

  sheet.addRow(['날짜', '계좌구분', '수입/지출', '분류', '금액', '적요', '거래처', '지급방법', '결재상태', '등록자'])
  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  let profitBalance = 0
  let nonprofitBalance = 0

  for (const t of transactions) {
    const sign = t.kind === 'INCOME' ? 1 : -1
    if (t.accountType === 'PROFIT') profitBalance += sign * t.amount
    else nonprofitBalance += sign * t.amount

    sheet.addRow([
      t.date.toISOString().slice(0, 10),
      ACCOUNT_LABEL[t.accountType],
      KIND_LABEL[t.kind],
      t.category?.name ?? '',
      t.amount,
      t.description ?? '',
      t.counterparty ?? '',
      t.payMethod ?? '',
      APPROVAL_LABEL[t.approvalStatus],
      t.createdBy.name ?? '',
    ])
  }

  sheet.getColumn(5).numFmt = '#,##0'
  sheet.columns.forEach((col) => { col.width = 16 })
  sheet.getColumn(6).width = 30
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  sheet.addRow([])
  const summaryLabelRow = sheet.addRow(['합계(해당 기간 순증감)', '', '', '', '', '', '', '', '', ''])
  summaryLabelRow.font = { bold: true }
  sheet.addRow(['수익통장', '', '', '', profitBalance])
  sheet.addRow(['비영리통장', '', '', '', nonprofitBalance])

  const buffer = await workbook.xlsx.writeBuffer()
  const label = month ? `${year}년${month}월` : `${year}년`
  const filename = `새움터_거래내역_${label}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
