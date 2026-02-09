import * as cheerio from 'cheerio'
import { BaseScraper } from './base'
import { CollectedArticle } from '@/types/briefing'

/**
 * 안전신문 스크래퍼
 * URL: https://www.safetynews.co.kr/news/articleList.html?sc_section_code=S1N1
 * 매일노동뉴스와 동일한 템플릿 사용
 */
export class SafetynewsScraper extends BaseScraper {
  private baseUrl = 'https://www.safetynews.co.kr'

  async collect(): Promise<CollectedArticle[]> {
    const articles: CollectedArticle[] = []

    try {
      const html = await this.fetchHtml(this.source.url)
      const $ = cheerio.load(html)

      // 기사 목록: h4.titles a (매일노동뉴스와 동일 구조)
      $('h4.titles a').each((_, el) => {
        try {
          const $link = $(el)
          const title = $link.text().trim()
          const href = $link.attr('href')

          // 빈 제목이나 placeholder 건너뛰기
          if (!title || title.length < 5 || $link.hasClass('replace-titles')) return

          const url = href ? this.resolveUrl(href, this.baseUrl) : ''
          if (!url) return

          // byline에서 날짜 추출 시도
          const $parent = $link.closest('li')
          const $byline = $parent.length ? $parent.find('.byline') : $link.parent().prev('.byline')
          const bylineText = $byline.text()
          const dateMatch = bylineText.match(/(\d{4}\.\d{2}\.\d{2})/)
          const publishedAt = dateMatch ? this.parseDate(dateMatch[1]) : new Date()

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
          console.error('[SafetynewsScraper] 항목 파싱 실패:', err)
        }
      })
    } catch (err) {
      console.error('[SafetynewsScraper] 수집 실패:', err)
      throw err
    }

    return articles
  }
}
