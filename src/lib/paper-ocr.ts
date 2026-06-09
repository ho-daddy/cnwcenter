// 종이설문 OCR 공통 유틸 — survey-ocr(FastAPI)에서 포팅
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'
import { getAnthropicClient } from '@/lib/anthropic'

export const PAPER_OCR_DIR = path.join(os.tmpdir(), 'paper-ocr')
export const PAPER_OCR_MODEL = 'claude-sonnet-4-6'

export async function ensurePaperOcrDir(): Promise<void> {
  await fs.mkdir(PAPER_OCR_DIR, { recursive: true })
}

export function paperOcrPath(sessionId: string): string {
  // 경로 조작 방지: 영숫자만 허용
  const safe = sessionId.replace(/[^a-zA-Z0-9]/g, '')
  return path.join(PAPER_OCR_DIR, `${safe}.pdf`)
}

// ── 설문 구조 타입 ────────────────────────────────────────────
export interface SurveyQuestion {
  id: string
  questionCode: string
  questionText: string
  questionType: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any
  required: boolean
  sortOrder: number
}

export interface SurveySection {
  id: string
  title: string
  sortOrder: number
  questions: SurveyQuestion[]
}

export interface SurveyStructure {
  id: string
  title: string
  sections: SurveySection[]
}

export interface OcrResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answers: Record<string, any>
  respondentName: string | null
  pageQuestions?: Record<string, string[]>
  _raw?: string
}

// ── questionCode → questionId 매핑 ────────────────────────────
export function buildCodeToId(structure: SurveyStructure): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const section of structure.sections ?? []) {
    for (const q of section.questions ?? []) {
      if (q.questionCode) mapping[q.questionCode] = q.id
    }
  }
  return mapping
}

// ── OCR 프롬프트 빌드 (server.py build_ocr_prompt 포팅) ───────
export function buildOcrPrompt(structure: SurveyStructure): string {
  const lines: string[] = [
    '다음은 종이 설문지 스캔입니다. 아래 설문 구조에 따라 각 질문의 응답을 추출해주세요.',
    '',
    '## 설문 구조',
  ]
  for (const section of structure.sections ?? []) {
    lines.push(`\n### ${section.title}`)
    for (const q of section.questions ?? []) {
      let opts = ''
      const o = q.options
      if (o) {
        if (Array.isArray(o)) {
          opts = ' 보기: ' + o.map((x) => x.label ?? x.value ?? '').join(', ')
        } else if (typeof o === 'object' && Array.isArray(o.choices)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (q.questionType === 'RANKED_CHOICE') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            opts = ' 보기(번호\u2192레이블): ' + o.choices.map((x: any, i: number) => (i + 1) + '. ' + (x.label ?? '')).join(', ')
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            opts = ' 보기: ' + o.choices.map((x: any) => x.label ?? '').join(', ')
          }
        }
      }
      lines.push(`- [${q.questionCode}] ${q.questionText} (${q.questionType})${opts}`)
    }
  }
  lines.push(
    '',
    '## 응답 추출 규칙',
    '- 반드시 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.',
    '- 형식: {"answers": {"questionCode": value, ...}, "respondentName": "이름", "pageQuestions": {"1": ["code1",...], "2": [...], ...}}',
    '- pageQuestions: 각 페이지(1부터 시작)에서 확인한 questionCode 목록. 좌우 연동에 사용됨.',
    '- 읽을 수 없거나 불명확한 항목은 null로 표시',
    '- RADIO: 선택된 값의 value 문자열. 아무것도 선택 안 됐으면 null',
    '- CHECKBOX: 선택된 value 문자열의 배열. 없으면 빈 배열 []',
    '- DROPDOWN: 선택된 value 문자열',
    '- NUMBER: 숫자 (정수 또는 소수). 빈 칸이면 null',
    '- TEXT: 텍스트 문자열. 빈 칸이면 null',
    '- CONSENT: true 또는 false (서명/동의 여부)',
    '- RANGE: 선택된 숫자값 (정수)',
    '- RANKED_CHOICE: 반드시 배열로 반환. 종이의 1순위·2순위·3순위 칸에 적힌 번호를 확인하고, 위 설문 구조의 "보기(번호→레이블)" 목록에서 해당 번호의 레이블 문자열을 찾아 순서대로 반환. 예: 종이에 2, 1, 4라고 적혔으면 [2번 레이블, 1번 레이블, 4번 레이블]. 인식 불가 항목은 건너뜀. 전혀 모르면 null',
    '- 표 형태(근골격계 증상 등): 각 부위×항목 조합을 별도 questionCode 키로 평탄화하여 반환',
  )
  return lines.join('\n')
}

function extractJson(text: string): OcrResult {
  let t = text.trim()
  if (t.includes('```json')) {
    t = t.split('```json')[1].split('```')[0].trim()
  } else if (t.includes('```')) {
    t = t.split('```')[1].split('```')[0].trim()
  }
  try {
    const parsed = JSON.parse(t)
    return {
      answers: parsed.answers ?? {},
      respondentName: parsed.respondentName ?? null,
      pageQuestions: parsed.pageQuestions ?? {},
    }
  } catch {
    return { answers: {}, respondentName: null, _raw: text }
  }
}

// ── PDF에서 특정 페이지 범위만 추출 (pdf-lib, 1-indexed 입력) ──
export async function extractPageRange(
  pdfBuffer: Buffer,
  startPage: number,
  endPage: number
): Promise<Buffer> {
  const srcDoc = await PDFDocument.load(pdfBuffer)
  const total = srcDoc.getPageCount()
  // 1-indexed 입력을 0-indexed로 변환하고 범위 보정
  const from = Math.max(0, startPage - 1)
  const to = Math.min(total - 1, endPage - 1)
  const indices: number[] = []
  for (let i = from; i <= to; i++) indices.push(i)
  const newDoc = await PDFDocument.create()
  const pages = await newDoc.copyPages(srcDoc, indices)
  pages.forEach((p) => newDoc.addPage(p))
  return Buffer.from(await newDoc.save())
}

// ── 단일 응답자 OCR (Claude PDF document 사용) ────────────────
// 전체 PDF 버퍼를 받아 해당 응답자 페이지 범위만 추출하여 전송 → 토큰 절감
export async function ocrSurvey(
  pdfBuffer: Buffer,
  structure: SurveyStructure,
  startPage: number,
  endPage: number
): Promise<OcrResult> {
  // 해당 응답자 페이지만 잘라낸 작은 PDF를 만들어 전송
  const slice = await extractPageRange(pdfBuffer, startPage, endPage)
  const pdfBase64 = slice.toString('base64')
  // 잘라낸 PDF는 1페이지부터 시작하므로 프롬프트의 페이지 번호도 1부터로 재계산
  const pageCount = endPage - startPage + 1
  const prompt = `이 PDF는 한 응답자의 설문지 ${pageCount}페이지(1~${pageCount})입니다. 모든 페이지를 분석해주세요.\n\n${buildOcrPrompt(structure)}`
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: PAPER_OCR_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
          },
          { type: 'text', text: prompt },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
      },
    ],
  })
  const block = response.content[0]
  const text = block.type === 'text' ? block.text : ''
  return extractJson(text)
}

export async function loadStructure(surveyId: string, prisma: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  survey: { findUnique: (args: any) => Promise<any> }
}): Promise<SurveyStructure | null> {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: { questions: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  })
  return survey as SurveyStructure | null
}
