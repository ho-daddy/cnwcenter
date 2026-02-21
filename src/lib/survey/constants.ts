import { QuestionType, SurveyStatus } from '@prisma/client'

// ─── 설문 상태 ───

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  DRAFT: '작성중',
  PUBLISHED: '배포중',
  CLOSED: '마감',
}

export const SURVEY_STATUS_COLORS: Record<SurveyStatus, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  PUBLISHED: { bg: 'bg-green-100', text: 'text-green-700' },
  CLOSED: { bg: 'bg-red-100', text: 'text-red-700' },
}

// ─── 질문 유형 ───

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  TEXT: '텍스트',
  NUMBER: '숫자',
  RADIO: '단일 선택',
  CHECKBOX: '다중 선택',
  RANGE: '범위 슬라이더',
  DROPDOWN: '드롭다운',
  TABLE: '표/그리드',
  RANKED_CHOICE: '순위 선택',
  CONSENT: '동의',
}

export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  TEXT: '자유 텍스트 입력 (한 줄 또는 여러 줄)',
  NUMBER: '숫자 입력 (최소/최대 설정 가능)',
  RADIO: '여러 선택지 중 하나만 선택',
  CHECKBOX: '여러 선택지에서 복수 선택 가능',
  RANGE: '슬라이더로 범위 내 값 선택',
  DROPDOWN: '드롭다운 메뉴에서 하나 선택',
  TABLE: '표 형태로 여러 항목 입력',
  RANKED_CHOICE: '선택지를 중요도 순으로 정렬',
  CONSENT: '개인정보 수집·이용 동의',
}

// 조건부 로직 연산자
export const CONDITION_OPERATOR_LABELS: Record<string, string> = {
  equals: '값이 같음',
  not_equals: '값이 다름',
  contains: '포함함 (다중선택)',
  not_contains: '포함하지 않음',
  any_of: '하나라도 포함',
  greater_than: '초과',
  less_than: '미만',
}
