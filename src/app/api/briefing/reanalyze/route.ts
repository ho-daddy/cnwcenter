import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeRelevanceBatch, isScoreRelevant } from '@/lib/briefing/relevance-analyzer'

/**
 * POST /api/briefing/reanalyze
 * 기존 기사들의 관련성을 AI로 재분석
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const referer = request.headers.get('referer')
    const secret = process.env.BRIEFING_COLLECT_SECRET

    const isInternal = referer?.includes(request.headers.get('host') || 'localhost')
    const isValidKey = secret && apiKey === secret

    if (!isInternal && !isValidKey) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // relevanceScore가 null인 기사만 대상
    const unscored = await prisma.newsBriefing.findMany({
      where: { relevanceScore: null },
      select: { id: true, title: true, content: true },
      orderBy: { publishedAt: 'desc' },
    })

    if (unscored.length === 0) {
      return NextResponse.json({
        success: true,
        message: '분석할 기사가 없습니다 (모든 기사가 이미 분석됨)',
        analyzed: 0,
      })
    }

    const BATCH_SIZE = 10
    let analyzed = 0
    let relevant = 0

    for (let i = 0; i < unscored.length; i += BATCH_SIZE) {
      const batch = unscored.slice(i, i + BATCH_SIZE)
      const results = await analyzeRelevanceBatch(
        batch.map((a) => ({ title: a.title, content: a.content }))
      )

      await Promise.all(
        batch.map((article, idx) => {
          const { score, reason } = results[idx]
          if (isScoreRelevant(score)) relevant++
          return prisma.newsBriefing.update({
            where: { id: article.id },
            data: {
              relevanceScore: score,
              relevanceReason: reason,
              isRelevant: isScoreRelevant(score),
            },
          })
        })
      )

      analyzed += batch.length
    }

    return NextResponse.json({
      success: true,
      analyzed,
      relevant,
      filtered: analyzed - relevant,
    })
  } catch (error) {
    console.error('[Reanalyze] 오류:', error)
    return NextResponse.json(
      { error: '재분석 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
