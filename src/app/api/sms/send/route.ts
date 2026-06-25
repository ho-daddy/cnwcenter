import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseJsonBody, ApiError } from '@/lib/api-utils'
import { requireStaffOrAbove } from '@/lib/auth-utils'

const MUNJAON_BASE = 'https://api.munjaon.co.kr'
const FROM_NUMBER = process.env.MUNJAON_FROM_NUMBER ?? '01020176066'

async function sendMunjaonSms(toList: string[], content: string): Promise<{ success: boolean; result: any }> {
  const payload = new URLSearchParams({
    mberId: process.env.MUNJAON_MBER_ID ?? '',
    accessKey: process.env.MUNJAON_ACCESS_KEY ?? '',
    callFrom: FROM_NUMBER,
    callToList: toList.join(','),
    smsTxt: content,
  })

  const res = await fetch(`${MUNJAON_BASE}/api/send/sendMsg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString(),
  })

  const result = await res.json()
  return { success: result.resultCode === '200', result }
}

// POST /api/sms/send
export async function POST(req: NextRequest) {
  const auth = await requireStaffOrAbove()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await parseJsonBody(req)
    const { content, groupIds, memberIds } = body

    if (!content?.trim()) return NextResponse.json({ error: '메시지 내용을 입력해주세요.' }, { status: 400 })
    if (!groupIds?.length && !memberIds?.length) {
      return NextResponse.json({ error: '수신 그룹 또는 회원을 선택해주세요.' }, { status: 400 })
    }

    // 수신자 목록 수집 (그룹 + 직접 지정, 중복 제거)
    const memberSet = new Map<string, { id: string; name: string; phone: string }>()

    if (groupIds?.length) {
      const groupMembers = await prisma.memberGroupMember.findMany({
        where: { groupId: { in: groupIds } },
        include: { member: { select: { id: true, name: true, phone: true, isActive: true } } },
      })
      for (const gm of groupMembers) {
        if (gm.member.isActive) memberSet.set(gm.member.id, gm.member)
      }
    }

    if (memberIds?.length) {
      const directMembers = await prisma.member.findMany({
        where: { id: { in: memberIds }, isActive: true },
        select: { id: true, name: true, phone: true },
      })
      for (const m of directMembers) memberSet.set(m.id, m)
    }

    const recipients = Array.from(memberSet.values())
    if (!recipients.length) return NextResponse.json({ error: '활성 수신자가 없습니다.' }, { status: 400 })

    const toList = recipients.map(r => r.phone)
    const { success, result } = await sendMunjaonSms(toList, content.trim())

    const smsLog = await prisma.smsLog.create({
      data: {
        content: content.trim(),
        sentById: auth.user!.id,
        totalCount: recipients.length,
        successCount: success ? recipients.length : 0,
        result,
        groups: groupIds?.length
          ? { create: groupIds.map((gid: string) => ({ groupId: gid })) }
          : undefined,
        recipients: {
          create: recipients.map(r => ({ memberId: r.id, phone: r.phone, name: r.name, status: success ? 'sent' : 'failed' })),
        },
      },
    })

    return NextResponse.json({ ok: success, smsLogId: smsLog.id, totalCount: recipients.length, result })
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
