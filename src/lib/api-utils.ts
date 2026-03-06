import { NextRequest, NextResponse } from 'next/server'

/**
 * API 에러 클래스 - 상태코드와 메시지를 함께 전달
 */
export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

/**
 * 안전한 JSON body 파싱. 잘못된 형식일 경우 ApiError(400) throw.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseJsonBody<T = any>(req: NextRequest): Promise<T> {
  try {
    return await req.json()
  } catch {
    throw new ApiError(400, '잘못된 요청 형식입니다.')
  }
}

/**
 * 페이지네이션 파라미터 파싱. page/limit 쿼리 파라미터에서 추출.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number } = {}
) {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? String(defaults.page ?? 1)))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? String(defaults.limit ?? 20))))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

/**
 * Enum 값 검증. 유효하지 않은 값이면 ApiError(400) throw.
 * null/undefined 입력 시 null 반환.
 */
export function validateEnum<T extends Record<string, string>>(
  enumObj: T,
  value: string | null | undefined,
  fieldName: string
): T[keyof T] | null {
  if (!value) return null
  if (!Object.values(enumObj).includes(value as T[keyof T])) {
    throw new ApiError(400, `유효하지 않은 ${fieldName} 값입니다: ${value}`)
  }
  return value as T[keyof T]
}

/**
 * Prisma 에러를 적절한 HTTP 응답으로 변환.
 * 알 수 없는 에러는 re-throw.
 */
export function handlePrismaError(e: unknown): NextResponse {
  const code = (e as { code?: string })?.code
  if (code === 'P2002') return NextResponse.json({ error: '이미 존재하는 데이터입니다.' }, { status: 409 })
  if (code === 'P2025') return NextResponse.json({ error: '데이터를 찾을 수 없습니다.' }, { status: 404 })
  throw e
}

/**
 * 파일 업로드 검증 (타입 + 크기)
 */
export function validateFile(
  file: File,
  options: { allowedTypes: string[]; maxSizeMB: number }
) {
  const maxBytes = options.maxSizeMB * 1024 * 1024
  if (!options.allowedTypes.includes(file.type)) {
    throw new ApiError(400, `허용되지 않는 파일 형식입니다: ${file.name}`)
  }
  if (file.size > maxBytes) {
    throw new ApiError(400, `파일 크기가 ${options.maxSizeMB}MB를 초과합니다: ${file.name}`)
  }
}

/**
 * ApiError를 catch하여 적절한 HTTP 응답으로 변환.
 * 일반 에러는 500으로 처리.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }
  console.error('[API Error]', error)
  return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
}
