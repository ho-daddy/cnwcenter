import { SourceDefinition, SourceCategory } from '@/types/briefing'

// 카테고리별 라벨
export const CATEGORY_LABELS: Record<SourceCategory, string> = {
  GOVERNMENT: '정부/기관',
  LAW: '법률/판례',
  MEDIA: '전문 언론',
  RESEARCH: '민간 연구',
}

// 하드코딩 브리핑 소스 목록
export const BRIEFING_SOURCES: SourceDefinition[] = [
  // === 전문 언론 ===
  {
    id: 'labornews',
    name: '매일노동뉴스',
    category: 'MEDIA',
    url: 'https://www.labortoday.co.kr/news/articleList.html?sc_section_code=S1N7&view_type=sm',
    scraperType: 'CHEERIO',
    isActive: true,
    priority: 1,
  },
  {
    id: 'safetynews',
    name: '안전신문',
    category: 'MEDIA',
    url: 'https://www.safetynews.co.kr/news/articleList.html?sc_section_code=S1N1',
    scraperType: 'CHEERIO',
    isActive: true,
    priority: 1,
  },
  {
    id: 'safety1stnews',
    name: '세이프티퍼스트닷뉴스',
    category: 'MEDIA',
    url: 'https://www.safety1stnews.com/news/articleList.html?sc_section_code=S1N1&view_type=sm',
    scraperType: 'CHEERIO',
    isActive: true,
    priority: 1,
  },
  {
    id: 'anjunj',
    name: '안전저널',
    category: 'MEDIA',
    url: 'http://www.anjunj.com/news/articleList.html?sc_section_code=S1N1&view_type=sm',
    scraperType: 'CHEERIO',
    isActive: true,
    priority: 1,
  },

  // === 민간 연구 ===
  {
    id: 'oshri',
    name: '산업안전보건연구원',
    category: 'RESEARCH',
    url: 'https://oshri.kosha.or.kr/oshri/researcherNews/newsRelease.do',
    scraperType: 'CHEERIO',
    isActive: true,
    priority: 1,
  },
]

// 활성화된 소스만 가져오기
export function getActiveSources(): SourceDefinition[] {
  return BRIEFING_SOURCES.filter(source => source.isActive)
}

// 소스 ID로 조회
export function getSourceById(id: string): SourceDefinition | undefined {
  return BRIEFING_SOURCES.find(source => source.id === id)
}

// 카테고리별 소스 그룹화
export function getSourcesByCategory(): Record<SourceCategory, SourceDefinition[]> {
  const grouped: Record<SourceCategory, SourceDefinition[]> = {
    GOVERNMENT: [],
    LAW: [],
    MEDIA: [],
    RESEARCH: [],
  }

  for (const source of BRIEFING_SOURCES) {
    grouped[source.category].push(source)
  }

  return grouped
}
