import { QuestionType, SurveyStatus } from '@prisma/client'

// ─── 조건부 로직 ───

export interface Condition {
  questionId: string  // questionCode of trigger question
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'any_of' | 'greater_than' | 'less_than'
  value: string | string[] | number | boolean
}

export interface ConditionalLogic {
  conditions: Condition[]
  logicType: 'AND' | 'OR'
}

// ─── 질문 옵션 ───

export interface QuestionOption {
  value: string
  label: string
}

export interface TextOptions {
  multiline?: boolean
  placeholder?: string
}

export interface NumberOptions {
  min?: number
  max?: number
  unit?: string
  placeholder?: string
}

export interface RangeOptions {
  min: number
  max: number
  step: number
  unit?: string
}

export interface TableOptions {
  columns: { key: string; label: string }[]
  rowCount: number
  rowLabels?: string[]
}

export interface RankedChoiceOptions {
  choices: QuestionOption[]
  rankCount: number
}

// ─── API 응답 타입 ───

export interface SurveyListItem {
  id: string
  title: string
  year: number
  purpose: string | null
  status: SurveyStatus
  accessToken: string | null
  workplace: { id: string; name: string } | null
  _count: { responses: number; sections: number }
  createdBy: { name: string | null }
  createdAt: string
  publishedAt: string | null
}

export interface SurveyDetail {
  id: string
  title: string
  description: string | null
  year: number
  purpose: string | null
  status: SurveyStatus
  accessToken: string | null
  workplaceId: string | null
  workplace: { id: string; name: string } | null
  templateId: string | null
  sections: SurveySectionDetail[]
  _count: { responses: number }
  createdAt: string
  publishedAt: string | null
}

export interface SurveySectionDetail {
  id: string
  title: string
  description: string | null
  sortOrder: number
  questions: SurveyQuestionDetail[]
}

export interface SurveyQuestionDetail {
  id: string
  questionCode: string | null
  questionText: string
  questionType: QuestionType
  required: boolean
  sortOrder: number
  options: unknown
  conditionalLogic: ConditionalLogic | null
}

// ─── 템플릿 구조 ───

export interface TemplateQuestion {
  questionCode: string
  questionText: string
  questionType: QuestionType
  required: boolean
  sortOrder: number
  options: unknown
  conditionalLogic: ConditionalLogic | null
}

export interface TemplateSection {
  title: string
  description: string | null
  sortOrder: number
  questions: TemplateQuestion[]
}

export interface TemplateStructure {
  sections: TemplateSection[]
}

export interface SurveyTemplateItem {
  id: string
  name: string
  description: string | null
  isDefault: boolean
}

// ─── 분석 ───

export interface QuestionStats {
  questionCode: string | null
  questionText: string
  questionType: QuestionType
  responseCount: number
  data: Record<string, number> | { min: number | null; max: number | null; avg: number | null; median: number | null } | null
}

export interface SurveyAnalytics {
  totalResponses: number
  completedResponses: number
  questionStats: Record<string, QuestionStats>
}
