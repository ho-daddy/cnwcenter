import * as cheerio from 'cheerio'
import { BaseScraper } from './base'
import { CollectedArticle } from '@/types/briefing'

/**
 * 산업안전포털(KOSHA) 재해사례 스크래퍼
 * URL: https://portal.kosha.or.kr/archive/disaster-case/accident-case/acccase-industry/manufac-industry
 */
export class KoshaScraper extends BaseScraper {
  private baseUrl = 'https://portal.kosha.or.kr'

  async collect(): Promise<CollectedArticle[]> {
    const articles: CollectedArticle[] = []

    try {
      const html = await this.fetchHtml(this.source.url)
      const $ = cheerio.load(html)

      // 재해사례 목록
      $('.board-list tbody tr, .list-table tbody tr, table tbody tr').each((_, row) => {
        try {
          const $row = $(row)

          // 제목과 링크 찾기
          const $link = $row.find('a').first()
          const title = $link.text().trim() || $row.find('td').eq(1).text().trim()
          const href = $link.attr('href')

          if (!title || title.length < 5) return

          let url = ''
          if (href) {
            url = this.resolveUrl(href, this.baseUrl)
          }

          // 날짜 찾기 (보통 마지막 td)
          const dateText = $row.find('td').last().text().trim()
          const publishedAt = this.parseDate(dateText)

          // URL이 없으면 제목 기반 해시 생성
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
          console.error('[KoshaScraper] 행 파싱 실패:', err)
        }
      })
    } catch (err) {
      console.error('[KoshaScraper] 수집 실패:', err)
      throw err
    }

    return articles
  }
}
