import { Prisma } from "@prisma/client"
import { randomUUID } from "crypto"

/**
 * CAS Registry Number는 본래 "숫자-숫자-숫자" 형식의 식별자다.
 * 실제 MSDS에는 CAS 자리에 "영업비밀", "영업 비밀", "해당없음", "미확인", "모름",
 * "Trade Secret", "Confidential", "N/A" 등 다양한 자유 텍스트가 들어오는 경우가 많다.
 *
 * 이런 비-CAS 값은 모두 unique 충돌의 원인이 되므로 (한 제품 안에 같은 값 2개면 즉시 실패),
 * 숫자/하이픈으로만 구성되지 않은 값은 일괄적으로 placeholder ("미확인-<uuid>")로
 * 변환하여 매번 별도 row를 만든다. 화면 표시 단계에서는 "미확인" 부분만 노출하면 된다.
 */
const PLACEHOLDER_PREFIX = "미확인"

/** CAS Registry Number 형식 검증: 숫자와 하이픈으로만 구성된 비어있지 않은 문자열 */
function isValidCasNumber(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && /^[\d-]+$/.test(trimmed)
}

export async function resolveChemicalComponent(
  tx: Prisma.TransactionClient,
  comp: {
    casNumber: string
    name: string
    hazards?: string | null
    regulations?: string | null
  },
) {
  // CAS 형식이 아닌 값(영업비밀·미확인·N/A 등)은 매번 별도 row로 생성
  if (!isValidCasNumber(comp.casNumber)) {
    return tx.chemicalComponent.create({
      data: {
        casNumber: `${PLACEHOLDER_PREFIX}-${randomUUID().slice(0, 8)}`,
        name: comp.name,
        hazards: comp.hazards || null,
        regulations: comp.regulations || null,
      },
    })
  }

  // 정상 CAS는 기존 upsert (같은 CAS 성분 정보 공유)
  return tx.chemicalComponent.upsert({
    where: { casNumber: comp.casNumber.trim() },
    create: {
      casNumber: comp.casNumber.trim(),
      name: comp.name,
      hazards: comp.hazards || null,
      regulations: comp.regulations || null,
    },
    update: {
      name: comp.name,
      hazards: comp.hazards || null,
      regulations: comp.regulations || null,
    },
  })
}
