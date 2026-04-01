# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SGEI (Sistema de Gestão de Equipamentos Informáticos) — a multi-institution IT equipment management system. Portuguese-language UI targeting schools and organizations.

- **Backend:** NestJS 10 + Prisma ORM + PostgreSQL 16 (port 3001)
- **Frontend:** Next.js 14 App Router + Tailwind CSS + Zustand (port 3000)
- **Real-time:** Socket.io (backend gateway + client)
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

Modules: auth, users, institutions, equipment, equipment-types, rooms, maintenance, movements, requests, notifications, messages, upload, websocket, audit, reports, schedules, favorite-rooms, assistance-requests.

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
- All API endpoints centralized in `src/lib/api/index.ts` as method objects (e.g., `equipmentApi.getAll()`).
- Forms use React Hook Form + Zod validation.
- Next.js rewrites proxy `/api/*` and `/uploads/*` to the backend URL.
- Path alias: `@/*` maps to `./src/*`.

### Database

- Prisma schema: `backend/prisma/schema.prisma`
- Multi-tenant via `Institution` model — most entities have `institutionId`.
- Soft deletes: `deletedAt` field on key models.
- Audit trail: `AuditLog` model tracks changes system-wide.
- Seed creates demo institution + users: `admin@sgei.pt` / `Admin@1234`, `tecnico@sgei.pt` / `Tech@1234`.

### Real-time

- WebSocket gateway at `backend/src/websocket/` uses Socket.io with JWT authentication.
- Room-based broadcasting: `user:<id>`, `institution:<id>`, `ticket:<id>`.

## Environment

Backend expects `.env` (see `backend/.env.example`). Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — Token signing
- `FRONTEND_URL` — CORS origin

Frontend uses `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api/v1`).

Docker Compose DB credentials: `gestequip` / `gestequip` / `gestequip` (user/pass/db).
