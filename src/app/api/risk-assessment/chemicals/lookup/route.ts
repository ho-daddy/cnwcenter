import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

// 단일 CAS 조회: DB 마스터(ChemicalComponent) 캐시 우선 → 비었으면 KOSHA 호출 후 캐시
// GET /api/risk-assessment/chemicals/lookup?cas={casNumber}
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const cas = req.nextUrl.searchParams.get('cas')?.trim()
  if (!cas) return NextResponse.json({ error: 'CAS 번호가 필요합니다.' }, { status: 400 })

  if (cas === '영업비밀') {
    return NextResponse.json({
      cas: '영업비밀',
      name: '영업비밀',
      hazards: '영업비밀',
      regulations: '영업비밀',
      source: 'trade-secret',
    })
  }

  // 1. DB 캐시 조회
  const cached = await prisma.chemicalComponent.findUnique({ where: { casNumber: cas } })
  if (cached && (cached.hazards || cached.regulations)) {
    return NextResponse.json({
      cas: cached.casNumber,
      name: cached.name,
      hazards: cached.hazards || '',
      regulations: cached.regulations || '',
      source: 'cache',
    })
  }

  // 2. KOSHA API 호출
  const API_KEY = process.env.KOSHA_API_KEY
  if (!API_KEY) {
    return NextResponse.json({
      cas, name: cached?.name || '', hazards: '', regulations: '',
      source: 'no-api-key', warning: 'KOSHA API 키 미설정',
    })
  }

  const BASE_URL = 'http://msds.kosha.or.kr/openapi/service/msdschem'

  const extractXmlText = (xml: string, tag: string): string => {
    const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
    return m ? m[1].trim() : ''
  }
  const extractAllItems = (xml: string): Array<Record<string, string>> => {
    const items: Array<Record<string, string>> = []
    const re = /<item>([\s\S]*?)<\/item>/g
    let m
    while ((m = re.exec(xml)) !== null) {
      const it: Record<string, string> = {}
      const tr = /<(\w+)>([\s\S]*?)<\/\1>/g
      let tm
      while ((tm = tr.exec(m[1])) !== null) {
        it[tm[1]] = tm[2].trim()
      }
      items.push(it)
    }
    return items
  }

  try {
    const listUrl = `${BASE_URL}/chemlist?serviceKey=${API_KEY}&searchWrd=${encodeURIComponent(cas)}&searchCnd=1&pageNo=1&numOfRows=1`
    const listRes = await fetch(listUrl, { headers: { Accept: 'application/xml' }, signal: AbortSignal.timeout(20000) })
    if (!listRes.ok) {
      return NextResponse.json({ cas, name: cached?.name || '', hazards: '', regulations: '', source: 'kosha-error', warning: `KOSHA API ${listRes.status}` })
    }
    const listXml = await listRes.text()
    const chemId = extractXmlText(listXml, 'chemId')
    const chemNameKor = extractXmlText(listXml, 'chemNameKor')
    if (!chemId) {
      return NextResponse.json({ cas, name: cached?.name || '', hazards: '', regulations: '', source: 'kosha-not-found' })
    }

    let hazards = ''
    try {
      const r = await fetch(`${BASE_URL}/chemdetail02?serviceKey=${API_KEY}&chemId=${encodeURIComponent(chemId)}`, {
        headers: { Accept: 'application/xml' }, signal: AbortSignal.timeout(15000),
      })
      if (r.ok) {
        const items = extractAllItems(await r.text())
        hazards = items.find(i => i.lev === '1' && i.msdsItemCode === 'B02')?.itemDetail || ''
      }
    } catch { /* ignore */ }

    let regulations = ''
    try {
      const r = await fetch(`${BASE_URL}/chemdetail15?serviceKey=${API_KEY}&chemId=${encodeURIComponent(chemId)}`, {
        headers: { Accept: 'application/xml' }, signal: AbortSignal.timeout(15000),
      })
      if (r.ok) {
        const items = extractAllItems(await r.text())
        regulations = items.find(i => i.lev === '1' && i.msdsItemCode === 'O02')?.itemDetail || ''
      }
    } catch { /* ignore */ }

    // DB 마스터에 upsert
    if (chemNameKor || hazards || regulations) {
      await prisma.chemicalComponent.upsert({
        where: { casNumber: cas },
        create: { casNumber: cas, name: chemNameKor || cached?.name || '', hazards: hazards || null, regulations: regulations || null },
        update: {
          name: chemNameKor || cached?.name || '',
          ...(hazards ? { hazards } : {}),
          ...(regulations ? { regulations } : {}),
        },
      })
    }

    return NextResponse.json({
      cas, name: chemNameKor || cached?.name || '',
      hazards, regulations, source: 'kosha',
    })
  } catch (e) {
    console.error('[lookup]', e)
    return NextResponse.json({ cas, name: cached?.name || '', hazards: '', regulations: '', source: 'error' })
  }
}
