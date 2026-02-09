# 새움터 (CNW Center)

산업재해 예방 및 상담 통합 업무관리시스템

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **DB**: PostgreSQL 15 (Docker 컨테이너, `docker compose up -d`)
- **ORM**: Prisma
- **스타일**: Tailwind CSS + shadcn/ui 스타일 컴포넌트
- **상태관리**: Zustand (사이드바 등 클라이언트 상태)
- **아이콘**: lucide-react
- **스크래핑**: cheerio
- **날짜**: date-fns (한국어 locale)

## 프로젝트 구조

```
src/
├── app/
│   ├── (dashboard)/          # Route group - 사이드바 레이아웃 적용
│   │   ├── layout.tsx        # 클라이언트 컴포넌트 (Sidebar + Header)
│   │   ├── page.tsx          # 대시보드 (서버 컴포넌트, DB에서 브리핑 조회)
│   │   └── settings/
│   │       └── page.tsx      # 설정 페이지 (브리핑 소스 관리)
│   └── api/
│       └── briefing/
│           ├── route.ts          # GET: 브리핑 목록
│           ├── collect/route.ts  # POST: 수집 트리거
│           └── sources/
│               ├── route.ts      # GET/POST: 소스 CRUD
│               └── [id]/route.ts # DELETE/PATCH: 개별 소스
├── components/
│   ├── layout/               # Sidebar, Header
│   ├── dashboard/            # WorkStatusWidget, ScheduleWidget, BriefingWidget
│   ├── settings/             # AddSourceForm, SourceList, CollectButton, SourceTypeBadge
│   └── ui/                   # Button, Card 등 기본 UI
├── lib/
│   ├── briefing/
│   │   ├── collector.ts      # 수집 오케스트레이터
│   │   └── scrapers/         # base, website, telegram, factory
│   ├── prisma.ts             # Prisma 클라이언트 싱글톤
│   └── utils.ts              # cn(), formatDate(), formatDateTime()
├── stores/
│   └── sidebar-store.ts      # Zustand 사이드바 상태
└── types/
    ├── briefing.ts           # ScrapingConfig, CollectedArticle 타입
    ├── dashboard.ts          # NavItem, WorkStatusItem 등
    └── index.ts              # 공통 타입
```

## 한국어 용어 규칙

- 앱 이름: **새움터** (영문: CNW Center)
- 대시보드 타이틀: **오늘의 새움터**
- "근골격계 조사" 사용 금지 → **근골격계유해요인조사** (정식) / **근골조사** (줄임)

## 주요 명령어

```bash
docker compose up -d          # PostgreSQL 시작
npx prisma db push            # 스키마 동기화
npx prisma studio             # DB GUI
npm run dev                   # 개발 서버 (localhost:3000)
npm run build                 # 프로덕션 빌드
```

## 구현 완료

- [x] 대시보드 레이아웃 (사이드바 + 헤더 + 반응형)
- [x] 일일 브리핑 시스템 (소스 관리, 웹사이트/텔레그램 스크래핑, 수집 트리거)
- [x] 설정 페이지 (소스 추가/삭제/활성화 토글)
- [x] 대시보드 위젯 3종 (업무현황, 일정, 브리핑)

## 미구현 / 예정

- [ ] 업무현황 위젯 실데이터 연동 (현재 mock)
- [ ] 일정 위젯 실데이터 연동 (현재 mock)
- [ ] 상담 관리 페이지 (/counseling)
- [ ] 위험성평가 페이지 (/risk-assessment)
- [ ] 근골조사 페이지 (/musculoskeletal)
- [ ] 사용자 인증 (NextAuth)
- [ ] kosha.or.kr 스크래핑 (JS 렌더링 필요 - 보류)
- [ ] VPS 배포 + cron 스케줄링

## 배포 계획

- **VPS** 가상서버호스팅 사용 예정
- PostgreSQL은 Docker로 운영
- 브리핑 수집: 시스템 cron으로 매일 1회 (`curl -X POST` + API 키 인증)
- 환경변수 `BRIEFING_COLLECT_SECRET`으로 수집 API 보호

## 주의사항

- `npm run build` 후 스타일이 깨지면: node 프로세스 전체 종료 → `.next` 삭제 → `npm run dev` 재시작
- SQLite 사용 불가 (enum, @db.Text 사용 중)
- kosha.or.kr은 JS 렌더링 사이트라 cheerio로 스크래핑 불가
