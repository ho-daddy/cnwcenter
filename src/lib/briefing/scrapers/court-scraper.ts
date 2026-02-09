import * as cheerio from 'cheerio'
import { BaseScraper } from './base'
import { CollectedArticle } from '@/types/briefing'

/**
 * 대한민국 법원 뉴스 스크래퍼
 * URL: https://www.scourt.go.kr/portal/news/NewsListAction.work?gubun=2
 */
export class CourtScraper extends BaseScraper {
  private baseUrl = 'https://www.scourt.go.kr'

  async collect(): Promise<CollectedArticle[]> {
    const articles: CollectedArticle[] = []

    try {
      const html = await this.fetchHtml(this.source.url)
      const $ = cheerio.load(html)

      // 법원 뉴스 목록
      $('table tbody tr, .board_list tbody tr, .list-table tbody tr').each((_, row) => {
        try {
          const $row = $(row)

          // 번호 열이 있으면 건너뛰기 (헤더 행)
          const firstCell = $row.find('td').first().text().trim()
          if (firstCell === '번호' || firstCell === 'NO' || !firstCell) return

          // 제목과 링크
          const $link = $row.find('a').first()
          let title = $link.text().trim()

          // 링크 없으면 두번째 td에서 제목 찾기
          if (!title) {
            title = $row.find('td').eq(1).text().trim()
          }

          const href = $link.attr('href')

          if (!title || title.length < 5) return

          let url = ''
          if (href) {
            // onclick 함수에서 URL 추출 시도
            const onclick = $link.attr('onclick') || ''
            const seqMatch = onclick.match(/\('(\d+)'\)/) || href.match(/seq=(\d+)/)
            if (seqMatch) {
              url = `${this.baseUrl}/portal/news/NewsViewAction.work?seq=${seqMatch[1]}&gubun=2`
            } else {
              url = this.resolveUrl(href, this.baseUrl)
            }
          }

          // 날짜 (보통 3번째 또는 마지막 td)
          const tds = $row.find('td')
          let dateText = ''
          tds.each((i, td) => {
            const text = $(td).text().trim()
            if (text.match(/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/)) {
              dateText = text
            }
          })
          const publishedAt = this.parseDate(dateText)

          const linkHash = url
            ? this.generateLinkHash(url)
            : this.generateLinkHash(`court-${title}-${dateText}`)

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
          console.error('[CourtScraper] 행 파싱 실패:', err)
        }
      })
    } catch (err) {
      console.error('[CourtScraper] 수집 실패:', err)
      throw err
    }

    return articles
  }
}
