import { PlaywrightBaseScraper } from './playwright-base'
import { CollectedArticle } from '@/types/briefing'

/**
 * 산업안전포털(KOSHA) 재해사례 스크래퍼 (Playwright 버전)
 * URL: https://portal.kosha.or.kr/archive/disaster-case/accident-case/acccase-industry/manufac-industry
 * Vue.js SPA - JS 렌더링 필수
 */
export class KoshaPlaywrightScraper extends PlaywrightBaseScraper {
  private baseUrl = 'https://portal.kosha.or.kr'

  async collect(): Promise<CollectedArticle[]> {
    const articles: CollectedArticle[] = []

    try {
      const page = await this.startBrowser()

      // 페이지 로드 (Vue.js SPA이므로 networkidle 대기)
      await page.goto(this.source.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // Vue가 데이터를 렌더링할 때까지 추가 대기
      await page.waitForTimeout(2000)

      // 재해사례 목록 테이블 대기 (다양한 셀렉터 시도)
      const tableSelectors = [
        'table tbody tr',
        '.board-list tbody tr',
        '.list-table tbody tr',
        '.el-table__body tbody tr',
        '.v-data-table tbody tr'
      ]

      let rows: any[] = []
      for (const selector of tableSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 })
          rows = await page.$$(selector)
          if (rows.length > 0) {
            console.log(`[KoshaPlaywrightScraper] 셀렉터 발견: ${selector}, ${rows.length}개 행`)
            break
          }
        } catch {
          // 셀렉터가 없으면 다음 시도
        }
      }

      // 카드 형식인 경우 대비
      if (rows.length === 0) {
        const cardSelectors = ['.card', '.list-item', '.board-item', '.case-item']
        for (const selector of cardSelectors) {
          try {
            rows = await page.$$(selector)
            if (rows.length > 0) {
              console.log(`[KoshaPlaywrightScraper] 카드 셀렉터 발견: ${selector}, ${rows.length}개 항목`)
              break
            }
          } catch {
            // 셀렉터가 없으면 다음 시도
          }
        }
      }

      for (const row of rows) {
        try {
          // 링크와 제목 찾기
          const link = await row.$('a')
          let title = ''
          let href = ''

          if (link) {
            title = (await link.textContent())?.trim() || ''
            href = await link.getAttribute('href') || ''
          } else {
            // 링크가 없으면 첫 번째 텍스트 셀에서 제목 추출
            const cells = await row.$$('td')
            if (cells.length > 1) {
              title = (await cells[1].textContent())?.trim() || ''
            }
          }

          if (!title || title.length < 5) continue

          const url = href ? this.resolveUrl(href, this.baseUrl) : ''

          // 날짜 찾기 (마지막 셀 또는 date 클래스)
          let dateText = ''
          const dateEl = await row.$('.date, [class*="date"]')
          if (dateEl) {
            dateText = (await dateEl.textContent())?.trim() || ''
          } else {
            const cells = await row.$$('td')
            if (cells.length > 0) {
              dateText = (await cells[cells.length - 1].textContent())?.trim() || ''
            }
          }
          const publishedAt = this.parseDate(dateText)

          const linkHash = url
            ? this.generateLinkHash(url)
            : this.generateLinkHash(`kosha-${title}-${dateText}`)

          articles.push({
            title,
            url: url || this.source.url,
            content: '',
            publishedAt,
            sourceId: this.source.id,
            sourceName: this.source.name,
            linkHash,
          })
        } catch (err) {
          console.error('[KoshaPlaywrightScraper] 항목 파싱 실패:', err)
        }
      }

      // 목록이 없으면 페이지 구조 로깅
      if (articles.length === 0) {
        const pageContent = await page.content()
        console.log('[KoshaPlaywrightScraper] 페이지 길이:', pageContent.length)
        console.log('[KoshaPlaywrightScraper] 목록을 찾지 못함. 페이지 구조 확인 필요')
      }
    } catch (err) {
      console.error('[KoshaPlaywrightScraper] 수집 실패:', err)
      throw err
    } finally {
      await this.closeBrowser()
    }

    return articles
  }
}
