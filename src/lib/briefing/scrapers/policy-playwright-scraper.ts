import { PlaywrightBaseScraper } from './playwright-base'
import { CollectedArticle } from '@/types/briefing'

/**
 * 대한민국정책브리핑 스크래퍼 (Playwright 버전)
 * URL: https://www.korea.kr/news/policyNewsList.do
 * JS 렌더링이 필요한 사이트
 */
export class PolicyPlaywrightScraper extends PlaywrightBaseScraper {
  private baseUrl = 'https://www.korea.kr'

  async collect(): Promise<CollectedArticle[]> {
    const articles: CollectedArticle[] = []

    try {
      const page = await this.startBrowser()

      // 페이지 로드
      await page.goto(this.source.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // 콘텐츠 로드 대기
      await page.waitForTimeout(2000)

      // 뉴스 목록 찾기 (다양한 셀렉터 시도)
      const listSelectors = [
        '.news_list li',
        '.list-block li',
        'ul.list li',
        '.board-list li',
        '.news-list li',
        '.article-list li'
      ]

      let items: any[] = []
      for (const selector of listSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 })
          items = await page.$$(selector)
          if (items.length > 0) {
            console.log(`[PolicyPlaywrightScraper] 셀렉터 발견: ${selector}, ${items.length}개 항목`)
            break
          }
        } catch {
          // 셀렉터가 없으면 다음 시도
        }
      }

      // 테이블 형식 시도
      if (items.length === 0) {
        try {
          items = await page.$$('table tbody tr')
          if (items.length > 0) {
            console.log(`[PolicyPlaywrightScraper] 테이블 형식, ${items.length}개 행`)
          }
        } catch {
          // 무시
        }
      }

      for (const item of items) {
        try {
          // 링크 찾기
          const link = await item.$('a')
          if (!link) continue

          // 제목 추출
          let title = ''
          const titleEl = await item.$('.tit, .title, h4, h3, .subject')
          if (titleEl) {
            title = (await titleEl.textContent())?.trim() || ''
          }
          if (!title) {
            title = (await link.textContent())?.trim() || ''
          }

          if (!title || title.length < 5) continue

          // URL
          const href = await link.getAttribute('href') || ''
          const url = href ? this.resolveUrl(href, this.baseUrl) : ''

          // 날짜
          let dateText = ''
          const dateEl = await item.$('.date, .time, span.date, .info .date')
          if (dateEl) {
            dateText = (await dateEl.textContent())?.trim() || ''
          }
          const publishedAt = this.parseDate(dateText)

          // 요약
          let summary = ''
          const summaryEl = await item.$('.txt, .desc, p, .summary')
          if (summaryEl) {
            summary = (await summaryEl.textContent())?.trim() || ''
          }

          const linkHash = url
            ? this.generateLinkHash(url)
            : this.generateLinkHash(`policy-${title}-${dateText}`)

          articles.push({
            title,
            url: url || this.source.url,
            content: summary.slice(0, 500),
            publishedAt,
            sourceId: this.source.id,
            sourceName: this.source.name,
            linkHash,
          })
        } catch (err) {
          console.error('[PolicyPlaywrightScraper] 항목 파싱 실패:', err)
        }
      }

      // 목록이 없으면 로깅
      if (articles.length === 0) {
        const pageContent = await page.content()
        console.log('[PolicyPlaywrightScraper] 페이지 길이:', pageContent.length)
        console.log('[PolicyPlaywrightScraper] 목록을 찾지 못함. 페이지 구조 확인 필요')
      }
    } catch (err) {
      console.error('[PolicyPlaywrightScraper] 수집 실패:', err)
      throw err
    } finally {
      await this.closeBrowser()
    }

    return articles
  }
}
