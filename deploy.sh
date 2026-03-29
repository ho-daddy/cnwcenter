#!/bin/bash
set -e

APP_DIR="/home/deploy/cnwcenter"
cd $APP_DIR

echo "$(date) - 배포 시작"

# 최신 코드 가져오기
git pull origin main

# 의존성 업데이트
npm ci

# Prisma 마이그레이션 (안전)
npx prisma migrate deploy
npx prisma generate

# 프로덕션 빌드
npm run build

# PM2 재시작
pm2 restart cnwcenter

echo "$(date) - 배포 완료"
