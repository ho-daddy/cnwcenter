import { Prisma } from "@prisma/client"
import { randomUUID } from "crypto"

/**
 * "영업비밀" CAS 번호는 unique 키이지만 실제로는 여러 다른 화학물질을 가리킬 수 있는
 * placeholder 값이다. 한 제품에 영업비밀 성분이 2개 이상이거나, 다른 제품들 사이에서
 * unique 충돌이 발생하므로 매번 별도 row를 생성한다 (CAS에 UUID suffix).
 */
const SECRET_CAS = "영업비밀"

export async function resolveChemicalComponent(
  tx: Prisma.TransactionClient,
  comp: {
    casNumber: string
    name: string
    hazards?: string | null
    regulations?: string | null
  },
) {
  if (comp.casNumber === SECRET_CAS) {
    return tx.chemicalComponent.create({
      data: {
        casNumber: `${SECRET_CAS}-${randomUUID()}`,
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
