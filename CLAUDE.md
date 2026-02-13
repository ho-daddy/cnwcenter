# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

새움터 (CNW Center) — 산업재해 예방 및 상담 통합 업무관리시스템 (Industrial accident prevention and counseling management system). Built with Next.js 14 App Router, TypeScript, PostgreSQL, and Prisma.

## Commands

```bash
# Development
npm run dev                   # Dev server (localhost:3000)
npm run build                 # Production build
npm run lint                  # ESLint

# Database (requires PostgreSQL running)
docker compose up -d          # Start PostgreSQL 15 container
npm run db:push               # Sync Prisma schema to database
npm run db:generate           # Regenerate Prisma client
npm run db:studio             # Prisma Studio (DB GUI, localhost:5555)
npm run db:seed               # Create initial admin user (tsx prisma/seed.ts)
```

No test framework is configured.

## Environment Setup

Copy `.env.example` to `.env`. Key variables:
- `DATABASE_URL` — PostgreSQL connection string (default: `postgresql://cnwuser:cnwpass@localhost:5432/cnwcenter`)
- `NEXTAUTH_SECRET` — Required for NextAuth JWT
- `BRIEFING_COLLECT_SECRET` — API key for external cron to trigger briefing collection
- `ANTHROPIC_API_KEY` — Claude API for AI briefing analysis
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Optional Google OAuth

## Architecture

### Route Groups and Layouts

The app uses Next.js route groups to apply different layouts:

- `(auth)/` — Login, register, pending-approval pages. No sidebar.
- `(dashboard)/` — All authenticated pages. Shares a client-component layout with collapsible sidebar + header.

Pages within `(dashboard)/`: dashboard home, `calendar/`, `workplaces/`, `musculoskeletal/`, `settings/`, `admin/`.

### Authentication & Authorization

NextAuth.js with JWT strategy (`src/lib/auth.ts`). Two providers: CredentialsProvider (email/password with bcrypt) and GoogleProvider (optional).

**User lifecycle**: Register → PENDING status → Admin approves → APPROVED. PENDING users are redirected to `/pending-approval`. REJECTED/SUSPENDED users are blocked at login.

**RBAC** (enforced in `src/middleware.ts`):
- `SUPER_ADMIN` — Full access including `/settings` and `/admin/users`
- `STAFF` — All features except system settings
- `WORKPLACE_USER` — Limited to assigned workplaces' risk assessments and musculoskeletal surveys

API routes handle their own auth checks (middleware passes non-auth API routes through).

### Briefing System (News Collection)

Automated news/press release scraping system:

- **Source definitions**: `src/lib/briefing/sources.ts` — Hardcoded list of government/media sources (MOEL, KOSHA, policy sites, news)
- **Scrapers**: `src/lib/briefing/scrapers/` — ~15 scraper implementations. Base class in `base.ts`, factory pattern in `factory.ts`. Uses cheerio for HTML parsing, Playwright for JS-rendered sites.
- **Collector**: `src/lib/briefing/collector.ts` — Orchestrates scraping across all active sources
- **Keywords**: `src/lib/briefing/keywords.ts` — Priority classification (critical/high/medium/low/none)
- **AI Analysis**: `src/lib/briefing/analysis-service.ts` — Uses Anthropic Claude API to generate daily analysis reports
- **API**: `POST /api/briefing/collect` (protected by `BRIEFING_COLLECT_SECRET`)

### Musculoskeletal Assessment (근골격계유해요인조사)

The most complex domain model. Implements a 4-sheet survey form:
- Sheet 1: Management card (worker info, work conditions, risk factors)
- Sheet 2-3: Element work analysis (per-task RULA/REBA scoring, body part assessments)
- Sheet 4: Overall evaluation and improvement recommendations

Key schema relationships: `Workplace` → `Organization` → `OrganizationUnit` (5-level hierarchy) → `MusculoskeletalAssessment` → `ElementWork` → `BodyPartScore`

Unique constraint: one assessment per organization unit per year per assessment type.

### Workplace & Organization

`Workplace` has a single `Organization` which contains a tree of `OrganizationUnit` nodes (self-referencing, up to 5 levels deep). When an organization unit is deleted, any linked assessments are archived to `ArchivedAssessment` as JSON snapshots.

### State Management

- **Server Components** are the default for data fetching (direct Prisma queries)
- **Zustand** for client-side UI state (sidebar toggle in `src/stores/sidebar-store.ts`)
- **NextAuth session** for auth state propagated via `SessionProvider` wrapper

### UI Components

Uses shadcn/ui patterns: components in `src/components/ui/` (Button, Card, etc.) built with `class-variance-authority`, `clsx`, and `tailwind-merge`. The `cn()` utility in `src/lib/utils.ts` merges Tailwind classes.

## 한국어 용어 규칙

- 앱 이름: **새움터** (영문: CNW Center)
- 대시보드 타이틀: **오늘의 새움터**
- "근골격계 조사" 사용 금지 → **근골격계유해요인조사** (정식) / **근골조사** (줄임)

## Caveats

- SQLite cannot be substituted — schema uses PostgreSQL enums and `@db.Text`
- If styles break after `npm run build`: kill all Node processes → delete `.next/` → restart `npm run dev`
- kosha.or.kr requires JS rendering; cheerio-only scraping does not work for it
- Prisma client singleton pattern in `src/lib/prisma.ts` — always import from there
