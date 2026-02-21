import type { ConditionalLogic } from '@/types/survey'

/**
 * 조건부 로직 평가: 질문의 conditionalLogic 조건이 충족되면 true (질문 표시)
 * conditionalLogic이 null이면 항상 표시
 */
export function evaluateConditions(
  conditionalLogic: ConditionalLogic | null | undefined,
  answers: Record<string, unknown>
): boolean {
  if (!conditionalLogic || !conditionalLogic.conditions || conditionalLogic.conditions.length === 0) {
    return true // 조건 없음 = 항상 표시
  }

  const results = conditionalLogic.conditions.map(condition => {
    const answer = answers[condition.questionId]
    if (answer === undefined || answer === null || answer === '') return false

    switch (condition.operator) {
      case 'equals':
        return String(answer) === String(condition.value)
      case 'not_equals':
        return String(answer) !== String(condition.value)
      case 'contains':
        // answer가 배열인 경우 (checkbox) 특정 값 포함 여부
        if (Array.isArray(answer)) return answer.includes(condition.value as string)
        return String(answer).includes(String(condition.value))
      case 'not_contains':
        if (Array.isArray(answer)) return !answer.includes(condition.value as string)
        return !String(answer).includes(String(condition.value))
      case 'any_of':
        // answer 배열에 condition.value 배열의 값이 하나라도 있는지
        if (Array.isArray(answer) && Array.isArray(condition.value)) {
          return condition.value.some(v => answer.includes(v))
        }
        return false
      case 'greater_than':
        return Number(answer) > Number(condition.value)
      case 'less_than':
        return Number(answer) < Number(condition.value)
      default:
        return false
    }
  })

  return conditionalLogic.logicType === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean)
}
