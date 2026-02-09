import * as cheerio from 'cheerio'
import { BaseScraper } from './base'
import { CollectedArticle } from '@/types/briefing'

/**
 * 산업안전보건연구원 보도자료 스크래퍼
 * URL: https://oshri.kosha.or.kr/oshri/researcherNews/newsRelease.do
 */
export class OshriScraper extends BaseScraper {
  private baseUrl = 'https://oshri.kosha.or.kr'

  async collect(): Promise<CollectedArticle[]> {
    const articles: CollectedArticle[] = []

    try {
      const html = await this.fetchHtml(this.source.url)
      const $ = cheerio.load(html)

      // 보도자료 목록
      $('table tbody tr, .board-list tbody tr, .list-table tbody tr').each((_, row) => {
        try {
          const $row = $(row)

          // 헤더 행 건너뛰기
          if ($row.find('th').length > 0) return

          const tds = $row.find('td')
          if (tds.length < 2) return

          // 제목과 링크
          const $link = $row.find('a').first()
          let title = $link.text().trim()
          const href = $link.attr('href')
          const onclick = $link.attr('onclick') || ''

          if (!title) {
            title = tds.eq(1).text().trim()
          }

          if (!title || title.length < 5) return

          let url = ''
          if (href && href !== '#') {
            url = this.resolveUrl(href, this.baseUrl)
          } else if (onclick) {
            // onclick에서 파라미터 추출
            const match = onclick.match(/\('([^']+)'/)
            if (match) {
              url = `${this.baseUrl}/oshri/researcherNews/newsReleaseView.do?seq=${match[1]}`
            }
          }

          // 날짜
          let dateText = ''
          tds.each((_, td) => {
            const text = $(td).text().trim()
            if (text.match(/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/)) {
              dateText = text
            }
          })
          const publishedAt = this.parseDate(dateText)

          const linkHash = url
            ? this.generateLinkHash(url)
            : this.generateLinkHash(`oshri-${title}-${dateText}`)

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
          console.error('[OshriScraper] 행 파싱 실패:', err)
        }
      })
    } catch (err) {
      console.error('[OshriScraper] 수집 실패:', err)
      throw err
    }

    return articles
  }
}
