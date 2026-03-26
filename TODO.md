# CNW Center TODO

## 브리핑 기능

### 날짜별 브리핑 페이지 미구현
**문제:** `/briefing/yyyy-MM-dd` 경로로 링크되지만 페이지 없음 → 404

**위치:**
- Link: `src/components/settings/report-history.tsx:25`
- Target: `src/app/(dashboard)/briefing/[date]/page.tsx` (미생성)

**해결:**
1. 페이지 생성: `src/app/(dashboard)/briefing/[date]/page.tsx`
2. API 엔드포인트: `src/app/api/briefing/[date]/route.ts`
3. DB 조회: `dailyReport` + `article` join

**우선순위:** 낮음 (기능 사용되지 않음)

---

생성일: 2026-03-27
