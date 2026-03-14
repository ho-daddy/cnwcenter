// 아카이브 데이터 타입
export type ArchiveDataType =
  | 'MUSCULOSKELETAL'
  | 'RISK_ASSESSMENT'
  | 'RISK_HAZARD'
  | 'RISK_IMPROVEMENT'
  | 'ELEMENT_WORK'

export const ARCHIVE_DATA_TYPE_LABELS: Record<ArchiveDataType, string> = {
  MUSCULOSKELETAL: '근골조사',
  RISK_ASSESSMENT: '위험성평가',
  RISK_HAZARD: '유해위험요인',
  RISK_IMPROVEMENT: '개선이력',
  ELEMENT_WORK: '요소작업',
}

export const ARCHIVE_REASON_LABELS: Record<string, string> = {
  '조직 단위 삭제': '조직 삭제',
  '직접 삭제': '직접 삭제',
}
