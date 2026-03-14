import { prisma } from '@/lib/prisma'
import { getActiveSources } from './sources'
import { createScraper, isSourceSupported } from './scrapers/scraper-registry'
import { calculatePriority, findMatchedKeywords } from './keywords'
import { analyzeRelevanceBatch, isScoreRelevant } from './relevance-analyzer'
import { CollectionResult, FilteredArticle } from '@/types/briefing'

export interface CollectionSummary {
  results: CollectionResult[]
  totalCollected: number
  totalFiltered: number
}

/**
 * 활성화된 모든 소스에서 기사를 수집
 */
export async function runCollection(): Promise<CollectionSummary> {
  const sources = getActiveSources()
  const results: CollectionResult[] = []
  let totalCollected = 0
  let totalFiltered = 0

  for (const source of sources) {
    // 미구현 스크래퍼는 건너뛰기
    if (!isSourceSupported(source.id)) {
      console.log(`[Collector] 스킵: ${source.name} (미구현)`)
      continue
    }

    const result: CollectionResult = {
      sourceId: source.id,
      sourceName: source.name,
      collected: 0,
      filtered: 0,
      errors: [],
    }

    // 수집 로그 시작
    const log = await prisma.collectionLog.create({
      data: {
        sourceId: source.id,
        sourceName: source.name,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })

    try {
      const scraper = createScraper(source)
      if (!scraper) {
        throw new Error('스크래퍼 생성 실패')
      }

      const articles = await scraper.collect()
      console.log(`[Collector] ${source.name}: ${articles.length}건 수집`)

      for (const article of articles) {
        try {
          if (!article.url) continue

          // 키워드 필터링
          const textToAnalyze = `${article.title} ${article.content}`
          const priority = calculatePriority(textToAnalyze)
          const matchedKeywords = findMatchedKeywords(textToAnalyze)

          // DB에 저장 (linkHash 기반 중복 방지)
          await prisma.newsBriefing.upsert({
            where: { linkHash: article.linkHash },
            create: {
              title: article.title,
              content: article.content,
              source: source.name,
              sourceId: source.id,
              url: article.url,
              linkHash: article.linkHash,
              priority,
              matchedKeywords: JSON.stringify(matchedKeywords),
              publishedAt: article.publishedAt,
              collectedAt: new Date(),
            },
            update: {
              title: article.title,
              content: article.content,
              priority,
              matchedKeywords: JSON.stringify(matchedKeywords),
            },
          })

          result.collected++
          if (priority !== 'none') {
            result.filtered++
          }
        } catch (err) {
          // 개별 기사 저장 실패 (중복 등) - 건너뛰기
          console.error(`[Collector] 기사 저장 실패:`, err)
        }
      }

      // 수집 로그 완료
      await prisma.collectionLog.update({
        where: { id: log.id },
        data: {
          status: 'SUCCESS',
          articlesCount: result.collected,
          completedAt: new Date(),
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      result.errors.push(message)
      console.error(`[Collector] ${source.name} 오류: ${message}`)

      // 수집 로그 실패
      await prisma.collectionLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: message,
          completedAt: new Date(),
        },
      })
    }

    totalCollected += result.collected
    totalFiltered += result.filtered
    results.push(result)

    // 소스 간 1초 대기 (서버 부하 방지)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // 수집 완료 후 관련성 분석 (relevanceScore가 없는 기사만)
  await analyzeNewArticles()

  return { results, totalCollected, totalFiltered }
}

/**
 * relevanceScore가 없는 새 기사들을 AI로 관련성 분석
 */
async function analyzeNewArticles(): Promise<void> {
  const unscored = await prisma.newsBriefing.findMany({
    where: { relevanceScore: null },
    select: { id: true, title: true, content: true },
  })

  if (unscored.length === 0) {
    console.log('[Collector] 분석 대상 기사 없음')
    return
  }

  console.log(`[Collector] AI 관련성 분석 시작: ${unscored.length}건`)

  // 10건씩 배치 처리 (API 토큰 한도 고려)
  const BATCH_SIZE = 10
  for (let i = 0; i < unscored.length; i += BATCH_SIZE) {
    const batch = unscored.slice(i, i + BATCH_SIZE)
    const results = await analyzeRelevanceBatch(
      batch.map((a) => ({ title: a.title, content: a.content }))
    )

    // 결과를 DB에 업데이트
    await Promise.all(
      batch.map((article, idx) => {
        const { score, reason } = results[idx]
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

    console.log(
      `[Collector] 배치 ${Math.floor(i / BATCH_SIZE) + 1} 완료: ${batch.length}건`
    )
  }

  console.log('[Collector] AI 관련성 분석 완료')
}

/**
 * 오늘 수집된 필터링된 기사 조회
 */
export async function getTodayFilteredArticles(): Promise<FilteredArticle[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const articles = await prisma.newsBriefing.findMany({
    where: {
      collectedAt: { gte: today },
      priority: { not: 'none' },
      isRelevant: true,
    },
    orderBy: [
      { priority: 'asc' }, // critical이 먼저
      { publishedAt: 'desc' },
    ],
  })

  return articles.map((article) => ({
    title: article.title,
    url: article.url || '',
    content: article.content,
    publishedAt: article.publishedAt,
    sourceId: article.sourceId,
    sourceName: article.source,
    linkHash: article.linkHash,
    priority: (article.priority || 'none') as FilteredArticle['priority'],
    matchedKeywords: article.matchedKeywords
      ? JSON.parse(article.matchedKeywords)
      : [],
  }))
}
