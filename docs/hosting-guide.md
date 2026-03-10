# 새움터(CNW Center) 서버 호스팅 가이드

## 1. 호스팅 서비스 요구사항

### 1-1. 서버 사양

| 항목 | 최소 사양 | 권장 사양 |
|------|-----------|-----------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| 스토리지 | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| 네트워크 | 1Gbps, 무제한 트래픽 | 1Gbps, 무제한 트래픽 |

> **RAM 4GB 필수 이유**: Playwright(Chromium) 브리핑 스크래핑이 ~500MB 메모리 사용, PostgreSQL + Node.js + Next.js 서버 동시 운영

### 1-2. 필수 기능

- **Root(sudo) 접근**: 패키지 설치, 서비스 설정 필요
- **고정 공인 IP**: 도메인 DNS A 레코드 연결용
- **포트 개방**: 22(SSH), 80(HTTP), 443(HTTPS)
- **Docker 지원** (선택): PostgreSQL을 Docker로 운영할 경우

### 1-3. 권장 호스팅 서비스

| 서비스 | 최소 플랜 | 월 비용(참고) | 비고 |
|--------|-----------|---------------|------|
| **Vultr** | High Performance 4GB | ~$24/월 | 서울 리전, 시간 단위 과금 |
| **DigitalOcean** | Premium Droplet 4GB | ~$24/월 | 싱가포르 리전 (서울 없음) |
| **Linode (Akamai)** | Dedicated 4GB | ~$36/월 | 도쿄 리전 |
| **AWS Lightsail** | 4GB | ~$20/월 | 서울 리전, 고정IP 무료 |
| **Cafe24 VPS** | VPS 4GB | ~₩22,000/월 | 국내, 한국어 지원 |
| **iwinv** | VPS 4GB | ~₩20,000/월 | 국내, 한국어 지원 |

> **추천**: 해외 서비스는 **Vultr**(서울 리전, 가성비), 국내 서비스는 **Cafe24 VPS** 또는 **iwinv**

### 1-4. 도메인 & DNS

- 도메인 등록: 가비아, 호스팅케이알, Cloudflare 등
- DNS A 레코드: `saewoomter.org` → 서버 공인 IP
- SSL 인증서: Let's Encrypt (무료, Certbot 자동 갱신)

---

## 2. 호스팅 서비스 신청 후 작업 절차

### Phase 1: 서버 초기 설정

```bash
# 1. SSH 접속
ssh root@서버IP

# 2. 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 3. 배포용 사용자 생성
sudo adduser deploy
sudo usermod -aG sudo deploy

# 4. SSH 키 설정 (로컬에서)
ssh-copy-id deploy@서버IP

# 5. SSH 보안 강화 (/etc/ssh/sshd_config)
# - PermitRootLogin no
# - PasswordAuthentication no
sudo systemctl restart sshd

# 6. 방화벽 설정
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Phase 2: Node.js 설치

```bash
# nvm 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Node.js 20 LTS 설치
nvm install 20
nvm use 20
nvm alias default 20

# 확인
node -v  # v20.x.x
npm -v   # 10.x.x
```

### Phase 3: PostgreSQL 15 설치

#### 방법 A: 직접 설치 (권장)

```bash
# PostgreSQL 공식 저장소 추가
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# 설치
sudo apt install postgresql-15 -y

# DB 및 사용자 생성
sudo -u postgres psql
```

```sql
CREATE USER cnwuser WITH PASSWORD '강력한비밀번호';
CREATE DATABASE cnwcenter OWNER cnwuser;
GRANT ALL PRIVILEGES ON DATABASE cnwcenter TO cnwuser;
\q
```

```bash
# 외부 접속 허용 (필요한 경우만)
# /etc/postgresql/15/main/pg_hba.conf 수정
# /etc/postgresql/15/main/postgresql.conf에서 listen_addresses 수정
sudo systemctl restart postgresql
```

#### 방법 B: Docker 사용

```bash
# Docker 설치
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker deploy

# docker-compose.yml (프로젝트에 이미 포함)
docker compose up -d
```

### Phase 4: Playwright 의존성 설치

```bash
# Chromium 실행에 필요한 시스템 라이브러리
sudo apt install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
  libasound2 libxshmfence1 fonts-noto-cjk

# Playwright Chromium 설치 (프로젝트 디렉토리에서)
npx playwright install chromium
```

### Phase 5: 프로젝트 배포

```bash
# deploy 사용자로 전환
su - deploy

# 프로젝트 클론
git clone https://github.com/your-username/cnwcenter.git /home/deploy/cnwcenter
cd /home/deploy/cnwcenter

# 의존성 설치
npm ci

# 환경변수 설정
cp .env.example .env
nano .env
```

**.env 파일 설정:**

```bash
# === 필수 변경 항목 ===
DATABASE_URL="postgresql://cnwuser:강력한비밀번호@localhost:5432/cnwcenter?schema=public"
NEXTAUTH_URL="https://saewoomter.org"  # 실제 도메인
NEXTAUTH_SECRET="openssl rand -base64 32 결과값"

# === 선택 항목 ===
GOOGLE_CLIENT_ID="Google OAuth 클라이언트 ID"
GOOGLE_CLIENT_SECRET="Google OAuth 시크릿"
BRIEFING_COLLECT_SECRET="브리핑수집용시크릿키"
ANTHROPIC_API_KEY="sk-ant-..."

# === 외부 API ===
KOSHA_API_KEY=""  # 안전보건공단 MSDS 화학물질 조회 API 키
```

> **KOSHA_API_KEY**: 위험성평가 > 화학물질에서 안전보건공단 MSDS 데이터를 조회할 때 사용. 미설정 시 해당 기능만 비활성화되며 앱 전체 동작에는 영향 없음.

```bash
# DB 마이그레이션 및 시드
npx prisma db push
npx prisma generate
npm run db:seed  # 관리자 계정(admin@saewoomter.org / admin1234) + 설문 템플릿 3종

# 프로덕션 빌드
npm run build

# 테스트 실행 (포트 3000)
npm start
```

> **첫 배포 후**: 반드시 웹에서 관리자 계정으로 로그인하여 비밀번호를 변경하세요.

### Phase 6: PM2 프로세스 매니저

```bash
# PM2 설치
npm install -g pm2

# ecosystem 설정 파일 생성
cat > /home/deploy/cnwcenter/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'cnwcenter',
    script: 'npm',
    args: 'start',
    cwd: '/home/deploy/cnwcenter',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/deploy/cnwcenter/logs/error.log',
    out_file: '/home/deploy/cnwcenter/logs/output.log',
    merge_logs: true
  }]
}
EOF

# 로그 디렉토리 생성
mkdir -p /home/deploy/cnwcenter/logs

# PM2로 앱 시작
pm2 start ecosystem.config.js
pm2 save

# 서버 재부팅 시 자동 시작
pm2 startup
# 출력된 명령어를 sudo로 실행
```

### Phase 7: Nginx + SSL (Let's Encrypt)

```bash
# Nginx 설치
sudo apt install nginx -y

# 사이트 설정
sudo nano /etc/nginx/sites-available/cnwcenter
```

```nginx
server {
    listen 80;
    server_name saewoomter.org www.saewoomter.org;

    # Let's Encrypt 인증용 (certbot이 사용)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # HTTP → HTTPS 리다이렉트
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name saewoomter.org www.saewoomter.org;

    # SSL 인증서 (certbot이 자동 설정)
    ssl_certificate /etc/letsencrypt/live/saewoomter.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/saewoomter.org/privkey.pem;

    # 보안 헤더
    # (Next.js에서 poweredByHeader: false로 X-Powered-By 헤더 이미 제거됨)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # 업로드 크기 제한 (첨부파일)
    client_max_body_size 50M;

    # Next.js 리버스 프록시
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 타임아웃 (Playwright 스크래핑 대비)
        proxy_read_timeout 120s;
        proxy_connect_timeout 30s;
    }

    # 정적 파일 캐싱
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/cnwcenter /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # 기본 설정 제거
sudo nginx -t  # 문법 검증
sudo systemctl reload nginx

# Let's Encrypt SSL 인증서 발급
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d saewoomter.org -d www.saewoomter.org

# 자동 갱신 확인
sudo certbot renew --dry-run
```

### Phase 8: Cron 스케줄링 (브리핑 수집)

```bash
# crontab 편집
crontab -e
```

```cron
# 매일 오전 6시 브리핑 수집
0 6 * * * curl -s -X POST https://saewoomter.org/api/briefing/collect \
  -H "Content-Type: application/json" \
  -H "x-collect-secret: 브리핑수집용시크릿키" \
  >> /home/deploy/cnwcenter/logs/briefing-cron.log 2>&1

# 매일 오전 6시 30분 AI 분석
30 6 * * * curl -s -X POST https://saewoomter.org/api/briefing/analyze \
  -H "Content-Type: application/json" \
  -H "x-collect-secret: 브리핑수집용시크릿키" \
  >> /home/deploy/cnwcenter/logs/briefing-cron.log 2>&1

# Let's Encrypt 인증서 자동 갱신 (매월 1일)
0 3 1 * * sudo certbot renew --quiet
```

### Phase 9: 업데이트 배포 스크립트

```bash
# 배포 스크립트 생성
cat > /home/deploy/cnwcenter/deploy.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="/home/deploy/cnwcenter"
cd $APP_DIR

echo "$(date) - 배포 시작"

# 최신 코드 가져오기
git pull origin main

# 의존성 업데이트
npm ci

# Prisma 스키마 동기화 (인덱스 변경 포함)
npx prisma db push
npx prisma generate

# Playwright Chromium 최신화 (브리핑 스크래핑용)
npx playwright install chromium

# 프로덕션 빌드
npm run build

# PM2 재시작
pm2 restart cnwcenter

echo "$(date) - 배포 완료"
EOF

chmod +x /home/deploy/cnwcenter/deploy.sh
```

이후 업데이트 시:

```bash
cd /home/deploy/cnwcenter
./deploy.sh
```

---

## 3. 체크리스트

| 단계 | 항목 | 확인 |
|------|------|------|
| Phase 1 | SSH 키 인증, root 로그인 차단, 방화벽 | ☐ |
| Phase 2 | Node.js 20 LTS 설치 확인 | ☐ |
| Phase 3 | PostgreSQL 15 동작, cnwcenter DB 생성 | ☐ |
| Phase 4 | Playwright Chromium 설치, 한글 폰트 | ☐ |
| Phase 5 | .env 설정 (KOSHA_API_KEY 포함), DB 시드, npm run build 성공 | ☐ |
| Phase 6 | PM2 시작, pm2 startup 등록 | ☐ |
| Phase 7 | Nginx 프록시, SSL 인증서 발급, HTTPS 접속 | ☐ |
| Phase 8 | 브리핑 cron 등록, 수동 실행 테스트 | ☐ |
| Phase 9 | deploy.sh 스크립트 실행 테스트 | ☐ |
| 보안 | 관리자 초기 비밀번호 변경 (admin1234 → 강력한 비밀번호) | ☐ |
| 보안 | uploads 디렉토리 권한 확인 (750) | ☐ |

---

## 4. 운영 관리 명령어

### 기본 상태 확인

```bash
# 앱 상태 확인
pm2 status
pm2 logs cnwcenter --lines 50

# 앱 재시작
pm2 restart cnwcenter

# Nginx 상태
sudo systemctl status nginx
sudo nginx -t && sudo systemctl reload nginx

# PostgreSQL 상태
sudo systemctl status postgresql

# 시스템 리소스
df -h          # 디스크 사용량
free -h        # 메모리 사용량
htop           # CPU/메모리 실시간 모니터링
```

### DB 백업 & 복원

```bash
# DB 백업 (수동)
pg_dump -U cnwuser cnwcenter > backup_$(date +%Y%m%d).sql

# DB 복원
psql -U cnwuser cnwcenter < backup_20260306.sql

# 자동 백업 cron 추가 (매일 새벽 2시)
# crontab -e 에 아래 추가:
0 2 * * * pg_dump -U cnwuser cnwcenter | gzip > /home/deploy/backups/cnwcenter_$(date +\%Y\%m\%d).sql.gz 2>&1
# 30일 이상 된 백업 자동 삭제
0 3 * * * find /home/deploy/backups -name "*.sql.gz" -mtime +30 -delete
```

```bash
# 백업 디렉토리 생성
mkdir -p /home/deploy/backups
```

### 로그 관리

```bash
# PM2 로그 확인
pm2 logs cnwcenter --err --lines 100    # 에러 로그만
pm2 logs cnwcenter --out --lines 100    # 출력 로그만

# 브리핑 cron 로그 확인
tail -f /home/deploy/cnwcenter/logs/briefing-cron.log

# PM2 로그 로테이션 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 트러블슈팅

```bash
# 빌드 후 스타일 깨질 때
pm2 stop cnwcenter
rm -rf /home/deploy/cnwcenter/.next
cd /home/deploy/cnwcenter && npm run build
pm2 start cnwcenter

# Prisma 클라이언트 오류 시
npx prisma generate
pm2 restart cnwcenter

# Playwright 스크래핑 실패 시 (Chromium 관련)
npx playwright install chromium --with-deps
```

---

## 5. 보안 체크리스트

### 서버 보안

- [ ] SSH 비밀번호 인증 비활성화 (키 인증만)
- [ ] root 원격 로그인 비활성화
- [ ] UFW 방화벽 활성화 (22, 80, 443만 허용)
- [ ] fail2ban 설치 (SSH 브루트포스 방지)
- [ ] 정기 시스템 업데이트 (`sudo apt update && sudo apt upgrade`)

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### 애플리케이션 보안

- [ ] `.env` 파일 권한 제한 (`chmod 600 .env`)
- [ ] `NEXTAUTH_SECRET` 강력한 랜덤값 사용 (`openssl rand -base64 32`)
- [ ] PostgreSQL 비밀번호 강력한 값 사용
- [ ] 관리자 초기 비밀번호 변경 (시드 기본값 `admin1234` → 즉시 변경)
- [ ] `KOSHA_API_KEY` 등 외부 API 키가 소스코드에 하드코딩되지 않았는지 확인
- [ ] `uploads/` 디렉토리 권한 확인 (`chmod 750`, 소유자: deploy)

### 내장 보안 기능 (코드에 이미 적용됨)

아래 보안 기능은 코드 레벨에서 이미 적용되어 있으며, 별도 설정 불필요:

| 기능 | 설명 | 위치 |
|------|------|------|
| **X-Powered-By 제거** | `poweredByHeader: false`로 기술스택 노출 방지 | `next.config.js` |
| **API 인증 공통화** | 모든 API에 `requireAuth()` / `requireStaffOrAbove()` 패턴 적용 | `src/lib/auth-utils.ts` |
| **API 공통 에러 처리** | `parseJsonBody()`, `handleApiError()` 등 6개 공통 유틸 | `src/lib/api-utils.ts` |
| **파일 업로드 검증** | 파일 타입 화이트리스트 + 최대 20MB 크기 제한 | 각 upload API route |
| **Enum 검증** | `validateEnum()`으로 서버 측 입력값 검증 | API route 내 사용 |
| **경합조건 방지** | 케이스 번호 자동생성 시 unique constraint 재시도 (최대 3회) | `counseling/route.ts` |
| **에러 페이지** | 404, 500, global-error, dashboard-error 4종 | `src/app/` |
| **RBAC 미들웨어** | 역할(SUPER_ADMIN/STAFF/WORKPLACE_USER) + 상태(APPROVED) 기반 라우트 보호 | `src/middleware.ts` |
| **이미지 최적화** | AVIF + WebP 포맷 자동 변환 | `next.config.js` |

### DB 보안 & 성능

- [ ] DB 정기 백업 스크립트 구성 (아래 운영 관리 섹션 참고)
- [ ] PostgreSQL 외부 접속 차단 (localhost만 허용, 기본값)

아래 인덱스는 Prisma 스키마에 이미 포함되어 `prisma db push` 시 자동 생성됨:

```
MusculoskeletalAssessment: @@index([createdById])  — 조사자 기준 조회 최적화
CollectionLog: @@index([status])                   — 브리핑 수집 상태 필터링 최적화
```
