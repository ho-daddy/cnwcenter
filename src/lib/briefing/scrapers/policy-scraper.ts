import * as cheerio from 'cheerio'
import { BaseScraper } from './base'
import { CollectedArticle } from '@/types/briefing'

/**
 * 대한민국정책브리핑 스크래퍼
 * URL: https://www.korea.kr/news/policyNewsList.do
 */
export class PolicyScraper extends BaseScraper {
  private baseUrl = 'https://www.korea.kr'

  async collect(): Promise<CollectedArticle[]> {
    const articles: CollectedArticle[] = []

    try {
      const html = await this.fetchHtml(this.source.url)
      const $ = cheerio.load(html)

      // 정책뉴스 목록
      $('.news_list li, .list-block li, ul.list li').each((_, item) => {
        try {
          const $item = $(item)

          // 제목과 링크
          const $link = $item.find('a').first()
          const title = $link.text().trim() || $item.find('.tit, .title, h4, h3').text().trim()
          const href = $link.attr('href')

          if (!title || title.length < 5) return

          const url = href ? this.resolveUrl(href, this.baseUrl) : ''

          // 날짜
          const dateText = $item.find('.date, .time, span.date').text().trim()
          const publishedAt = this.parseDate(dateText)

          // 요약
          const summary = $item.find('.txt, .desc, p').text().trim()

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
          console.error('[PolicyScraper] 항목 파싱 실패:', err)
        }
      })
    } catch (err) {
      console.error('[PolicyScraper] 수집 실패:', err)
      throw err
    }

    return articles
  }
}
