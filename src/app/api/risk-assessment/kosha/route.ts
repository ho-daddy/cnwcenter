import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'

// KOSHA MSDS 화학물질 정보 API 프록시
// 기존 시스템의 search_cas.php를 Next.js API Route로 이식
const BASE_URL = 'http://msds.kosha.or.kr/openapi/service/msdschem'

function extractXmlText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
  return match ? match[1].trim() : ''
}

function extractAllItems(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRegex.exec(xml)) !== null) {
    const itemXml = m[1]
    const item: Record<string, string> = {}
    const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g
    let tm
    while ((tm = tagRegex.exec(itemXml)) !== null) {
      item[tm[1]] = tm[2].trim()
    }
    items.push(item)
  }
  return items
}

// GET /api/risk-assessment/kosha?cas={casNumber}
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const API_KEY = process.env.KOSHA_API_KEY
  if (!API_KEY) return NextResponse.json({ error: 'KOSHA API 키가 설정되지 않았습니다.' }, { status: 503 })

  const cas = req.nextUrl.searchParams.get('cas')
  if (!cas) return NextResponse.json({ error: 'CAS 번호가 필요합니다.' }, { status: 400 })

  if (cas === '영업비밀') {
    return NextResponse.json({ name: '영업비밀', hazards: '영업비밀', regulations: '영업비밀' })
  }

  try {
    // 1. chemlist: chemId + chemNameKor 조회
    const listUrl = `${BASE_URL}/chemlist?serviceKey=${API_KEY}&searchWrd=${encodeURIComponent(cas)}&searchCnd=1&pageNo=1&numOfRows=1`
    const listRes = await fetch(listUrl, {
      headers: { Accept: 'application/xml' },
      signal: AbortSignal.timeout(20000),
    })

    if (!listRes.ok) {
      return NextResponse.json({ error: `KOSHA API 오류 (${listRes.status})` }, { status: 502 })
    }

    const listXml = await listRes.text()
    const resultCode = extractXmlText(listXml, 'resultCode')

    if (resultCode && resultCode !== '00') {
      return NextResponse.json({ name: '', hazards: '', regulations: '' })
    }

    const chemId = extractXmlText(listXml, 'chemId')
    const chemNameKor = extractXmlText(listXml, 'chemNameKor')

    if (!chemId) {
      return NextResponse.json({ name: '', hazards: '', regulations: '' })
    }

    // 2. chemdetail02: 유해성 정보 (B02, lev=1)
    let hazards = ''
    try {
      const d02Url = `${BASE_URL}/chemdetail02?serviceKey=${API_KEY}&chemId=${encodeURIComponent(chemId)}`
      const d02Res = await fetch(d02Url, {
        headers: { Accept: 'application/xml' },
        signal: AbortSignal.timeout(15000),
      })
      if (d02Res.ok) {
        const d02Xml = await d02Res.text()
        const items = extractAllItems(d02Xml)
        const found = items.find(i => i.lev === '1' && i.msdsItemCode === 'B02')
        if (found?.itemDetail) hazards = found.itemDetail
      }
    } catch { /* 유해성 조회 실패 시 빈 문자열 */ }

    // 3. chemdetail15: 규제사항 (O02, lev=1)
    let regulations = ''
    try {
      const d15Url = `${BASE_URL}/chemdetail15?serviceKey=${API_KEY}&chemId=${encodeURIComponent(chemId)}`
      const d15Res = await fetch(d15Url, {
        headers: { Accept: 'application/xml' },
        signal: AbortSignal.timeout(15000),
      })
      if (d15Res.ok) {
        const d15Xml = await d15Res.text()
        const items = extractAllItems(d15Xml)
        const found = items.find(i => i.lev === '1' && i.msdsItemCode === 'O02')
        if (found?.itemDetail) regulations = found.itemDetail
      }
    } catch { /* 규제사항 조회 실패 시 빈 문자열 */ }

    return NextResponse.json({ name: chemNameKor, hazards, regulations })
  } catch (error) {
    console.error('[KOSHA API]', error)
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
