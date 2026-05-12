// 일괄 등록용 자유 형식 CSV/Excel 파싱
// - 헤더 키워드 휴리스틱으로 컬럼 자동 매핑
// - 점수(중대성)는 입력받지 않음 (서버에서 KOSHA + 룰로 산정)

export type FieldKey = 'name' | 'manufacturer' | 'description' | 'casNumber' | 'componentName' | 'concentration'

export interface ColumnMapping {
  /** 필드 → 컬럼 인덱스 (해당 없으면 누락) */
  name?: number
  manufacturer?: number
  description?: number
  casNumber?: number
  componentName?: number
  concentration?: number
}

export interface DetectResult {
  mapping: ColumnMapping
  /** 각 필드별 매칭 점수 (0~1). missing은 0 */
  fieldScores: Record<FieldKey, number>
  /** 전체 평균 confidence (필수 필드 기반) */
  confidence: number
}

export interface RawComponent {
  casNumber: string
  componentName: string
  concentration: string
}

export interface RawProduct {
  rowIndex: number  // 원본 1-indexed 행번호 (헤더 포함)
  name: string
  manufacturer: string
  description: string
  components: RawComponent[]
}

// ─── 키워드 사전 (소문자, 부분일치) ───
const FIELD_KEYWORDS: Record<FieldKey, string[]> = {
  name: ['제품명', '제품', '품명', '품목', 'product name', 'product', 'name', '이름'],
  manufacturer: ['제조사', '제조회사', '제조', '회사', '공급사', '메이커', 'manufacturer', 'maker', 'supplier', 'company'],
  description: ['설명', '용도', '비고', '내용', '제품설명', 'description', 'desc', 'use', 'usage', 'note', 'remark'],
  casNumber: ['cas 번호', 'cas번호', 'cas no', 'cas-no', 'cas', 'casrn', 'casno'],
  componentName: ['성분명', '성분', '화학물질명', '구성성분', 'component', 'ingredient', 'chemical name', 'substance'],
  concentration: ['함유량', '함량', '농도', '중량', '비율', 'concentration', 'content', '%', 'percent', 'wt%', 'weight'],
}

/** 헤더 셀 텍스트가 특정 필드 키워드와 매칭되는 점수 (0~1) */
function scoreFieldMatch(headerCell: string, field: FieldKey): number {
  const cell = headerCell.trim().toLowerCase()
  if (!cell) return 0
  const keywords = FIELD_KEYWORDS[field]
  let best = 0
  for (const kw of keywords) {
    const k = kw.toLowerCase()
    if (cell === k) return 1.0
    if (cell.includes(k)) {
      // 짧은 키워드일수록 가중치 낮춤 (오매칭 방지)
      const ratio = Math.min(1, k.length / cell.length)
      best = Math.max(best, 0.5 + ratio * 0.4)
    }
  }
  return best
}

/**
 * 헤더 행으로부터 컬럼 자동 매핑.
 * 휴리스틱: 각 (필드, 컬럼) 쌍의 매칭 점수를 매기고 그리디 할당.
 */
export function detectColumns(headers: string[]): DetectResult {
  const cellStrings = headers.map(h => String(h ?? '').trim())
  const fields: FieldKey[] = ['name', 'manufacturer', 'description', 'casNumber', 'componentName', 'concentration']

  // score matrix: fields x columns
  const scores: Array<{ field: FieldKey; col: number; score: number }> = []
  for (const f of fields) {
    for (let c = 0; c < cellStrings.length; c++) {
      const s = scoreFieldMatch(cellStrings[c], f)
      if (s > 0) scores.push({ field: f, col: c, score: s })
    }
  }
  scores.sort((a, b) => b.score - a.score)

  const mapping: ColumnMapping = {}
  const usedCols = new Set<number>()
  const usedFields = new Set<FieldKey>()
  const fieldScores: Record<FieldKey, number> = {
    name: 0, manufacturer: 0, description: 0, casNumber: 0, componentName: 0, concentration: 0,
  }
  for (const { field, col, score } of scores) {
    if (usedFields.has(field) || usedCols.has(col)) continue
    mapping[field] = col
    fieldScores[field] = score
    usedFields.add(field)
    usedCols.add(col)
  }

  // confidence = 필수 필드(name, casNumber, componentName) 평균
  const required: FieldKey[] = ['name', 'casNumber', 'componentName']
  const sum = required.reduce((a, f) => a + fieldScores[f], 0)
  const confidence = sum / required.length

  return { mapping, fieldScores, confidence }
}

/**
 * 헤더 행이라고 추정되는지 판정.
 * 첫 행에 알려진 키워드가 충분히 등장하면 헤더로 인식.
 */
export function looksLikeHeader(row: string[]): boolean {
  if (!row || row.length === 0) return false
  const fields: FieldKey[] = ['name', 'casNumber', 'componentName', 'concentration']
  let hits = 0
  for (const cell of row) {
    for (const f of fields) {
      if (scoreFieldMatch(String(cell ?? ''), f) > 0.5) {
        hits++
        break
      }
    }
  }
  return hits >= 2
}

/** 함유량 텍스트 정규화 */
function normalizeConcentration(val: string): string {
  if (!val) return ''
  const t = val.trim()
  if (!t) return ''
  const lower = t.toLowerCase()
  if (['모름', '미확인', 'unknown', 'n/a', 'na'].includes(lower)) return '모름'
  if (['영업비밀', 'trade secret', 'confidential', '비공개'].includes(lower)) return '영업비밀'
  return t
}

/** CAS 번호 형식 검증 (영업비밀은 통과) */
export function isValidCasNumber(cas: string): boolean {
  if (!cas) return false
  const t = cas.trim()
  if (t === '영업비밀') return true
  // CAS 형식: nnnnn-nn-n (또는 변형)
  return /^\d{1,7}-\d{2}-\d$/.test(t) || /^\d/.test(t)
}

/**
 * 매핑에 따라 데이터 행을 RawProduct 배열로 변환.
 * - 제품명 컬럼이 채워진 행 = 새 제품 시작 (단, (제품명, 제조사)가 같으면 기존 제품에 병합)
 * - 제품명 비어있고 CAS/성분명만 있는 행 = 직전 제품의 추가 성분
 * - 한 행에 제품 정보 + 성분이 함께 있으면 둘 다 처리
 */
export function parseRows(
  rows: (string | number | null | undefined)[][],
  mapping: ColumnMapping,
  startRowOffset = 2, // 헤더 행 다음부터 시작 (1-indexed)
): RawProduct[] {
  const products: RawProduct[] = []
  const keyMap = new Map<string, RawProduct>()  // (제품명|제조사) → 기존 제품 참조
  let current: RawProduct | null = null

  const get = (row: (string | number | null | undefined)[], idx: number | undefined): string => {
    if (idx === undefined || idx < 0 || idx >= row.length) return ''
    return String(row[idx] ?? '').trim()
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const productName = get(row, mapping.name)
    const cas = get(row, mapping.casNumber)
    const compName = get(row, mapping.componentName)

    if (productName) {
      const manufacturer = get(row, mapping.manufacturer)
      const description = get(row, mapping.description)
      const key = `${productName}|${manufacturer}`
      const existing = keyMap.get(key)
      if (existing) {
        // 동일 (제품명, 제조사) → 기존 제품에 병합
        current = existing
        if (!current.description && description) current.description = description
      } else {
        current = {
          rowIndex: i + startRowOffset,
          name: productName,
          manufacturer,
          description,
          components: [],
        }
        products.push(current)
        keyMap.set(key, current)
      }
      // 같은 행에 성분도 있으면 추가
      if (cas || compName) {
        current.components.push({
          casNumber: cas,
          componentName: compName,
          concentration: normalizeConcentration(get(row, mapping.concentration)),
        })
      }
    } else if (current && (cas || compName)) {
      current.components.push({
        casNumber: cas,
        componentName: compName,
        concentration: normalizeConcentration(get(row, mapping.concentration)),
      })
    }
  }

  return products
}

/** 모든 RawProduct에서 unique CAS 번호 추출 (영업비밀, 빈 값 제외) */
export function collectUniqueCasNumbers(products: RawProduct[]): string[] {
  const set = new Set<string>()
  for (const p of products) {
    for (const c of p.components) {
      const cas = c.casNumber.trim()
      if (cas && cas !== '영업비밀') set.add(cas)
    }
  }
  return Array.from(set)
}
