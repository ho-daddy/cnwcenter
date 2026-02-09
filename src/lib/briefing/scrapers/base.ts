import { createHash } from 'crypto'
import { SourceDefinition, CollectedArticle } from '@/types/briefing'

// 기본 HTTP 헤더
export const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
}

// 스크래퍼 추상 클래스
export abstract class BaseScraper {
  protected source: SourceDefinition

  constructor(source: SourceDefinition) {
    this.source = source
  }

  // 각 스크래퍼에서 구현
  abstract collect(): Promise<CollectedArticle[]>

  // HTML 가져오기 (타임아웃 포함)
  protected async fetchHtml(url: string, timeoutMs = 10000): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.text()
    } finally {
      clearTimeout(timer)
    }
  }

  // URL 기반 해시 생성 (중복 방지용)
  protected generateLinkHash(url: string): string {
    return createHash('md5').update(url).digest('hex')
  }

  // 상대 경로를 절대 경로로 변환
  protected resolveUrl(href: string, baseUrl: string): string {
    if (!href) return ''

    // 이미 절대 경로인 경우
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href
    }

    // 프로토콜 상대 경로
    if (href.startsWith('//')) {
      return 'https:' + href
    }

    // 슬래시로 시작하는 경우 (루트 상대 경로)
    if (href.startsWith('/')) {
      const url = new URL(baseUrl)
      return `${url.protocol}//${url.host}${href}`
    }

    // 상대 경로
    return new URL(href, baseUrl).href
  }

  // 날짜 문자열 파싱 (YYYY.MM.DD, YYYY-MM-DD 등)
  protected parseDate(text: string): Date {
    if (!text) return new Date()

    // 다양한 날짜 형식 처리
    const patterns = [
      /(\d{4})\.(\d{1,2})\.(\d{1,2})/, // 2024.01.15
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // 2024-01-15
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/, // 2024/01/15
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const [, year, month, day] = match
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      }
    }

    // 파싱 실패 시 현재 날짜
    return new Date()
  }
}
