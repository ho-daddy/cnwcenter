import type { ConditionalLogic } from '@/types/survey'
import { evaluateConditions } from './conditional-logic'

// 가시성 판정에 필요한 최소 정보만 담은 형식 (Prisma 모델, 페이지 타입 모두 호환)
interface VisibilityQuestion {
  id: string
  questionCode: string | null
  conditionalLogic: unknown
}

interface VisibilitySection {
  questions: VisibilityQuestion[]
}

interface VisibilityAnswer {
  questionId: string
  value: unknown
}

/**
 * 응답의 answer 배열에서 가시성 false인 답변을 제외한다.
 *
 * 안전성 정책(응답 수정 시 stale 답변을 DB에 보존)으로 인해 DB에는
 * conditionalLogic상 가시성 false인 stale 답변이 남을 수 있다.
 * 분석/내보내기/표시 모든 소비처는 이 헬퍼로 통과시킨 결과만 사용해야 한다.
 *
 * 평가 기준: 같은 응답 내 다른 답변(questionCode 기반)의 값을 기준으로
 * 각 질문의 conditionalLogic을 평가한다 — 공개 설문 페이지와 동일.
 */
export function filterVisibleAnswers<T extends VisibilityAnswer>(
  answers: T[],
  sections: VisibilitySection[],
): T[] {
  // 질문 정보 인덱싱 (questionId → 질문)
  const questionById = new Map<string, VisibilityQuestion>()
  for (const sec of sections) {
    for (const q of sec.questions) {
      questionById.set(q.id, q)
    }
  }

  // 같은 응답의 모든 답변을 questionCode 키로 모음 (조건부 평가용)
  const answersByCode: Record<string, unknown> = {}
  for (const a of answers) {
    const q = questionById.get(a.questionId)
    if (q?.questionCode) answersByCode[q.questionCode] = a.value
  }

  return answers.filter(a => {
    const q = questionById.get(a.questionId)
    // 질문 메타가 없으면(고아 answer 등) 보수적으로 보존
    if (!q) return true
    return evaluateConditions(q.conditionalLogic as ConditionalLogic | null, answersByCode)
  })
}
