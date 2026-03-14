# 삭제 데이터 관리 시스템 설계 문서

> 작성일: 2026-03-14
> 상태: 검토 대기

---

## 1. 현재 상태 분석

### 1.1 삭제 경로별 현황

| 삭제 경로 | 대상 데이터 | 백업 | 상태 |
|-----------|------------|------|------|
| 조직 단위 삭제 → 근골조사 | MusculoskeletalAssessment + 하위 전체 | ✅ ArchivedAssessment (JSON) | 정상 |
| 조직 단위 삭제 → 위험성평가 | RiskAssessmentCard + 하위 전체 | ❌ 없음 | **버그: 처리 누락** |
| 근골조사 직접 삭제 | MusculoskeletalAssessment | ❌ 없음 | 데이터 소실 |
| 위험성평가 카드 직접 삭제 | RiskAssessmentCard + Hazard + Improvement | ❌ 없음 | 데이터 소실 |
| 위험요인 직접 삭제 | RiskHazard + Photo + Improvement | ❌ 없음 | 데이터 소실 |
| 개선이력 직접 삭제 | RiskImprovementRecord + Photo + File | ❌ 없음 | 데이터 소실 |
| 요소작업 직접 삭제 | ElementWork + BodyPartScore | ❌ 없음 | 데이터 소실 |
| 아카이브 삭제 | ArchivedAssessment | ❌ 없음 | 영구 소실 |

### 1.2 Cascade 관계도

```
RiskAssessmentCard
├── RiskCardPhoto (Cascade)
└── RiskHazard (Cascade)
    ├── RiskHazardPhoto (Cascade) + 물리파일 삭제
    └── RiskImprovementRecord (Cascade)
        ├── RiskImprovementPhoto (Cascade)
        └── RiskImprovementFile (Cascade)

MusculoskeletalAssessment
├── ElementWork (Cascade)
│   ├── BodyPartScore (Cascade)
│   ├── WorkMeasurement (Cascade)
│   └── MSurveyImprovement (SetNull → 고아화)
├── MSurveyImprovement (Cascade)
└── MSurveyAttachment (Cascade)
```

### 1.3 발견된 버그

**조직 단위 삭제 시 RiskAssessmentCard 미처리**

`src/app/api/workplaces/[id]/organizations/[orgId]/units/[unitId]/route.ts`에서:
- MusculoskeletalAssessment → 아카이브 후 삭제 ✅
- RiskAssessmentCard → **아무 처리 없음** ❌

RiskAssessmentCard의 FK(`organizationUnitId`)에 `onDelete` 설정이 없어서, 조직 단위 삭제 시 FK 제약 위반 에러가 발생하거나 고아 레코드가 남을 수 있음.

---

## 2. 아키텍처 옵션 비교

### 옵션 A: 단일 테이블 (ArchivedAssessment 확장)

기존 `ArchivedAssessment` 테이블에 `dataType` 필드를 추가하여 근골조사/위험성평가 모두 수용.

```prisma
model ArchivedAssessment {
  id                   String   @id @default(cuid())
  workplaceId          String
  workplace            Workplace @relation(...)

  dataType             String   // "MUSCULOSKELETAL" | "RISK_ASSESSMENT"
  unitName             String
  unitPath             String
  assessmentData       Json     // 전체 데이터 스냅샷
  year                 Int
  assessmentType       String
  originalAssessmentId String
  archivedAt           DateTime @default(now())
  archivedReason       String?  // "조직 단위 삭제" | "직접 삭제"
  deletedById          String?  // 삭제한 사용자
}
```

**JSON 구조 예시 (위험성평가):**
```json
{
  "card": {
    "id": "...", "year": 2025, "evaluationType": "REGULAR",
    "workerName": "...", "workDescription": "...",
    "photos": [{ "photoPath": "...", "photoType": "work_photo" }]
  },
  "hazards": [{
    "hazardCategory": "ACCIDENT", "hazardFactor": "...",
    "severityScore": 3, "likelihoodScore": 4, "riskScore": 12,
    "photos": [{ "photoPath": "..." }],
    "improvements": [{
      "status": "COMPLETED", "improvementContent": "...",
      "photos": [], "files": []
    }]
  }]
}
```

| 장점 | 단점 |
|------|------|
| 기존 테이블 재사용, 마이그레이션 최소 | JSON 구조가 dataType별로 완전히 다름 |
| 쿼리 포인트 1곳 | TypeScript 타입 안전성 약함 |
| 휴지통 UI 단순화 | 복원 로직이 dataType별 분기 필요 |

**복원 난이도: 중** — JSON 파싱 후 dataType별 분기하여 원본 테이블에 재삽입.

---

### 옵션 B: 타입별 테이블

근골조사와 위험성평가 각각 전용 아카이브 테이블.

```prisma
// 기존 유지
model ArchivedAssessment { ... }  // 근골조사 전용 (이름 변경: ArchivedMusculoskeletal)

// 신규
model ArchivedRiskAssessment {
  id                   String   @id @default(cuid())
  workplaceId          String
  workplace            Workplace @relation(...)

  unitName             String
  unitPath             String
  cardData             Json     // RiskAssessmentCard + Photos
  hazardsData          Json     // RiskHazard[] + Photos + Improvements
  year                 Int
  evaluationType       String   // REGULAR | OCCASIONAL
  originalCardId       String
  archivedAt           DateTime @default(now())
  archivedReason       String?
  deletedById          String?
}
```

| 장점 | 단점 |
|------|------|
| JSON 구조가 명확하고 타입별 특화 | 테이블 2개 관리 |
| 복원 로직 분리되어 깔끔 | 휴지통 UI에서 UNION 쿼리 필요 |
| 기존 ArchivedAssessment 변경 불필요 | 추후 타입 추가 시 테이블 계속 증가 |

**복원 난이도: 중** — 타입별 전용 복원 로직. 구조가 명확해서 오류 가능성 낮음.

---

### 옵션 C: 범용 휴지통 테이블 (DeletedItem)

모든 종류의 삭제 데이터를 하나의 범용 테이블에 저장.

```prisma
model DeletedItem {
  id              String   @id @default(cuid())
  workplaceId     String
  workplace       Workplace @relation(...)

  // 분류
  itemType        String   // "MUSCULOSKELETAL" | "RISK_CARD" | "RISK_HAZARD" | "RISK_IMPROVEMENT" | "ELEMENT_WORK"
  parentItemId    String?  // 부모 DeletedItem ID (계층적 삭제 시)

  // 메타데이터
  label           String   // 목록 표시용: "2025 정기 - 조립팀 위험성평가"
  unitName        String?
  unitPath        String?
  year            Int?

  // 데이터
  payload         Json     // 전체 스냅샷
  originalId      String   // 원본 레코드 ID

  // 삭제 정보
  deletedAt       DateTime @default(now())
  deletedReason   String?  // "조직 단위 삭제" | "직접 삭제"
  deletedById     String?
  deletedBy       User?    @relation(...)

  // 만료
  expiresAt       DateTime? // null = 영구 보관

  @@index([workplaceId])
  @@index([itemType])
  @@index([deletedAt])
  @@index([expiresAt])
}
```

| 장점 | 단점 |
|------|------|
| 확장성 최고 (어떤 타입이든 추가 가능) | JSON payload 구조 파편화 |
| 부분 삭제도 추적 가능 (위험요인 1개 삭제 등) | 복원 시 부모-자식 관계 복원 복잡 |
| 만료 기능, 삭제자 추적 내장 | parentItemId 관리 복잡성 |
| 휴지통 UI 쿼리 단순 | 기존 ArchivedAssessment와 역할 중복 → 마이그레이션 필요 |

**복원 난이도: 상** — itemType별 복원 로직 + 부모-자식 의존성 해결 + 원본 테이블 존재 여부 확인.

---

## 3. 옵션 비교 요약

| 기준 | A (단일 확장) | B (타입별) | C (범용) |
|------|:---:|:---:|:---:|
| 마이그레이션 크기 | 소 | 중 | 대 |
| 기존 코드 영향 | 소 | 소 | 대 (기존 ArchivedAssessment 마이그레이션) |
| 타입 안전성 | 약 | 강 | 약 |
| 확장성 | 중 | 중 | 높음 |
| 복원 로직 복잡도 | 중 | 중 | 높음 |
| 부분 삭제 추적 | 불가 | 불가 | 가능 |
| 휴지통 UI 구현 | 쉬움 | 보통 | 쉬움 |

---

## 4. 추천: 옵션 A (단일 테이블 확장)

### 추천 이유

1. **실용성**: 현재 ArchivedAssessment가 이미 잘 작동 중. `dataType` 필드 하나 추가로 위험성평가까지 커버 가능.
2. **최소 변경**: 기존 아카이브 조회/삭제 UI 변경 최소화.
3. **부분 삭제는 불필요**: 위험요인 1개를 삭제하고 복원할 일은 현실적으로 드묾. 카드 단위 백업이면 충분.
4. **YAGNI**: 범용 휴지통(옵션 C)은 현재 규모에 과도함. 필요할 때 확장 가능.

### 보완 사항

- `deletedById` 추가하여 삭제자 추적
- `dataType` 필드로 근골조사/위험성평가 구분
- JSON 구조를 TypeScript 인터페이스로 정의하여 타입 안전성 확보

---

## 5. 구현 계획

### Phase 1: 긴급 버그 수정 — 조직 단위 삭제 시 위험성평가 백업

**변경 파일:**
- `prisma/schema.prisma` — ArchivedAssessment에 `dataType`, `deletedById` 필드 추가
- `src/app/api/workplaces/[id]/organizations/[orgId]/units/[unitId]/route.ts` — DELETE 핸들러에 RiskAssessmentCard 아카이브 로직 추가

**작업 내용:**
1. ArchivedAssessment 스키마 확장
   ```prisma
   model ArchivedAssessment {
     // 기존 필드 유지...
     dataType     String  @default("MUSCULOSKELETAL")  // "MUSCULOSKELETAL" | "RISK_ASSESSMENT"
     deletedById  String?
   }
   ```
2. 조직 단위 DELETE 핸들러에서:
   - RiskAssessmentCard + Hazard + Improvement 조회 (include 전체)
   - ArchivedAssessment 생성 (dataType: "RISK_ASSESSMENT")
   - RiskAssessmentCard deleteMany

**위험도:** 낮음 (기존 로직에 추가만, 변경 없음)

---

### Phase 2: 직접 삭제 시 백업 추가

**변경 파일:**
- `src/app/api/risk-assessment/[cardId]/route.ts` — DELETE에 아카이브 추가
- `src/app/api/workplaces/[id]/musculoskeletal/[assessmentId]/route.ts` — DELETE에 아카이브 추가
- (선택) `src/lib/archive-utils.ts` — 아카이브 헬퍼 함수 분리

**작업 내용:**
1. 위험성평가 카드 삭제 전 ArchivedAssessment 생성
2. 근골조사 삭제 전 ArchivedAssessment 생성
3. 공통 아카이브 로직을 헬퍼 함수로 추출

**아카이브 헬퍼 예시:**
```typescript
// src/lib/archive-utils.ts

export async function archiveRiskAssessmentCard(
  cardId: string,
  workplaceId: string,
  reason: string,
  deletedById?: string
) {
  const card = await prisma.riskAssessmentCard.findUnique({
    where: { id: cardId },
    include: {
      organizationUnit: { select: { name: true } },
      photos: true,
      hazards: {
        include: {
          photos: true,
          improvements: { include: { photos: true, files: true } },
        },
      },
    },
  })
  if (!card) return null

  const unitPath = await buildUnitPath(card.organizationUnitId)

  return prisma.archivedAssessment.create({
    data: {
      workplaceId,
      dataType: 'RISK_ASSESSMENT',
      unitName: card.organizationUnit.name,
      unitPath,
      assessmentData: JSON.parse(JSON.stringify(card)),
      year: card.year,
      assessmentType: card.evaluationType,
      originalAssessmentId: card.id,
      archivedReason: reason,
      deletedById,
    },
  })
}

export async function archiveMusculoskeletalAssessment(
  assessmentId: string,
  workplaceId: string,
  reason: string,
  deletedById?: string
) {
  // 유사한 패턴...
}
```

**위험도:** 낮음

---

### Phase 3: 휴지통 UI

**신규 파일:**
- `src/app/(dashboard)/trash/page.tsx` — 휴지통 메인 페이지
- `src/app/api/trash/route.ts` — 아카이브 목록 API
- `src/app/api/trash/[id]/route.ts` — 개별 조회/영구삭제 API
- `src/app/api/trash/[id]/restore/route.ts` — 복원 API

**메뉴 위치:** 사이드바 하단 (설정 위)에 "휴지통" 메뉴 추가

**목록 화면 구조:**
```
┌─────────────────────────────────────────────┐
│ 🗑️ 휴지통                                   │
├─────────────────────────────────────────────┤
│ [전체] [근골조사] [위험성평가]  │ 검색: [____] │
│ [조직삭제] [직접삭제]          │ 연도: [____] │
├─────────────────────────────────────────────┤
│ □ 2025 정기 - 조립팀 위험성평가              │
│   사업장: ○○제조  삭제일: 2026-03-10         │
│   사유: 조직 단위 삭제  [상세보기] [복원]     │
│─────────────────────────────────────────────│
│ □ 2025 정기 - 나사조립 근골조사              │
│   사업장: ○○제조  삭제일: 2026-03-08         │
│   사유: 직접 삭제  [상세보기] [복원]          │
├─────────────────────────────────────────────┤
│ 선택항목: [복원] [영구 삭제]                  │
└─────────────────────────────────────────────┘
```

**필터/검색:**
- 타입 필터: 전체 / 근골조사 / 위험성평가
- 사유 필터: 전체 / 조직 삭제 / 직접 삭제
- 연도 필터
- 사업장 필터
- 텍스트 검색 (unitName, unitPath)

**권한:** STAFF 이상만 접근 가능

---

### Phase 4: 복원 기능

**복원 플로우:**

```
[복원 클릭]
    ↓
[조직 단위 확인]
    ├── 존재함 → 데이터 복원 (INSERT) → 아카이브 삭제
    └── 존재하지 않음
        ↓
    [안내 모달]
    "원래 조직 단위(조립팀)가 삭제되었습니다."
    "복원할 조직 단위를 선택해주세요."
        ↓
    [조직 트리 선택 UI]
        ↓
    [선택한 조직 단위로 복원] → 아카이브 삭제
```

**복원 로직:**
```typescript
// POST /api/trash/[id]/restore
export async function POST(req) {
  const { targetUnitId } = await req.json()  // 선택적: 대체 조직 단위

  const archived = await prisma.archivedAssessment.findUnique(...)

  if (archived.dataType === 'RISK_ASSESSMENT') {
    const data = archived.assessmentData as RiskCardSnapshot

    // 1. 조직 단위 존재 확인
    const unitId = targetUnitId || data.card.organizationUnitId
    const unit = await prisma.organizationUnit.findUnique({ where: { id: unitId } })
    if (!unit) return error("조직 단위를 선택해주세요")

    // 2. 중복 확인 (같은 unit + year + type)
    const existing = await prisma.riskAssessmentCard.findUnique({
      where: { organizationUnitId_year_evaluationType: { ... } }
    })
    if (existing) return error("해당 조직 단위에 동일 연도/유형의 평가가 이미 존재합니다")

    // 3. 트랜잭션으로 복원
    await prisma.$transaction(async (tx) => {
      const newCard = await tx.riskAssessmentCard.create({ data: { ... } })
      for (const hazard of data.hazards) {
        const newHazard = await tx.riskHazard.create({ data: { ... } })
        for (const imp of hazard.improvements) {
          await tx.riskImprovementRecord.create({ data: { ... } })
        }
      }
      await tx.archivedAssessment.delete({ where: { id } })
    })
  }

  if (archived.dataType === 'MUSCULOSKELETAL') {
    // 유사한 패턴...
  }
}
```

**복원 시 주의사항:**
- 새 ID 생성 (원본 ID 재사용 불가 — 다른 데이터와 충돌 가능)
- 사진 파일은 물리적으로 삭제되지 않았다면 경로 유지, 삭제되었다면 사진 없이 복원
- unique 제약 조건 충돌 확인 필수

---

### Phase 5 (선택): 자동 만료

**설계:**
- ArchivedAssessment에 `expiresAt` 필드 추가 (기본값: 삭제 후 1년)
- cron job으로 만료된 아카이브 자동 영구 삭제
- 영구 삭제 전 물리 파일도 정리

**우선순위:** 낮음 (데이터량이 크지 않으면 불필요)

---

## 6. 우선순위 정리

### MVP (필수)
1. **Phase 1**: 조직 단위 삭제 시 위험성평가 백업 (버그 수정)
2. **Phase 2**: 직접 삭제 시 백업

### 중요
3. **Phase 3**: 휴지통 UI (목록 + 상세보기 + 영구삭제)
4. **Phase 4**: 복원 기능 (조직 존재 시)

### Nice to have
5. **Phase 4 확장**: 조직 미존재 시 대체 조직 선택 복원
6. **Phase 5**: 자동 만료 + 물리 파일 정리

---

## 7. TypeScript 타입 정의 (참고)

```typescript
// src/types/archive.ts

interface ArchivedRiskAssessmentData {
  card: {
    id: string
    year: number
    evaluationType: string
    evaluationReason?: string
    workerName: string
    evaluatorName: string
    workDescription: string
    dailyWorkingHours?: string
    dailyProduction?: string
    annualWorkingDays?: string
    workCycle?: string
    organizationUnitId: string
  }
  cardPhotos: Array<{
    photoPath: string
    thumbnailPath?: string
    photoType: string
    description?: string
  }>
  hazards: Array<{
    hazardCategory: string
    hazardFactor: string
    severityScore: number
    likelihoodScore: number
    additionalPoints: number
    additionalDetails?: Record<string, number>
    riskScore: number
    improvementPlan?: string
    year: number
    chemicalProductId?: string
    photos: Array<{ photoPath: string; thumbnailPath?: string }>
    improvements: Array<{
      status: string
      updateDate: string
      improvementContent: string
      responsiblePerson: string
      severityScore: number
      likelihoodScore: number
      additionalPoints: number
      riskScore: number
      remarks?: string
      photos: Array<{ photoPath: string }>
      files: Array<{ fileName: string; filePath: string; fileSize?: number }>
    }>
  }>
}

interface ArchivedMusculoskeletalData {
  assessment: {
    // MusculoskeletalAssessment 전체 필드
    // (기존 JSON 스냅샷 구조 유지)
  }
  elementWorks: Array<{
    // ElementWork + BodyPartScore + WorkMeasurement
  }>
  improvements: Array<{
    // MSurveyImprovement
  }>
  attachments: Array<{
    // MSurveyAttachment
  }>
}
```

---

## 8. 리뷰 포인트

검토 시 결정이 필요한 사항:

1. **옵션 선택**: A(단일 확장) vs B(타입별) vs C(범용) — 추천은 A
2. **부분 삭제 백업 범위**: 위험요인 1개 삭제, 개선이력 1개 삭제도 백업할 것인가?
   - 추천: 카드/조사 단위만 백업 (부분 삭제는 백업 불필요)
3. **보관 기간**: 영구 vs 1년 vs 설정 가능?
4. **사진 파일 처리**: 삭제 시 물리 파일도 즉시 삭제? 아카이브 영구삭제 시?
5. **복원 시 ID 정책**: 새 ID 생성 vs 원본 ID 복원 시도?
