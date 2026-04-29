# CNW Center — 노동안전보건 통합 업무관리시스템

노동안전보건 활동 단체를 위한 웹 기반 통합 업무관리 플랫폼입니다.  
충남노동건강인권센터 새움터에서 실제 사용 중인 시스템으로, 상담·위험성평가·근골격계 조사 등 현장 업무를 하나의 플랫폼에서 관리합니다.

> 🌐 라이브 서비스: [saeum.space](https://saeum.space)

---

## 주요 기능

### 📋 상담 관리
- 산재 피해자 상담 케이스 생성·기록·이력 관리
- 케이스별 담당자 배정 및 진행 상태 추적
- 휴지통(소프트 삭제) 지원

### 📰 AI 뉴스 브리핑
- 5개 노동·안전 언론사 뉴스 매일 자동 수집 (06:00)
- Claude AI 자동 분석 및 요약 (06:30)
- 브리핑 히스토리 조회

### ⚠️ 위험성평가 시스템
- 사업장별 위험성평가 등록·수행·개선 관리
- 화학물질 취급 기록
- 평가 보고서 생성

### 🦴 근골격계 유해요인 조사
- 조사표 작성 및 관리
- 개선 계획 수립·추적
- 결과 보고서 출력

### 🏭 사업장 관리
- 사업장 기본 정보 등록 및 관리
- 사업장별 상담·평가 이력 연동

### 📅 일정 관리
- 팀 공유 캘린더
- 드래그앤드롭 일정 조정

### 📌 게시판 / 공지사항
- 내부 공지 및 자료 공유
- 영상 자료 관리

### 🔍 법령 검색
- 노동안전보건 관련 법령 검색 기능

### 👤 회원·관리자 기능
- NextAuth 기반 인증 (이메일/비밀번호)
- 권한 관리 (ADMIN / STAFF)
- QR코드 기반 기능

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS, shadcn/ui |
| 데이터베이스 | PostgreSQL + Prisma ORM |
| 인증 | NextAuth.js |
| AI | Anthropic Claude API |
| 이메일 | Resend |
| 구글 연동 | Google Calendar API |
| 상태 관리 | Zustand |
| 파일 처리 | exceljs, xlsx, pdf-parse, mammoth |

---

## 로컬 개발 환경 설정

### 사전 요구사항
- Node.js 18+
- PostgreSQL (또는 Docker)
- Anthropic API Key

### 1. 저장소 클론 및 의존성 설치
```bash
git clone https://github.com/ho-daddy/cnwcenter.git
cd cnwcenter
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 아래 항목을 입력하세요.

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cnwcenter"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="your-anthropic-api-key"
BRIEFING_API_KEY="your-internal-api-key"
```

### 3. Docker로 PostgreSQL 실행 (선택)
```bash
docker compose up -d
```

### 4. 데이터베이스 초기화
```bash
npm run db:push
npm run db:seed   # 초기 데이터 (선택)
```

### 5. 개발 서버 실행
```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인하세요.

---

## 자동화 (배포 환경)

| 시각 | 작업 |
|------|------|
| 매일 06:00 | 뉴스 자동 수집 (cron → `/api/briefing/collect`) |
| 매일 06:30 | Claude AI 자동 분석 (cron → `/api/briefing/analyze`) |

---

## 배포

```bash
./deploy.sh
```

Nginx + PM2 환경에서 운영 중입니다.

---

## 만든 곳

**새움터 — 충남노동건강인권센터**  
노동자의 건강과 인권을 위해 활동하는 충남 지역 노동안전보건 단체입니다.

- 홈페이지: [center.saeum.space](https://center.saeum.space)
- 플랫폼: [saeum.space](https://saeum.space)

---

## 라이선스

이 시스템은 노동안전보건 활동 단체의 실무 도구로 개발되었습니다.  
관심 있는 단체는 자유롭게 참고하거나 커스터마이즈하여 사용하실 수 있습니다.
