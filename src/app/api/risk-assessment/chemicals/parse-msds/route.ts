import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { getAnthropicClient } from '@/lib/anthropic'

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'rtf']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const TEXT_SPARSE_THRESHOLD = 200 // chars

interface MsdsComponent {
  casNumber: string
  name: string
  concentration: string
}

interface MsdsExtractedData {
  productName: string
  manufacturer: string
  description: string
  components: MsdsComponent[]
  warnings: string[]
}

const MSDS_SYSTEM_PROMPT = `당신은 한국 MSDS(물질안전보건자료) 문서 분석 전문가입니다.
MSDS 문서에서 다음 정보를 정확하게 추출하여 JSON 형식으로 반환합니다.

추출 대상:
1. 제품명 (Section 1 "제품명" 또는 "화학제품과 회사에 관한 정보")
2. 제조사/공급자명 (Section 1 "공급자" 또는 "제조자/수입자")
3. 제품 용도/설명 (Section 1 "제품의 권고 용도" 또는 "용도")
4. 구성성분 목록 (Section 3 "구성성분의 명칭 및 함유량"):
   - CAS 번호 (예: 67-64-1)
   - 화학물질명 (한글 또는 영문)
   - 함유량/농도 (백분율. 범위값 포함. 예: "10~30", "85", "비공개", "영업비밀")

응답 규칙:
- 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요.
- CAS 번호는 "숫자-숫자-숫자" 형식으로 정규화하세요.
- 함유량이 범위(예: 10~30%)인 경우 그대로 문자열로 반환하세요.
- 함유량이 "비공개", "영업비밀", "미확인" 등이면 그대로 반환하세요.
- 추출이 불확실한 항목이 있으면 warnings 배열에 설명을 추가하세요.
- 성분을 찾을 수 없으면 components를 빈 배열로 반환하세요.

응답 JSON 형식:
{
  "productName": "제품명",
  "manufacturer": "제조사명",
  "description": "제품 용도/설명",
  "components": [
    {
      "casNumber": "CAS번호",
      "name": "성분명",
      "concentration": "함유량"
    }
  ],
  "warnings": ["불확실한 사항 설명"]
}`

// ─── Main Handler ────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'MSDS 파일이 필요합니다.' }, { status: 400 })
  }

  // 확장자 확인
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: 'PDF, DOCX, DOC, RTF 파일만 지원합니다.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: '파일 크기는 20MB 이하여야 합니다.' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    let result: MsdsExtractedData

    if (ext === 'pdf') {
      result = await processPdf(buffer)
    } else if (ext === 'docx') {
      result = await processDocx(buffer)
    } else {
      // doc, rtf — 실제 파일 매직 바이트로 포맷 감지
      result = await processDocOrRtf(buffer)
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[MSDS Parse Error]', err)
    const msg = err instanceof Error ? err.message : 'MSDS 파일 분석에 실패했습니다.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── PDF Processing ──────────────────────────────────
async function processPdf(buffer: Buffer): Promise<MsdsExtractedData> {
  // Step 1: 텍스트 추출 시도
  let extractedText = ''
  try {
    // pdf-parse v1 — CommonJS
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const pdfData = await pdfParse(buffer)
    extractedText = pdfData.text || ''
  } catch {
    extractedText = ''
  }

  const meaningfulLength = extractedText.replace(/\s+/g, '').length

  if (meaningfulLength < TEXT_SPARSE_THRESHOLD) {
    // 이미지 PDF → Claude document vision (OCR)
    return await extractWithClaudeDocument(buffer)
  } else {
    // 텍스트 PDF → Claude text (저렴)
    return await extractWithClaudeText(extractedText)
  }
}

// ─── DOCX Processing ─────────────────────────────────
async function processDocx(buffer: Buffer): Promise<MsdsExtractedData> {
  let text = ''
  try {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.extractRawText({ buffer })
    text = result.value || ''
  } catch {
    throw new Error('DOCX 파일에서 텍스트를 추출할 수 없습니다.')
  }

  if (text.replace(/\s+/g, '').length < TEXT_SPARSE_THRESHOLD) {
    throw new Error('문서에서 충분한 텍스트를 추출할 수 없습니다.')
  }

  return await extractWithClaudeText(text)
}

// ─── DOC/RTF Processing ──────────────────────────────
async function processDocOrRtf(buffer: Buffer): Promise<MsdsExtractedData> {
  const header = buffer.subarray(0, 5).toString('ascii')

  // RTF 파일 감지 ("{\\rtf")
  if (header.startsWith('{\\rtf') || header.startsWith('{\\rt')) {
    const text = extractTextFromRtf(buffer)
    if (text.replace(/\s+/g, '').length >= TEXT_SPARSE_THRESHOLD) {
      return await extractWithClaudeText(text)
    }
    throw new Error('RTF 문서에서 충분한 텍스트를 추출할 수 없습니다.')
  }

  // OLE Compound Document (실제 .doc) 감지 — 0xD0CF11E0
  if (buffer[0] === 0xD0 && buffer[1] === 0xCF) {
    // mammoth 시도
    try {
      const mammoth = (await import('mammoth')).default
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value || ''
      if (text.replace(/\s+/g, '').length >= TEXT_SPARSE_THRESHOLD) {
        return await extractWithClaudeText(text)
      }
    } catch {
      // mammoth 실패 시 무시
    }
    throw new Error(
      '.doc 파일의 텍스트 추출에 실패했습니다. PDF 또는 DOCX로 변환 후 다시 시도해주세요.'
    )
  }

  throw new Error('지원하지 않는 파일 형식입니다. PDF, DOCX, DOC(RTF) 파일을 사용해주세요.')
}

// ─── RTF 텍스트 추출 ─────────────────────────────────
function extractTextFromRtf(buffer: Buffer): string {
  // RTF를 디코딩하여 텍스트만 추출
  const raw = buffer.toString('binary')
  const chunks: string[] = []
  let depth = 0
  let inGroup = false
  let skipGroup = false
  let i = 0

  while (i < raw.length) {
    const ch = raw[i]

    if (ch === '{') {
      depth++
      // 특정 그룹 (헤더, 폰트테이블 등) 건너뛰기
      const ahead = raw.substring(i + 1, i + 20)
      if (ahead.startsWith('\\fonttbl') || ahead.startsWith('\\colortbl') ||
          ahead.startsWith('\\stylesheet') || ahead.startsWith('\\*')) {
        skipGroup = true
        inGroup = true
      }
      i++
      continue
    }

    if (ch === '}') {
      depth--
      if (inGroup && !skipGroup) inGroup = false
      if (skipGroup) skipGroup = false
      i++
      continue
    }

    if (skipGroup) { i++; continue }

    if (ch === '\\') {
      i++
      if (i >= raw.length) break

      // 특수 문자 처리
      if (raw[i] === '\\' || raw[i] === '{' || raw[i] === '}') {
        chunks.push(raw[i])
        i++
        continue
      }

      // 제어어 읽기
      let ctrl = ''
      while (i < raw.length && /[a-zA-Z]/.test(raw[i])) {
        ctrl += raw[i]
        i++
      }

      // 숫자 파라미터
      let param = ''
      if (i < raw.length && /[-\d]/.test(raw[i])) {
        while (i < raw.length && /[-\d]/.test(raw[i])) {
          param += raw[i]
          i++
        }
      }

      // 구분 공백 건너뛰기
      if (i < raw.length && raw[i] === ' ') i++

      // 줄바꿈 제어어
      if (ctrl === 'par' || ctrl === 'line') {
        chunks.push('\n')
      } else if (ctrl === 'tab') {
        chunks.push('\t')
      } else if (ctrl === 'u') {
        // 유니코드 문자
        const code = parseInt(param)
        if (!isNaN(code)) {
          chunks.push(code < 0 ? String.fromCharCode(code + 65536) : String.fromCharCode(code))
          // 유니코드 대체 문자 건너뛰기 (보통 '?')
          if (i < raw.length && raw[i] === '?') i++
        }
      }
      // 한글 (코드페이지 949) 바이트 시퀀스: \'XX
      else if (ctrl === "'") {
        // backtrack: '\'' 처리 — i가 이미 ctrl 읽기 후이므로 재조정
      }

      continue
    }

    // 일반 텍스트
    chunks.push(ch)
    i++
  }

  // hex 바이트 시퀀스 \'XX 처리를 위해 원본에서 다시 파싱
  const hexResult = decodeRtfHexSequences(raw)
  if (hexResult.length > chunks.join('').length) {
    return hexResult
  }

  return chunks.join('')
}

function decodeRtfHexSequences(rtf: string): string {
  // 모든 RTF 제어어 제거하고 텍스트만 추출하는 간단한 접근
  let result = rtf

  // 중괄호 안의 제어 그룹 제거 (예: {\fonttbl ...}, {\colortbl ...})
  result = result.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|pict|blipuid)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')

  // 유니코드 처리
  result = result.replace(/\\u(-?\d+)\??/g, (_, code) => {
    const n = parseInt(code)
    return String.fromCharCode(n < 0 ? n + 65536 : n)
  })

  // \'XX 한글 바이트 처리 (EUC-KR 코드페이지 949)
  // 연속된 \'XX 시퀀스를 Buffer로 변환
  const hexPairs: number[] = []
  const textParts: string[] = []
  let lastEnd = 0

  const hexRegex = /((?:\\'[0-9a-fA-F]{2})+)/g
  let match
  while ((match = hexRegex.exec(result)) !== null) {
    // hex 시퀀스 앞의 텍스트
    if (match.index > lastEnd) {
      if (hexPairs.length > 0) {
        textParts.push(Buffer.from(hexPairs).toString('euc-kr'))
        hexPairs.length = 0
      }
      textParts.push(result.substring(lastEnd, match.index))
    }
    // hex 바이트 수집
    const seq = match[1]
    const bytes = seq.match(/\\'([0-9a-fA-F]{2})/g) || []
    for (const b of bytes) {
      hexPairs.push(parseInt(b.substring(2), 16))
    }
    lastEnd = match.index + match[0].length
  }
  if (hexPairs.length > 0) {
    textParts.push(Buffer.from(hexPairs).toString('euc-kr'))
  }
  if (lastEnd < result.length) {
    textParts.push(result.substring(lastEnd))
  }

  let decoded = textParts.join('')

  // 나머지 RTF 제어어 제거
  decoded = decoded.replace(/\\[a-z]+[-]?\d*\s?/g, '')
  decoded = decoded.replace(/[{}]/g, '')
  decoded = decoded.replace(/\r\n/g, '\n')
  // 연속 공백/빈줄 정리
  decoded = decoded.replace(/\n{3,}/g, '\n\n')

  return decoded.trim()
}

// ─── Claude: Text mode (저렴) ────────────────────────
async function extractWithClaudeText(text: string): Promise<MsdsExtractedData> {
  const client = getAnthropicClient()

  // 매우 긴 문서는 앞부분만 (Section 1~3은 보통 앞쪽에 위치)
  const truncated = text.length > 30000
    ? text.slice(0, 30000) + '\n...(이하 생략)'
    : text

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: MSDS_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `다음은 MSDS(물질안전보건자료) 문서에서 추출한 텍스트입니다. 구조화된 정보를 추출해주세요.\n\n${truncated}`,
    }],
  })

  return parseMsdsResponse(response)
}

// ─── Claude: Document vision mode (OCR) ──────────────
async function extractWithClaudeDocument(buffer: Buffer): Promise<MsdsExtractedData> {
  const client = getAnthropicClient()
  const base64Data = buffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: MSDS_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: '이 MSDS(물질안전보건자료) 문서에서 구조화된 정보를 추출해주세요.',
        },
      ],
    }],
  })

  return parseMsdsResponse(response)
}

// ─── Response Parser ─────────────────────────────────
function parseMsdsResponse(response: { content: Array<{ type: string; text?: string }> }): MsdsExtractedData {
  const content = response.content[0]
  if (content.type !== 'text' || !content.text) {
    throw new Error('AI에서 예상치 못한 응답 형식을 받았습니다.')
  }

  let jsonText = content.text.trim()

  // 코드 블록 감싸기 처리
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1]
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('MSDS 문서에서 정보를 추출할 수 없습니다. 다른 형식의 파일을 시도해주세요.')
  }

  return {
    productName: String(parsed.productName || ''),
    manufacturer: String(parsed.manufacturer || ''),
    description: String(parsed.description || ''),
    components: Array.isArray(parsed.components)
      ? (parsed.components as Record<string, unknown>[]).map(c => ({
          casNumber: String(c.casNumber || '').trim(),
          name: String(c.name || '').trim(),
          concentration: String(c.concentration || '').trim(),
        }))
      : [],
    warnings: Array.isArray(parsed.warnings)
      ? (parsed.warnings as string[])
      : [],
  }
}
