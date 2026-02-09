import { NextRequest, NextResponse } from 'next/server'
import { runCollection } from '@/lib/briefing/collector'

export async function POST(request: NextRequest) {
  try {
    // API 키 인증 (외부 cron 호출 시)
    const apiKey = request.headers.get('x-api-key')
    const referer = request.headers.get('referer')
    const secret = process.env.BRIEFING_COLLECT_SECRET

    // 내부 요청(같은 도메인)이거나 API 키가 일치하면 허용
    const isInternal = referer?.includes(request.headers.get('host') || 'localhost')
    const isValidKey = secret && apiKey === secret

    if (!isInternal && !isValidKey) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { results, totalCollected, totalFiltered } = await runCollection()

    return NextResponse.json({
      success: true,
      totalCollected,
      totalFiltered,
      results,
    })
  } catch (error) {
    console.error('Collection failed:', error)
    return NextResponse.json(
      { error: '수집 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
