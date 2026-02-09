import { SourceDefinition, CollectedArticle } from '@/types/briefing'
import { LabornewsScraper } from './labornews-scraper'
import { SafetynewsScraper } from './safetynews-scraper'
import { Safety1stNewsScraper } from './safety1stnews-scraper'
import { AnjunjScraper } from './anjunj-scraper'
import { OshriScraper } from './oshri-scraper'

// 스크래퍼 공통 인터페이스
export interface IScraper {
  collect(): Promise<CollectedArticle[]>
}

// 스크래퍼 팩토리 함수 타입
type ScraperFactory = (source: SourceDefinition) => IScraper

// 소스 ID별 스크래퍼 매핑
const SCRAPER_MAP: Record<string, ScraperFactory> = {
  labornews: (source) => new LabornewsScraper(source),
  safetynews: (source) => new SafetynewsScraper(source),
  safety1stnews: (source) => new Safety1stNewsScraper(source),
  anjunj: (source) => new AnjunjScraper(source),
  oshri: (source) => new OshriScraper(source),
}

/**
 * 소스 정의에 맞는 스크래퍼 인스턴스 생성
 */
export function createScraper(source: SourceDefinition): IScraper | null {
  const factory = SCRAPER_MAP[source.id]

  if (!factory) {
    console.warn(`[ScraperRegistry] 미구현 스크래퍼: ${source.id} (${source.name})`)
    return null
  }

  return factory(source)
}

/**
 * 지원하는 소스 ID 목록
 */
export function getSupportedSourceIds(): string[] {
  return Object.keys(SCRAPER_MAP)
}

/**
 * 특정 소스가 지원되는지 확인
 */
export function isSourceSupported(sourceId: string): boolean {
  return sourceId in SCRAPER_MAP
}
