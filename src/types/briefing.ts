// 소스 카테고리
export type SourceCategory = 'GOVERNMENT' | 'LAW' | 'MEDIA' | 'RESEARCH'

// 스크래퍼 타입
export type ScraperType = 'CHEERIO' | 'PLAYWRIGHT'

// 하드코딩 소스 정의
export interface SourceDefinition {
  id: string
  name: string
  category: SourceCategory
  url: string
  scraperType: ScraperType
  isActive: boolean
  priority: number
}

// 수집된 기사
export interface CollectedArticle {
  title: string
  url: string
  content: string
  publishedAt: Date
  sourceId: string
  sourceName: string
  linkHash: string
}

// 필터링된 기사 (키워드 매칭 후)
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'none'

export interface FilteredArticle extends CollectedArticle {
  priority: PriorityLevel
  matchedKeywords: string[]
}

// 수집 결과
export interface CollectionResult {
  sourceId: string
  sourceName: string
  collected: number
  filtered: number
  errors: string[]
}

// 기존 ScrapingConfig (호환성 유지용, 추후 삭제)
export interface ScrapingConfig {
  listSelector: string
  titleSelector: string
  linkSelector: string
  dateSelector?: string
  baseUrl?: string
}
