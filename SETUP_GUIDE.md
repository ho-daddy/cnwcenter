# CNW Center 설치 및 시작 가이드

## 초보자를 위한 단계별 설명

### 1단계: 필수 프로그램 설치

#### Node.js 설치
1. [Node.js 공식 웹사이트](https://nodejs.org/)에서 LTS 버전 다운로드
2. 설치 파일 실행 후 모든 기본 옵션으로 설치
3. 설치 확인:
```bash
node --version
npm --version
```

#### PostgreSQL 설치 (데이터베이스)
1. [PostgreSQL 공식 웹사이트](https://www.postgresql.org/download/)에서 다운로드
2. 설치 중 비밀번호 설정 (기억하세요!)
3. 기본 포트: 5432

또는 **Docker를 사용하는 간단한 방법** (추천):
```bash
# Docker Desktop 설치 후
docker run --name cnw-postgres -e POSTGRES_PASSWORD=mypassword -p 5432:5432 -d postgres
```

---

### 2단계: 프로젝트 의존성 설치

Visual Studio Code에서 터미널을 열고 cnwcenter 폴더로 이동:
```bash
cd cnwcenter
npm install
```

이 명령어는 package.json에 정의된 모든 필요한 라이브러리를 설치합니다.

---

### 3단계: 환경 변수 설정

1. `.env.example` 파일을 복사하여 `.env` 파일 생성
2. `.env` 파일을 열고 다음 값을 수정:

```env
# PostgreSQL 연결 정보
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/cnwcenter?schema=public"

# NextAuth 보안 키 (아무 문자열이나 입력)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="여기에-아무-긴-문자열-입력"
```

**설명:**
- `postgres`: 기본 사용자명
- `mypassword`: PostgreSQL 설치 시 설정한 비밀번호
- `localhost:5432`: 로컬 데이터베이스 주소
- `cnwcenter`: 데이터베이스 이름

---

### 4단계: 데이터베이스 초기화

```bash
# PostgreSQL에 데이터베이스 생성
# PostgreSQL 클라이언트 또는 pgAdmin에서 'cnwcenter' 데이터베이스 생성

# Prisma로 데이터베이스 스키마 생성
npm run db:push
```

---

### 5단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 주요 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `npm install` | 프로젝트 의존성 설치 |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run db:push` | 데이터베이스 스키마 업데이트 |
| `npm run db:studio` | Prisma Studio (데이터베이스 GUI) 실행 |

---

## 문제 해결

### 포트 충돌 오류
```
Error: Port 3000 is already in use
```
**해결책:** 다른 프로그램이 3000 포트를 사용 중입니다.
- Windows: `netstat -ano | findstr :3000` 후 프로세스 종료
- 또는 다른 포트 사용: `npm run dev -- -p 3001`

### 데이터베이스 연결 오류
```
Error: Can't reach database server
```
**해결책:**
1. PostgreSQL이 실행 중인지 확인
2. `.env` 파일의 `DATABASE_URL` 확인
3. 비밀번호, 포트 번호가 정확한지 확인

### 의존성 설치 오류
```
npm ERR! code ENOENT
```
**해결책:**
1. Node.js가 제대로 설치되었는지 확인
2. `package.json` 파일이 있는 폴더에서 실행 중인지 확인

---

## 다음 단계

설치가 완료되면 다음 순서로 개발을 진행합니다:

1. ✅ **프로젝트 초기 설정** (완료)
2. 📌 **메인 대시보드 UI 구축**
3. 📌 **사용자 인증 시스템**
4. 📌 **상담 관리 시스템**
5. 📌 **위험성평가 시스템**
6. 📌 **근골격계 유해요인 조사 시스템**
7. 📌 **뉴스 브리핑 API 연동**

각 단계는 순차적으로 진행하며, 이전 단계가 완료되어야 다음 단계로 넘어갑니다.

---

## 도움이 필요하면

- Next.js 공식 문서: https://nextjs.org/docs
- Prisma 공식 문서: https://www.prisma.io/docs
- Tailwind CSS 공식 문서: https://tailwindcss.com/docs

---

## 프로덕션 배포 가이드

### 서버 배포 스크립트

 스크립트를 사용하여 자동 배포:

```bash
chmod +x deploy.sh
./deploy.sh
```

**스크립트 내용:**
- Git에서 최신 코드 pull
- 의존성 업데이트 (npm ci)
- Prisma 스키마 동기화
- 프로덕션 빌드
- PM2로 앱 재시작

### PM2 프로세스 관리

```bash
# 앱 시작
pm2 start ecosystem.config.js

# 앱 재시작
pm2 restart cnwcenter

# 로그 확인
pm2 logs cnwcenter

# 상태 확인
pm2 status
```

---

## 자동 브리핑 수집 설정 (Cron)

매일 자동으로 노동안전 뉴스 브리핑을 수집하고 AI 분석을 실행합니다.

### Cron 설정 방법

1. **Crontab 편집:**
```bash
crontab -e
```

2. **다음 내용 추가:**
```cron
# 매일 오전 6시 브리핑 수집
0 6 * * * curl -s -X POST https://yourdomain.com/api/briefing/collect -H Content-Type: application/json -H x-api-key: YOUR_SECRET_KEY >> /home/deploy/cnwcenter/logs/briefing-cron.log 2>&1

# 매일 오전 6시 30분 AI 분석
30 6 * * * curl -s -X POST https://yourdomain.com/api/briefing/analyze -H Content-Type: application/json -H x-api-key: YOUR_SECRET_KEY >> /home/deploy/cnwcenter/logs/briefing-cron.log 2>&1
```

3. **.env에서 API 키 확인:**
```bash
grep BRIEFING_COLLECT_SECRET .env
```

4. **로그 확인:**
```bash
tail -f ~/cnwcenter/logs/briefing-cron.log
```

### 중요 사항

- **API 키 인증:** Cron 작업은 `x-api-key` 헤더로 인증합니다
- **Public Path:** `/api/briefing`은 middleware에서 공개 경로로 설정되어 있습니다
- **로그 저장:** 모든 실행 결과는 `logs/briefing-cron.log`에 저장됩니다

---

## 환경변수 (프로덕션)

프로덕션 서버의 `.env` 파일에 다음 설정 필요:

```env
# 브리핑 자동 수집 보안 키
BRIEFING_COLLECT_SECRET=cnw-briefing-your-secret-key

# Anthropic API (AI 분석)
ANTHROPIC_API_KEY=sk-ant-...

# Google OAuth (로그인)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# 화학물질 정보 API
KOSHA_API_KEY=...
```

---

## 파일 업로드 설정 (중요!)

### nginx 설정

Next.js 프로덕션 모드에서는 `public/uploads/` 폴더의 파일을 직접 서빙하지 못하므로 nginx 설정이 필요합니다.

**`/etc/nginx/sites-available/cnwcenter`에 다음 추가:**

```nginx
server {
  server_name yourdomain.com;
  
  # ... 기존 설정 ...
  
  location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    expires 365d;
    add_header Cache-Control "public, immutable";
  }

  # ✨ 파일 업로드 경로 추가
  location /uploads/ {
    alias /home/deploy/cnwcenter/public/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
  
  # ... SSL 설정 등 ...
}
```

### 권한 설정

nginx가 업로드된 파일에 접근할 수 있도록 권한 설정:

```bash
# nginx가 폴더를 통과할 수 있도록 실행 권한 부여
sudo chmod o+x /home/deploy
sudo chmod o+x /home/deploy/cnwcenter
sudo chmod o+x /home/deploy/cnwcenter/public
sudo chmod o+x /home/deploy/cnwcenter/public/uploads

# 업로드된 파일에 읽기 권한 부여
sudo chmod -R o+r /home/deploy/cnwcenter/public/uploads

# nginx 재시작
sudo systemctl reload nginx
```

### 자동 권한 설정 (선택사항)

새로 업로드되는 파일에도 자동으로 권한이 적용되도록 하려면, 파일 업로드 API에서 다음 코드 추가:

```typescript
// src/app/api/upload/route.ts (예시)
import { writeFile, chmod } from 'fs/promises';

// 파일 저장 후
await writeFile(filepath, buffer);
await chmod(filepath, 0o644); // rw-r--r--
```

### 문제 해결

**증상:** 업로드는 되는데 이미지가 깨진 아이콘으로 표시됨

**원인:** nginx가 파일에 접근 못 함 (403 Forbidden)

**해결:**
1. nginx 에러 로그 확인: `sudo tail -50 /var/log/nginx/error.log`
2. "Permission denied" 에러 → 위 권한 설정 명령어 실행
3. 브라우저 캐시 삭제 후 새로고침 (Ctrl+F5)

---
