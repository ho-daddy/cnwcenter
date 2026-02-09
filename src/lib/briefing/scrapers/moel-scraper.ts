import * as cheerio from 'cheerio'
import { BaseScraper } from './base'
import { CollectedArticle } from '@/types/briefing'

/**
 * 고용노동부 보도자료 스크래퍼
 * URL: https://www.moel.go.kr/news/enews/report/enewsList.do
 */
export class MoelScraper extends BaseScraper {
  async collect(): Promise<CollectedArticle[]> {
    const articles: CollectedArticle[] = []

    try {
      const html = await this.fetchHtml(this.source.url)
      const $ = cheerio.load(html)

      // 고용노동부 목록 테이블
      $('table.board_list tbody tr').each((_, row) => {
        try {
          const $row = $(row)

          // 공지 행 건너뛰기
          if ($row.find('td.no').text().includes('공지')) {
            return
          }

          // 제목과 링크
          const $titleLink = $row.find('td.subject a')
          const title = $titleLink.text().trim()
          const onclick = $titleLink.attr('onclick') || ''

          // onclick에서 seq 추출: fnView('seq값')
          const seqMatch = onclick.match(/fnView\('(\d+)'\)/)
          if (!seqMatch || !title) return

          const seq = seqMatch[1]
          const url = `https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=${seq}`

          // 날짜
          const dateText = $row.find('td').eq(3).text().trim()
          const publishedAt = this.parseDate(dateText)

          articles.push({
            title,
            url,
            content: '', // 목록에서는 본문을 가져오지 않음
            publishedAt,
            sourceId: this.source.id,
            sourceName: this.source.name,
            linkHash: this.generateLinkHash(url),
          })
        } catch (err) {
          // 개별 행 파싱 실패는 무시하고 계속 진행
          console.error('[MoelScraper] 행 파싱 실패:', err)
        }
      })
    } catch (err) {
      console.error('[MoelScraper] 수집 실패:', err)
      throw err
    }

    return articles
  }
}
