# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SGEI (Sistema de Gestão de Equipamentos Informáticos) — a multi-institution IT equipment management system. Portuguese-language UI targeting schools and organizations.

- **Backend:** NestJS 10 + Prisma ORM + PostgreSQL 16 (port 3001)
- **Frontend:** Next.js 14 App Router + Tailwind CSS + Zustand (port 3000)
- **Real-time:** Supabase Realtime (Presence + Broadcast) — migrated from Socket.IO
- **Database:** Supabase Postgres (`aws-1-eu-west-3.pooler.supabase.com`)
- **Deployment:** Backend + Frontend on Vercel serverless
- **Language:** TypeScript throughout

## Development Commands

### Quick Start
```bash
bash scripts/start-dev.sh   # Starts Postgres (Docker) + backend + frontend
# OR
docker compose up --build    # Full Docker stack
```

### Backend (from `backend/`)
```bash
npm run start:dev            # Dev server with watch mode
npm run build                # Production build
npm run prisma:migrate       # Create dev migration (prisma migrate dev)
npm run prisma:migrate:prod  # Apply migrations (prisma migrate deploy)
npm run prisma:seed          # Seed DB (ts-node prisma/seed.ts)
npm run prisma:studio        # Database GUI
npm run prisma:generate      # Regenerate Prisma client after schema changes
```

### Frontend (from `frontend/`)
```bash
npm run dev                  # Dev server on :3000
npm run build                # Production build
npm run lint                 # ESLint
```

### Docker
```bash
docker compose up -d         # Run all services (DB + backend + frontend)
docker compose down          # Stop all
```

No test framework is configured. No automated tests exist.

## Architecture

### Backend Module Pattern

Every feature follows the same NestJS module structure under `backend/src/<feature>/`:
- `<feature>.module.ts` — NestJS module declaration
- `<feature>.controller.ts` — HTTP endpoints (decorated with guards/roles)
- `<feature>.service.ts` — Business logic using Prisma
- `dto/` — Request validation DTOs (class-validator)

Modules: auth, users, institutions, equipment, equipment-types, rooms, maintenance, movements, requests, notifications, messages, upload, audit, reports, schedules, favorite-rooms, assistance-requests.

**Removed modules:** `websocket/` and `presence/` — real-time chat and online presence now handled entirely by Supabase Realtime on the frontend. Socket.IO dependencies (`@nestjs/platform-socket.io`, `@nestjs/websockets`, `socket.io`) removed from `package.json`.

### Auth & Guards

- JWT access + refresh tokens. Passwords hashed with argon2.
- `@Public()` decorator bypasses auth. All other routes require JWT by default (global `JwtAuthGuard`).
- `@Roles(UserRole.ADMIN)` + `RolesGuard` for role-based access.
- `@CurrentUser()` decorator extracts user from request.
- Roles: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `TEACHER`, `STAFF`.

### API Conventions

- Global prefix: `/api/v1`
- All responses wrapped by `TransformInterceptor`: `{ success: true, data: ..., timestamp: ... }`
- Global `AllExceptionsFilter` maps Prisma errors (P2002→409, P2025→404).
- Rate limiting: 100 requests per 60s (ThrottlerModule).
- Swagger docs at `/api/docs` (non-production only).

### Frontend Structure

- Route groups: `(auth)/` for login, `(dashboard)/` for protected pages.
- Dashboard layout (`(dashboard)/layout.tsx`) handles auth guard and sidebar.
- State: Zustand store in `src/store/auth.ts` with localStorage persistence. Hydration check prevents SSR mismatches.
- API client: `src/lib/api/client.ts` — Axios instance with JWT interceptor (auto-injects Bearer token, clears auth on 401).
- **Axios interceptor unwraps `res.data?.data ?? res.data`** — never chain `.data` on API responses.
- All API endpoints centralized in `src/lib/api/index.ts` as method objects (e.g., `equipmentApi.getAll()`).
- Forms use React Hook Form + Zod validation.
- Next.js rewrites proxy `/api/*` and `/uploads/*` to the backend URL.
- Path alias: `@/*` maps to `./src/*`.

### Real-time (Supabase Realtime)

**Replaced Socket.IO** — Vercel serverless cannot sustain persistent WebSocket connections (always 400/504 errors).

- **Client:** `frontend/src/lib/supabase/client.ts` — creates Supabase client + `createChatChannel()` factory
- **Chat hook:** `frontend/src/hooks/useChat.ts` — manages channel lifecycle, Presence tracking, Broadcast messaging
- **Channel:** Single global channel `chat:global` with Presence (`key: 'chat'`) + Broadcast (`ack: true`)
- **Presence flow:** On `SUBSCRIBED` → `channel.track({ userId, name, role })` → `system` events (`sync`, `join`, `leave`) fire → `getFilteredPeers()` reads `presenceState()` and filters by role rules
- **Messaging:** `channel.send({ type: 'broadcast', event: 'chat:message', payload })` → all peers receive via `channel.on('broadcast', ...)`
- **Reconnection:** Exponential backoff (1s→15s cap) on `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`
- **Cleanup:** `untrack()` + `supabase.removeChannel(channel)` on unmount
- **Chat widget:** `frontend/src/components/chat/ChatWidget.tsx` — floating panel with PeerList + ChatWindow, listens for `chat:toggle` event from sidebar
- **useSocket.ts** is a no-op stub for backward compatibility

#### Role Pairing for Chat

| My Role    | I Can See          |
|------------|--------------------|
| TECHNICIAN | TEACHER, STAFF     |
| TEACHER    | TECHNICIAN         |
| STAFF      | TECHNICIAN         |

Admin, MANAGER, etc. cannot use chat at all.

#### ⚠️ KNOWN ISSUE: Chat Presence Not Showing Online Users

Users do NOT appear online in the chat widget after the Supabase migration. Channel connects, `.track()` is called, but `presenceState()` returns empty. Full debug checklist in `CHAT_PRESENCE_TODO.md` at project root.

### Database

- Prisma schema: `backend/prisma/schema.prisma`
- **Supabase connection:** host `aws-1-eu-west-3.pooler.supabase.com`, user `postgres.pgiqdgnwaiinnnzitejp`, db `postgres`
- **Pooler ports:** Transaction `6543` (`DATABASE_URL`), Session `5432` (`DIRECT_URL`)
- Multi-tenant via `Institution` model — most entities have `institutionId`.
- Soft deletes: `deletedAt` field on key models.
- Audit trail: `AuditLog` model tracks changes system-wide.
- **User model additions:** `roleConfirmed Boolean @default(false)` (migration applied), `lastSeenAt DateTime?` (schema pushed, was for HTTP presence — now unused)
- Seed creates demo institution + users: `admin@sgei.pt` / `Admin@1234`, `tecnico@sgei.pt` / `Tech@1234`, `professor@sgei.pt` / `Teacher@1234`.

### Vercel Build Configuration

- **Backend `vercel.json`:** `buildCommand` clears old Prisma client before generating: `rm -rf node_modules/@prisma/client && npx prisma@5 generate --schema=./prisma/schema.prisma && npm run build`
- Prisma v5 must be pinned — Vercel auto-installs v7 which is incompatible.
- Both frontend and backend deployed on Vercel serverless.

## New Features (recently added)

### Building Diagram Page
- `frontend/src/app/(dashboard)/diagrama/page.tsx` — floor-by-floor building layout with equipment tooltips
- `frontend/src/components/ui/Tooltip.tsx` — reusable portal-based tooltip with edge detection

### Unread Messages Badge
- Sidebar shows unread count badge on "Chat" nav item
- `getTotalUnread()` in `useChat.ts` sums all unread counts
- Unread increments when message received and conversation not open
- Unread resets to 0 when conversation opened

### Chat Toggle from Sidebar
- Sidebar emits `chat:toggle` custom event → ChatWidget opens/closes
- `frontend/src/components/layout/Sidebar.tsx` — "Chat" nav item with badge, "Diagrama do Edifício" nav item

## Environment

### Supabase (Production)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (e.g. `https://<ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key from Settings → API
- Must be set in **Vercel frontend project** environment variables
- Realtime must be enabled: Supabase Dashboard → Database → Replication → toggle ON

### Backend
Backend expects `.env` (see `backend/.env.example`). Key variables:
- `DATABASE_URL` — PostgreSQL connection string (Supabase pooler, port 6543)
- `DIRECT_URL` — Direct connection (Supabase pooler, port 5432)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — Token signing
- `FRONTEND_URL` — CORS origin
- `NEXT_PUBLIC_WS_URL` — **DEPRECATED** — no longer used (was for Socket.IO)

### Frontend
- `NEXT_PUBLIC_API_BASE_URL` — Backend URL (defaults to `http://localhost:3001`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth (optional)
- `NEXT_PUBLIC_SUPABASE_URL` — **REQUIRED** for chat/presence
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **REQUIRED** for chat/presence

### Docker Compose
DB credentials: `gestequip` / `gestequip` / `gestequip` (user/pass/db).

## Test Accounts

| Email | Password | Role | Can Chat With |
|-------|----------|------|---------------|
| admin@sgei.pt | Admin@1234 | ADMIN | ❌ No chat access |
| tecnico@sgei.pt | Tech@1234 | TECHNICIAN | TEACHER, STAFF |
| professor@sgei.pt | Teacher@1234 | TEACHER | TECHNICIAN |
