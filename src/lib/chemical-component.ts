import { Prisma } from "@prisma/client"
import { randomUUID } from "crypto"

/**
 * "영업비밀" CAS 번호는 unique 키지만 실제로는 여러 다른 화학물질을 가리키는
 * placeholder 값이다. 한 제품에 영업비밀 성분이 2개 이상이거나, 다른 제품들 사이에서
 * unique 충돌이 발생하므로 매번 별도 row를 생성한다 (CAS에 UUID suffix).
 *
 * MSDS PDF에서 추출되는 표기는 변형이 많다: "영업비밀", "영업 비밀",
 * "Trade Secret", "Confidential" 등. 공백·대소문자·일반적 영문 표현까지 잡는다.
 */
const SECRET_CAS_PATTERNS: RegExp[] = [
  /^영업\s*비밀$/,
  /^trade\s*secret$/i,
  /^confidential$/i,
  /^proprietary$/i,
]

function isSecretCas(cas: string): boolean {
  const trimmed = cas.trim()
  return SECRET_CAS_PATTERNS.some((re) => re.test(trimmed))
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
  if (isSecretCas(comp.casNumber)) {
    return tx.chemicalComponent.create({
      data: {
        // 영업비밀 성분도 검색/표시 시 일관성을 위해 정규화된 형식("영업비밀-uuid")으로 저장
        casNumber: `영업비밀-${randomUUID()}`,
        name: comp.name,
        hazards: comp.hazards || null,
        regulations: comp.regulations || null,
      },
    })
  }

  return tx.chemicalComponent.upsert({
    where: { casNumber: comp.casNumber },
    create: {
      casNumber: comp.casNumber,
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
