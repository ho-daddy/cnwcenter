import { PlaywrightBaseScraper } from './playwright-base'
import { CollectedArticle } from '@/types/briefing'

/**
 * 고용노동부 보도자료 스크래퍼 (Playwright 버전)
 * URL: https://www.moel.go.kr/news/enews/report/enewsList.do
 * JS 렌더링이 필요한 사이트
 */
export class MoelPlaywrightScraper extends PlaywrightBaseScraper {
  async collect(): Promise<CollectedArticle[]> {
    const articles: CollectedArticle[] = []

    try {
      const page = await this.startBrowser()

      // 페이지 로드
      await page.goto(this.source.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // 테이블이 로드될 때까지 대기
      await page.waitForSelector('table.board_list tbody tr', { timeout: 10000 })

      // 모든 행 가져오기
      const rows = await page.$$('table.board_list tbody tr')

      for (const row of rows) {
        try {
          // 공지 행 건너뛰기
          const noCell = await row.$('td.no')
          if (noCell) {
            const noText = await noCell.textContent()
            if (noText?.includes('공지')) continue
          }

          // 제목과 onclick 추출
          const titleLink = await row.$('td.subject a')
          if (!titleLink) continue

          const title = (await titleLink.textContent())?.trim() || ''
          const onclick = await titleLink.getAttribute('onclick') || ''

          // onclick에서 seq 추출: fnView('seq값')
          const seqMatch = onclick.match(/fnView\('(\d+)'\)/)
          if (!seqMatch || !title) continue

          const seq = seqMatch[1]
          const url = `https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=${seq}`

          // 날짜 (4번째 td)
          const cells = await row.$$('td')
          let dateText = ''
          if (cells.length >= 4) {
            dateText = (await cells[3].textContent())?.trim() || ''
          }
          const publishedAt = this.parseDate(dateText)

          articles.push({
            title,
            url,
            content: '',
            publishedAt,
            sourceId: this.source.id,
            sourceName: this.source.name,
            linkHash: this.generateLinkHash(url),
          })
        } catch (err) {
          console.error('[MoelPlaywrightScraper] 행 파싱 실패:', err)
        }
      }
    } catch (err) {
      console.error('[MoelPlaywrightScraper] 수집 실패:', err)
      throw err
    } finally {
      await this.closeBrowser()
    }

    return articles
  }
}
