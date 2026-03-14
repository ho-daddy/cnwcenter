# 삭제 데이터 관리 구현 작업 지시

> 작성: 2026-03-14 15:15
> 상태: 구현 대기

---

## 리뷰 완료 — 주인님 결정사항

### 1. 옵션 A (단일 테이블 확장) ✅

기존 `ArchivedAssessment` 테이블에 `dataType`, `deletedById` 필드 추가.

### 2. 부분 삭제도 백업 ✅

- 위험요인 1개 삭제 → 백업
- 개선이력 1개 삭제 → 백업
- 요소작업 1개 삭제 → 백업

카드/조사 단위뿐 아니라 **모든 삭제 행위**를 아카이브.

### 3. 보관 기간: 영구 + 사용자 완전 삭제 가능

- 기본: 영구 보관 (expiresAt 필드 불필요)
- 완전 삭제 권한:
  - **WORKPLACE_USER**: 소속 사업장 데이터만
  - **STAFF+**: 모든 사업장 데이터

### 4. 사진 파일: 아카이브 영구 삭제 시 물리 파일도 삭제

- 아카이브 생성 시: 물리 파일 유지
- 아카이브 영구 삭제 시: `photoPath`들 파싱 → 파일 삭제

### 5. 복원 ID: 새 ID 생성 (안전)

- 원본 ID는 `originalAssessmentId`에만 기록
- 복원 시 `cuid()` 새로 생성

---

## 작업 요청

**Phase 1~4 전체 구현**

각 Phase 완료 후 테스트 가능하도록 커밋 단위로 작업.  
Phase 5 (자동 만료)는 스킵.

---

## Phase 1: 긴급 버그 수정 — 조직 삭제 시 위험성평가 백업

### 변경 파일
- `prisma/schema.prisma`
- `src/app/api/workplaces/[id]/organizations/[orgId]/units/[unitId]/route.ts`

### 작업 내용

1. **스키마 수정**
   ```prisma
   model ArchivedAssessment {
     // 기존 필드 유지...
     dataType     String  @default("MUSCULOSKELETAL")  // "MUSCULOSKELETAL" | "RISK_ASSESSMENT" | "RISK_HAZARD" | "RISK_IMPROVEMENT" | "ELEMENT_WORK"
     deletedById  String?
     deletedBy    User?   @relation(fields: [deletedById], references: [id], onDelete: SetNull)
   }
   ```

2. **조직 단위 DELETE 핸들러 수정**
   ```typescript
   // 기존: MusculoskeletalAssessment만 아카이브
   // 추가: RiskAssessmentCard도 아카이브
   
   const riskCards = await prisma.riskAssessmentCard.findMany({
     where: { organizationUnitId: { in: unitIds } },
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
   
   for (const card of riskCards) {
     await prisma.archivedAssessment.create({
       data: {
         workplaceId: params.id,
         dataType: 'RISK_ASSESSMENT',
         unitName: card.organizationUnit.name,
         unitPath: await buildUnitPath(card.organizationUnitId, params.orgId),
         assessmentData: JSON.parse(JSON.stringify(card)),
         year: card.year,
         assessmentType: card.evaluationType,
         originalAssessmentId: card.id,
         archivedReason: '조직 단위 삭제',
         deletedById: session.user.id,
       },
     })
   }
   
   await prisma.riskAssessmentCard.deleteMany({
     where: { organizationUnitId: { in: unitIds } },
   })
   ```

3. **Migration**
   ```bash
   npx prisma migrate dev --name add-datatype-deletedby-to-archived
   ```

---

## Phase 2: 직접 삭제 시 백업 (부분 삭제 포함)

### 신규 파일
- `src/lib/archive-utils.ts` — 아카이브 헬퍼 함수

### 변경 파일
- `src/app/api/workplaces/[id]/risk-assessment/[cardId]/route.ts`
- `src/app/api/workplaces/[id]/risk-assessment/[cardId]/hazards/[hazardId]/route.ts`
- `src/app/api/workplaces/[id]/risk-assessment/[cardId]/hazards/[hazardId]/improvements/[improvementId]/route.ts`
- `src/app/api/workplaces/[id]/musculoskeletal/[assessmentId]/route.ts`
- `src/app/api/workplaces/[id]/musculoskeletal/[assessmentId]/element-works/[workId]/route.ts`

### 작업 내용

1. **archive-utils.ts 작성**
   ```typescript
   export async function archiveRiskAssessmentCard(...)
   export async function archiveRiskHazard(...)
   export async function archiveRiskImprovement(...)
   export async function archiveMusculoskeletalAssessment(...)
   export async function archiveElementWork(...)
   ```

2. **각 DELETE 핸들러에 아카이브 추가**
   - 삭제 전 아카이브 헬퍼 호출
   - `archivedReason: '직접 삭제'`
   - `deletedById: session.user.id`

---

## Phase 3: 휴지통 UI

### 신규 파일
- `src/app/(dashboard)/trash/page.tsx`
- `src/app/api/trash/route.ts` (GET)
- `src/app/api/trash/[id]/route.ts` (GET, DELETE)

### 변경 파일
- `src/components/layout/sidebar.tsx` — 휴지통 메뉴 추가 (하단, 설정 위)

### 작업 내용

1. **사이드바 메뉴 추가**
   ```tsx
   <SidebarMenuItem
     href="/trash"
     icon={Trash2}
     label="휴지통"
     isActive={pathname === '/trash'}
   />
   ```

2. **휴지통 목록 페이지**
   - 타입 필터: 전체 / 근골조사 / 위험성평가 / 위험요인 / 개선이력 / 요소작업
   - 사유 필터: 전체 / 조직 삭제 / 직접 삭제
   - 연도 필터
   - 사업장 필터 (WORKPLACE_USER는 자기 사업장만)
   - 텍스트 검색
   - 일괄 선택 + 복원/영구삭제 버튼

3. **상세보기 모달**
   - JSON 데이터 읽기 쉽게 표시
   - 복원 버튼
   - 영구 삭제 버튼

4. **영구 삭제 API**
   ```typescript
   // DELETE /api/trash/[id]
   // 권한 체크:
   // - WORKPLACE_USER: archived.workplaceId가 자기 사업장인지 확인
   // - STAFF+: 모든 데이터 삭제 가능
   
   // 물리 파일 삭제:
   const data = archived.assessmentData
   const photoPaths = extractAllPhotoPaths(data)  // 재귀 파싱
   for (const path of photoPaths) {
     await fs.unlink(path).catch(() => {})  // 파일 없어도 무시
   }
   
   await prisma.archivedAssessment.delete({ where: { id } })
   ```

---

## Phase 4: 복원 기능

### 신규 파일
- `src/app/api/trash/[id]/restore/route.ts`

### 작업 내용

1. **복원 API**
   ```typescript
   // POST /api/trash/[id]/restore
   // body: { targetUnitId?: string }
   
   const archived = await prisma.archivedAssessment.findUnique(...)
   
   // 조직 단위 확인
   let unitId = archived.assessmentData.card?.organizationUnitId || 
                archived.assessmentData.assessment?.organizationUnitId
   
   if (req.body.targetUnitId) {
     unitId = req.body.targetUnitId  // 대체 조직 선택
   }
   
   const unit = await prisma.organizationUnit.findUnique({ where: { id: unitId } })
   if (!unit) {
     return error("조직 단위를 선택해주세요", { needsUnitSelection: true })
   }
   
   // dataType별 복원 로직
   if (archived.dataType === 'RISK_ASSESSMENT') {
     await restoreRiskAssessmentCard(archived, unitId)
   }
   else if (archived.dataType === 'RISK_HAZARD') {
     await restoreRiskHazard(archived, cardId)  // 부모 cardId 필요
   }
   // ... 기타 타입
   
   await prisma.archivedAssessment.delete({ where: { id } })
   ```

2. **복원 헬퍼 함수**
   ```typescript
   async function restoreRiskAssessmentCard(archived, targetUnitId) {
     const data = archived.assessmentData as RiskCardSnapshot
     
     // 중복 확인
     const existing = await prisma.riskAssessmentCard.findFirst({
       where: {
         organizationUnitId: targetUnitId,
         year: data.card.year,
         evaluationType: data.card.evaluationType,
       },
     })
     if (existing) throw new Error("중복된 평가가 존재합니다")
     
     // 트랜잭션으로 복원
     await prisma.$transaction(async (tx) => {
       const newCard = await tx.riskAssessmentCard.create({
         data: {
           // id: 새로 생성 (cuid)
           organizationUnitId: targetUnitId,
           year: data.card.year,
           // ... 나머지 필드
         },
       })
       
       for (const photo of data.cardPhotos) {
         await tx.riskCardPhoto.create({ data: { cardId: newCard.id, ... } })
       }
       
       for (const hazard of data.hazards) {
         const newHazard = await tx.riskHazard.create({ data: { cardId: newCard.id, ... } })
         for (const imp of hazard.improvements) {
           await tx.riskImprovementRecord.create({ data: { hazardId: newHazard.id, ... } })
         }
       }
     })
   }
   ```

3. **조직 선택 모달** (조직 미존재 시)
   - 조직 트리 UI 컴포넌트 재사용
   - 선택 후 `targetUnitId`와 함께 복원 API 재호출

---

## TypeScript 타입 정의

`src/types/archive.ts` 생성:

```typescript
export interface ArchivedRiskAssessmentData {
  card: {
    id: string
    year: number
    evaluationType: string
    organizationUnitId: string
    // ... 나머지 필드
  }
  cardPhotos: Array<{ photoPath: string; ... }>
  hazards: Array<{
    hazardCategory: string
    // ...
    improvements: Array<{ ... }>
  }>
}

export interface ArchivedMusculoskeletalData {
  assessment: { ... }
  elementWorks: Array<{ ... }>
  improvements: Array<{ ... }>
  attachments: Array<{ ... }>
}

// dataType별 union
export type ArchivedAssessmentData =
  | ArchivedRiskAssessmentData
  | ArchivedMusculoskeletalData
  | ArchivedRiskHazardData
  | ArchivedRiskImprovementData
  | ArchivedElementWorkData
```

---

## 커밋 전략

1. **Phase 1 완료 후**: `feat: 조직 삭제 시 위험성평가 백업 추가`
2. **Phase 2 완료 후**: `feat: 직접 삭제 시 백업 기능 추가`
3. **Phase 3 완료 후**: `feat: 휴지통 UI 추가`
4. **Phase 4 완료 후**: `feat: 휴지통 복원 기능 추가`

각 Phase별로 테스트 가능하도록 나눠서 커밋.

---

## 시작!

이 파일을 읽었으면 작업 시작해주세요.  
완료되면 주인님께 보고 부탁드립니다!
