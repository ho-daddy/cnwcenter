# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 새움터 (CNW Center)

산업재해 예방 및 상담 통합 업무관리시스템

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **DB**: PostgreSQL 15 (Docker 컨테이너)
- **ORM**: Prisma 5
- **인증**: NextAuth.js v4 (Credentials + Google OAuth)
- **스타일**: Tailwind CSS + shadcn/ui 스타일 컴포넌트
- **상태관리**: Zustand (사이드바 등 클라이언트 상태)
- **아이콘**: lucide-react
- **스크래핑**: cheerio + Playwright (JS 렌더링 필요 사이트)
- **날짜**: date-fns (한국어 locale)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`)
- **드래그앤드롭**: @dnd-kit (조직도 순서 변경)

## 주요 명령어

```bash
# 개발 환경
docker compose up -d          # PostgreSQL 시작
npm run dev                   # 개발 서버 (localhost:3000)
npm run build                 # 프로덕션 빌드

# DB 관리
npm run db:push               # 스키마 동기화 (npx prisma db push)
npm run db:generate           # Prisma 클라이언트 생성
npm run db:studio             # DB GUI (npx prisma studio)
npm run db:seed               # 초기 데이터 삽입 (기본 관리자 계정 생성)

# 코드 품질
npm run lint                  # ESLint 실행
```

**빌드 후 스타일 깨짐 해결**: node 프로세스 전체 종료 → `.next` 삭제 → `npm run dev` 재시작

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

`npm run db:seed` 실행 시 기본 관리자 계정 생성:
- 이메일: `admin@saewoomter.org` / 비밀번호: `admin1234`
- 역할: SUPER_ADMIN, 상태: APPROVED

## 아키텍처 개요

### Route Groups

- `(auth)/` — 인증 페이지 (레이아웃 없음): 로그인, 회원가입, 승인대기
- `(dashboard)/` — 사이드바+헤더 레이아웃 적용: 모든 업무 페이지

### 미들웨어 & 인증 (`src/middleware.ts`)

NextAuth `withAuth` 기반 RBAC:
- `/settings`, `/admin/users` → SUPER_ADMIN 전용
- `/admin`, `/calendar/new`, `/workplaces` → STAFF 이상
- 그 외 보호 경로 → APPROVED 상태 필요
- 공개 경로: `/login`, `/register`, `/pending-approval`, `/api/auth`

UserRole: `SUPER_ADMIN | STAFF | WORKPLACE_USER`
UserStatus: `PENDING | APPROVED | REJECTED | SUSPENDED`

### 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/                   # 로그인, 회원가입, 승인대기
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Sidebar + Header (클라이언트 컴포넌트)
│   │   ├── page.tsx              # 대시보드
│   │   ├── admin/users/          # 사용자 관리 (SUPER_ADMIN)
│   │   ├── calendar/             # 일정 관리
│   │   ├── workplaces/           # 사업장 관리
│   │   │   └── [id]/organization/# 조직도
│   │   ├── notices/              # 공지사항 (목록, 상세, 작성, 수정)
│   │   ├── risk-assessment/      # 위험성평가 (대시보드, 카드상세, 위험요인, 개선이력)
│   │   ├── counseling/           # 상담관리 (목록, 케이스상세, 신규등록)
│   │   ├── musculoskeletal/      # 근골조사
│   │   │   └── survey/[id]/      # 조사 상세 + 작업단위별 sheet
│   │   └── settings/             # 브리핑 소스 관리
│   └── api/
│       ├── auth/                 # NextAuth + 회원가입
│       ├── admin/users/          # 사용자 승인/역할/사업장
│       ├── briefing/             # 수집, 분석, 리포트
│       ├── notices/              # 공지사항 CRUD + 댓글
│       ├── risk-assessment/      # 평가카드·위험요인·개선이력 CRUD
│       ├── counseling/           # 상담케이스·상담기록 CRUD
│       ├── schedules/            # 일정 CRUD
│       ├── workplaces/
│       │   └── [id]/
│       │       ├── contacts/     # 담당자
│       │       ├── organizations/ # 조직도 + units (reorder 포함)
│       │       ├── users/        # 사업장 사용자
│       │       └── musculoskeletal/ # 근골조사 (assessmentId별 sheet1~4, element-works, improvements, attachments)
│       └── musculoskeletal/      # 전역 조사 조회
├── components/
│   ├── layout/                   # Sidebar, Header
│   ├── dashboard/                # 위젯 4종 (WorkStatus, Notice, Schedule, Briefing) + BriefingCard
│   ├── auth/                     # LoginForm, RegisterForm
│   ├── admin/                    # UserTable
│   ├── calendar/                 # CalendarView, ScheduleForm
│   ├── workplace/                # OrganizationTree, ContactList
│   ├── musculoskeletal/          # Sheet2Modal (부위별점수), Sheet3Modal (RULA/REBA)
│   ├── settings/                 # CollectButton, AnalyzeButton, SourceStatusList, ReportHistory
│   ├── providers/                # SessionProvider
│   └── ui/                      # shadcn/ui 기반 기본 컴포넌트
├── lib/
│   ├── auth.ts                   # NextAuth 설정
│   ├── prisma.ts                 # Prisma 클라이언트 싱글톤
│   ├── anthropic.ts              # Anthropic Claude API 클라이언트
│   ├── utils.ts                  # cn(), formatDate(), formatDateTime()
│   ├── risk-assessment.ts        # 위험성평가 공통 (카테고리 레이블, 위험등급, 점수계산)
│   ├── briefing/
│   │   ├── collector.ts          # 수집 오케스트레이터
│   │   ├── analysis-service.ts   # Claude AI 분석
│   │   ├── report-generator.ts
│   │   └── scrapers/             # cheerio 기반 + playwright 기반 스크래퍼
│   └── musculoskeletal/
│       └── score-calculator.ts   # 부위별 점수 계산 로직
├── stores/
│   └── sidebar-store.ts          # Zustand 사이드바 상태
└── types/                        # TS 타입 정의
```

### DB 주요 모델 (Prisma)

- **User** + Account/Session — NextAuth 인증
- **Workplace** + WorkplaceContact + WorkplaceUser — 사업장 관리
- **Organization** + OrganizationUnit — 조직도 트리 (계층형)
- **Schedule** — 일정/캘린더
- **MusculoskeletalAssessment** — 근골조사 메인 (Sheet1~4)
  - **ElementWork** — 작업단위별 데이터 (Sheet2/3)
  - **BodyPartScore** — 6개 부위별 점수
  - **MSurveyImprovement** — 개선항목 (Sheet4)
  - **MSurveyAttachment** — 첨부파일
  - **ArchivedAssessment** — 조직단위 삭제 시 아카이브
- **NewsBriefing** + CollectionLog + DailyReport — 브리핑 시스템
- **CounselingCase** + Consultation + Document — 상담 관리
- **위험성평가 시스템**
  - **RiskAssessmentCard** — 관리카드 (OrganizationUnit 연결, year+evaluationType 유니크)
  - **RiskCardPhoto** — 관리카드 사진 (photoType: work_photo|hazard_photo)
  - **RiskHazard** — 유해위험요인 (`riskScore = severity × likelihood + additional`, 앱에서 계산 후 저장)
  - **RiskHazardPhoto** — 유해위험요인 사진
  - **RiskImprovementRecord** — 개선작업 이력 (ImprovementStatus: PLANNED/COMPLETED)
  - **RiskImprovementPhoto / RiskImprovementFile** — 개선작업 첨부
  - **ChemicalComponent** — 화학성분 마스터 (CAS번호 기반, 전역 DB)
  - **ChemicalProduct** — 사업장별 화학제품 (severityScore는 구성성분 최대값 자동산정)
  - **ProductComponent** — 제품-성분 연결 (concentration: 숫자% | "모름" | "영업비밀")
  - **ChemicalProductUnit** — 화학물질↔조직단위 연결 (복합 PK, 기존 dept+process products 통합)
  - **NoiseMeasurement** — 소음측정값 (NoisePeriod: recent/previous, dB 소수점1자리)
- **Notice** + NoticeComment + NoticeImage — 공지사항

### Enum 값 (위험성평가)

```
HazardCategory:    ACCIDENT(사고성재해) MUSCULOSKELETAL(근골격계) CHEMICAL(유해화학물질)
                   NOISE(소음) ABSOLUTE(절대기준) OTHER(기타위험)
RiskEvaluationType: REGULAR(정기조사) OCCASIONAL(수시조사)
ImprovementStatus:  PLANNED(예정) COMPLETED(완료)
NoisePeriod:        recent(최근) previous(전회)
```

### 근골조사 (Musculoskeletal Assessment) 구조

4-Sheet 시스템:
- **Sheet 1**: 관리카드 (사업장, 작업자, 조사자 기본정보)
- **Sheet 2**: 부위별 증상조사 (6개 부위 - HAND_WRIST, ELBOW_FOREARM, SHOULDER_ARM, NECK, BACK_HIP, KNEE_ANKLE)
- **Sheet 3**: RULA/REBA 작업자세 평가
- **Sheet 4**: 종합평가 (관리수준, 개선항목)

Sheet2/3는 작업단위(ElementWork)별로 관리하며, 조직도 연계 필수. 조직단위 삭제 시 연결된 조사는 ArchivedAssessment로 보관.

## 한국어 용어 규칙

- 앱 이름: **새움터** (영문: CNW Center)
- 대시보드 타이틀: **오늘의 새움터**
- "근골격계 조사" 사용 금지 → **근골격계유해요인조사** (정식) / **근골조사** (줄임)
- **"근로자" 사용 금지** → 파트별 대체어 사용:
  - 상담관리(counseling) 파트: **노동자**
  - 위험성평가(risk-assessment) 파트: **작업자**
  - 근골조사(musculoskeletal) 파트: **작업자**

## 구현 상태

**완료:**
- 인증 시스템 (회원가입, 로그인, 승인 워크플로우, Google OAuth, RBAC)
- 대시보드 레이아웃 + 위젯 4종 (업무현황, 공지, 일정, 브리핑)
- 일일 브리핑 (소스 관리, 스크래핑, Claude AI 분석)
- 사업장 관리 + 조직도 트리 (dnd-kit 순서변경)
- 근골조사 (조직도 연계, Sheet1~4, 개선항목, 첨부파일, 아카이브)
- 캘린더/일정 관리
- 관리자 사용자 관리 페이지
- 공지사항 (전체공개, 고정글, 댓글, STAFF+ 작성)
- 위험성평가 (평가카드 + 유해위험요인 + 개선이력, `src/lib/risk-assessment.ts` 공통 유틸)
- 상담관리 (케이스 등록, 상담기록, 상태관리, STAFF+ 전용)

**미구현:**
- 위험성평가: 화학물질 관리(`/chemical-products`), 소음측정 관리, 보고서(PDF/Excel) 내보내기
- 업무현황/일정 위젯 실데이터 연동 (현재 mock)
- VPS 배포 + cron 스케줄링

## 주의사항

- SQLite 사용 불가 (enum, @db.Text 사용 중)
- kosha.or.kr은 JS 렌더링 사이트라 cheerio로 스크래핑 불가 → playwright 사용
- 브리핑 수집 API(`POST /api/briefing/collect`)는 `BRIEFING_COLLECT_SECRET` 헤더 인증 필요
- 스키마 변경 후 반드시 `npm run db:generate` 실행

## 배포 계획

- VPS + PostgreSQL Docker
- 브리핑 수집: 시스템 cron으로 매일 1회 (`curl -X POST -H "Authorization: Bearer $SECRET"`)
