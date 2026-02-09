import { chromium, Browser, Page } from 'playwright'
import { SourceDefinition, CollectedArticle } from '@/types/briefing'
import { createHash } from 'crypto'

/**
 * Playwright 기반 스크래퍼 베이스 클래스
 * JS 렌더링이 필요한 사이트용
 */
export abstract class PlaywrightBaseScraper {
  protected source: SourceDefinition
  protected browser: Browser | null = null
  protected page: Page | null = null

  constructor(source: SourceDefinition) {
    this.source = source
  }

  // 각 스크래퍼에서 구현
  abstract collect(): Promise<CollectedArticle[]>

  // 브라우저 시작
  protected async startBrowser(): Promise<Page> {
    this.browser = await chromium.launch({
      headless: true,
    })
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
    })
    this.page = await context.newPage()
    return this.page
  }

  // 브라우저 종료
  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }

  // URL 기반 해시 생성
  protected generateLinkHash(url: string): string {
    return createHash('md5').update(url).digest('hex')
  }

  // 상대 경로를 절대 경로로 변환
  protected resolveUrl(href: string, baseUrl: string): string {
    if (!href) return ''
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href
    }
    if (href.startsWith('//')) {
      return 'https:' + href
    }
    if (href.startsWith('/')) {
      const url = new URL(baseUrl)
      return `${url.protocol}//${url.host}${href}`
    }
    return new URL(href, baseUrl).href
  }

  // 날짜 파싱
  protected parseDate(text: string): Date {
    if (!text) return new Date()

    const patterns = [
      /(\d{4})\.(\d{1,2})\.(\d{1,2})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const [, year, month, day] = match
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      }
    }

    return new Date()
  }
}
