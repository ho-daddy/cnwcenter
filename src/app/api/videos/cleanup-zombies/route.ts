import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 한 시간 이상 UPLOADING 상태로 머문 영상 레코드를 FAILED 로 정리한다.
// 클라이언트가 업로드 중 페이지를 이탈하거나 네트워크가 영구적으로 끊긴 경우 발생하는
// 좀비 레코드를 주기적으로 정리한다.

export const dynamic = 'force-dynamic'

const ZOMBIE_THRESHOLD_MINUTES = 60

async function cleanup() {
  const cutoff = new Date(Date.now() - ZOMBIE_THRESHOLD_MINUTES * 60 * 1000)

  const result = await prisma.workVideo.updateMany({
    where: {
      status: 'UPLOADING',
      createdAt: { lt: cutoff },
    },
    data: {
      status: 'FAILED',
      errorMessage: '업로드 시간 초과 (자동 정리)',
    },
  })

  return { cleanedCount: result.count, cutoff }
}

function isAuthorized(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  const secret = process.env.VIDEO_CLEANUP_SECRET || process.env.BRIEFING_COLLECT_SECRET
  const isValidKey = secret && apiKey === secret
  return Boolean(isValidKey)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  try {
    const { cleanedCount, cutoff } = await cleanup()
    return NextResponse.json({
      success: true,
      cleanedCount,
      cutoff: cutoff.toISOString(),
    })
  } catch (err) {
    console.error('[video-cleanup-zombies]', err)
    return NextResponse.json(
      { error: '좀비 레코드 정리 실패', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}

// 운영 편의를 위해 GET 도 같은 로직 (관리자 브라우저로 호출 가능)
export async function GET(request: NextRequest) {
  return POST(request)
}
