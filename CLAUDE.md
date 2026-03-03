# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 새움터 (CNW Center)

산업재해 예방 및 상담 통합 업무관리시스템

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript (strict mode, `@/*` → `./src/*` path alias)
- **DB**: PostgreSQL 15 (Docker) + Prisma 5
- **인증**: NextAuth.js v4 (Credentials + Google OAuth), JWT 세션
- **스타일**: Tailwind CSS 3.4 + shadcn/ui 스타일 컴포넌트 (HSL CSS 변수)
- **상태관리**: Zustand (사이드바 등 최소한의 클라이언트 상태, 대부분 서버사이드)
- **아이콘**: lucide-react
- **스크래핑**: cheerio + Playwright (JS 렌더링 필요 사이트)
- **날짜**: date-fns (한국어 locale)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`)
- **드래그앤드롭**: @dnd-kit (조직도 순서 변경)
- **파일처리**: ExcelJS, XLSX, pdf-parse, mammoth (문서 파싱/내보내기)
- **기타**: qrcode.react (설문 QR 생성)

## 주요 명령어

```bash
# 개발 환경
docker compose up -d          # PostgreSQL 시작
npm run dev                   # 개발 서버 (localhost:3000)
npm run dev:network           # 네트워크 접근용 (0.0.0.0 + HTTPS)
npm run build                 # 프로덕션 빌드
npm run lint                  # ESLint (next lint, next/core-web-vitals 기본 설정)

# DB 관리
npm run db:push               # 스키마 → DB 동기화 (npx prisma db push)
npm run db:generate           # Prisma 클라이언트 재생성
npm run db:studio             # DB GUI (npx prisma studio)
npm run db:seed               # 초기 데이터 (관리자 계정 + 설문 템플릿 3종)
```

**스키마 변경 후 반드시** `npm run db:push && npm run db:generate` 실행.

**빌드 후 스타일 깨짐**: node 프로세스 전체 종료 → `.next` 삭제 → `npm run dev` 재시작.

**테스트 프레임워크**: 미설정 (jest/vitest 없음).

## 환경변수 (`.env`)

`.env.example` 참고. 필수 항목:

```bash
DATABASE_URL="postgresql://cnwuser:cnwpass@localhost:5432/cnwcenter?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
GOOGLE_CLIENT_ID=""           # Google OAuth (선택)
GOOGLE_CLIENT_SECRET=""
BRIEFING_COLLECT_SECRET=""    # 브리핑 수집 cron 인증키
ANTHROPIC_API_KEY=""          # Claude AI 브리핑 분석
```

## 씨드 데이터

`npm run db:seed` 실행 시:
- 관리자 계정: `admin@saewoomter.org` / `admin1234` (SUPER_ADMIN, APPROVED)
- 설문 템플릿 3종 upsert (DEFAULT, RISK_ASSESSMENT, MUSCULOSKELETAL)

## 아키텍처 개요

### Route Groups

- `(auth)/` — 인증 페이지 (레이아웃 없음): 로그인, 회원가입, 승인대기
- `(dashboard)/` — 사이드바+헤더 레이아웃 적용: 모든 업무 페이지

### 인증 & RBAC

**미들웨어** (`src/middleware.ts`) — NextAuth `withAuth` 기반 라우트 보호:
- `/settings`, `/admin/users` → SUPER_ADMIN 전용
- `/admin`, `/calendar/new`, `/workplaces` → STAFF 이상
- 그 외 보호 경로 → APPROVED 상태 필요
- 공개 경로: `/login`, `/register`, `/pending-approval`, `/api/auth`, `/s/` (공개 설문)

**역할/상태**:
- UserRole: `SUPER_ADMIN | STAFF | WORKPLACE_USER`
- UserStatus: `PENDING | APPROVED | REJECTED | SUSPENDED`

**API 라우트 인증 패턴** (`src/lib/auth-utils.ts`):
```typescript
// 모든 API route.ts에서 이 패턴 사용
const authCheck = await requireStaffOrAbove()  // 또는 requireAuth(), requireSuperAdmin(), requireWorkplaceAccess(id)
if (!authCheck.authorized) return NextResponse.json({ error: authCheck.error }, { status: 401 })
const { user } = authCheck
```

`getAccessibleWorkplaceIds()` — WORKPLACE_USER는 할당된 사업장만 조회, STAFF 이상은 null(무제한) 반환.

### API 응답 패턴

```typescript
// 성공
return NextResponse.json({ success: true, message: '...', data: { ... } })
// 에러
return NextResponse.json({ error: '...' }, { status: 4xx })
```

### 핵심 싱글톤

- `src/lib/prisma.ts` — Prisma 클라이언트 (globalThis로 hot-reload 방지)
- `src/lib/anthropic.ts` — Anthropic API 클라이언트
- `src/lib/auth.ts` — NextAuth 설정 (JWT 전략, 콜백에서 role/status 주입)

### 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/              # 로그인, 회원가입, 승인대기
│   ├── (dashboard)/         # 사이드바+헤더 레이아웃의 모든 업무 페이지
│   │   ├── risk-assessment/ # 위험성평가 (대시보드, 수행, 개선, 화학물질, 소음)
│   │   ├── counseling/      # 상담관리
│   │   ├── musculoskeletal/ # 근골조사 (survey/설문, view/조회)
│   │   ├── workplaces/      # 사업장 + 조직도
│   │   └── ...              # calendar, notices, settings, admin
│   └── api/                 # ~96개 route.ts (도메인별 REST API)
├── components/
│   ├── ui/                  # shadcn/ui 기본 컴포넌트 (button, card, photo-*)
│   ├── risk-assessment/     # ImprovementPanel 등 도메인 컴포넌트
│   └── ...                  # layout, dashboard, auth, calendar 등 11개 디렉토리
├── lib/
│   ├── auth.ts / auth-utils.ts  # 인증 설정 + 권한 헬퍼
│   ├── prisma.ts / anthropic.ts # 싱글톤 클라이언트
│   ├── utils.ts             # cn(), formatDate(), formatDateTime()
│   ├── risk-assessment.ts   # 위험등급 계산, 카테고리 레이블, 점수 테이블
│   ├── msds-rules.ts        # MSDS 심각성 점수 규칙
│   ├── briefing/            # 스크래핑 오케스트레이터 + Claude AI 분석 + 10개 스크래퍼
│   ├── musculoskeletal/     # 부위별 점수 계산
│   └── survey/              # 설문 템플릿(3종), 조건분기 로직, 상수
├── stores/                  # Zustand (sidebar-store.ts만 존재)
└── types/                   # TS 타입 정의
```

### DB 주요 모델 (Prisma)

**인증**: User + Account + Session (NextAuth)

**사업장 관리**: Workplace → WorkplaceContact, WorkplaceUser, Organization → OrganizationUnit (계층형 트리)

**위험성평가**:
- RiskAssessmentCard (OrganizationUnit 연결, year+evaluationType 유니크)
- RiskHazard (`riskScore = severity × likelihood + additional`, 앱에서 계산 후 저장)
- RiskImprovementRecord (PLANNED/COMPLETED)
- ChemicalComponent (CAS번호 기반 전역) → ChemicalProduct (사업장별) → ProductComponent, ChemicalProductUnit
- NoiseMeasurement (NoisePeriod: recent/previous)
- 각 모델에 사진/파일 첨부 모델 존재

**근골조사** (4-Sheet 시스템):
- MusculoskeletalAssessment → ElementWork(작업단위) → BodyPartScore(6개 부위), WorkMeasurement(공구/중량물/밀기/진동)
- MSurveyImprovement(개선항목), MSurveyAttachment(첨부), ArchivedAssessment(아카이브)

**설문조사**: SurveyTemplate → Survey → SurveySection → SurveyQuestion → SurveyAnswer (SurveyResponse 단위)
- 공개 URL: `accessToken`으로 토큰 기반 접근 (`/s/[token]` 라우트)
- QuestionType: TEXT, NUMBER, RADIO, CHECKBOX, RANGE, DROPDOWN, TABLE, RANKED_CHOICE, CONSENT

**상담관리**: CounselingCase (CaseType: ACCIDENT/DISEASE/COMMUTE) → Consultation + Document

**기타**: Schedule(일정), Notice + NoticeComment + NoticeImage, NewsBriefing + CollectionLog + DailyReport

### 위험성평가 점수 체계 (`src/lib/risk-assessment.ts`)

```
riskScore = severity × likelihood + additional
```
- 6개 HazardCategory별 심각성/가능성 기준 테이블이 다름
- `getRiskLevel(score)` — 4단계: 매우높음(≥16) / 높음(≥11) / 보통(≥6) / 낮음
- `HAZARD_CATEGORY_LABELS`, `HAZARD_CATEGORY_COLORS` — UI 표시용
- 카테고리별 `getSeverityDesc()`, `getLikelihoodDesc()` — 점수 기준 설명

### 근골조사 Sheet 구조

- **Sheet 1**: 관리카드 (사업장/작업자/조사자 기본정보)
- **Sheet 2**: 부위별 증상조사 (HAND_WRIST, ELBOW_FOREARM, SHOULDER_ARM, NECK, BACK_HIP, KNEE_ANKLE)
- **Sheet 3**: RULA/REBA 작업자세 평가
- **Sheet 4**: 종합평가 + 개선항목

Sheet2/3는 작업단위(ElementWork)별로 관리. 조직도 연계 필수, 조직단위 삭제 시 ArchivedAssessment로 보관.

### 브리핑 시스템 (`src/lib/briefing/`)

- `collector.ts` — 소스별 스크래핑 오케스트레이션
- `scrapers/` — cheerio 기반 10개 스크래퍼 + Playwright 변형 (kosha.or.kr 등 JS 렌더링 사이트)
- `analysis-service.ts` — Claude AI로 뉴스 분석
- 수집 API (`POST /api/briefing/collect`)는 `BRIEFING_COLLECT_SECRET` 헤더 인증 필요

### Next.js 설정 (`next.config.js`)

- `serverComponentsExternalPackages`: `['pdf-parse', 'playwright']`

## 한국어 용어 규칙

- 앱 이름: **새움터** (영문: CNW Center)
- 대시보드 타이틀: **오늘의 새움터**
- "근골격계 조사" 사용 금지 → **근골격계유해요인조사** (정식) / **근골조사** (줄임)
- **"근로자" 사용 금지** → 파트별 대체어:
  - 상담관리(counseling): **노동자**
  - 위험성평가(risk-assessment): **작업자**
  - 근골조사(musculoskeletal): **작업자**

## 구현 상태

**완료:**
- 인증 시스템 (회원가입, 로그인, 승인 워크플로우, Google OAuth, RBAC)
- 대시보드 레이아웃 + 위젯 4종 (업무현황, 공지, 일정, 브리핑)
- 일일 브리핑 (소스 관리, 스크래핑, Claude AI 분석)
- 사업장 관리 + 조직도 트리 (dnd-kit 순서변경)
- 근골조사 (조직도 연계, Sheet1~4, 개선항목, 첨부파일, 측정도구, 아카이브)
- 캘린더/일정 관리
- 관리자 사용자 관리 페이지
- 공지사항 (전체공개, 고정글, 댓글, STAFF+ 작성)
- 위험성평가 (평가카드 + 유해위험요인 + 개선이력)
- 상담관리 (케이스 등록, 상담기록, 문서관리, 상태관리, STAFF+ 전용)
- 설문조사 (템플릿 기반, 조건분기, 공개 URL, 응답 수집/분석/내보내기)

**미구현:**
- 위험성평가: 화학물질 관리 UI(`/chemical-products`), 소음측정 관리 UI, 보고서(PDF/Excel) 내보내기
- 업무현황/일정 위젯 실데이터 연동 (현재 mock)
- VPS 배포 + cron 스케줄링

## 주의사항

- SQLite 사용 불가 (PostgreSQL enum, @db.Text 사용 중)
- kosha.or.kr은 JS 렌더링 사이트 → cheerio 불가, playwright 사용
- Windows 환경에서 dev 서버 실행 중 `prisma generate` 파일 잠금 에러 발생 가능 (무시 가능)
- `npm run build` 시 briefing API의 dynamic server usage 경고는 정상 동작
- Prisma 쿼리 결과를 while 루프에서 사용 시 TypeScript implicit any 에러 → 명시적 타입 어노테이션 필요
