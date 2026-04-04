# PROJECT.md — gestEquip / SGEI

> **For the AI assistant reading this:** This document is your source of truth for this project. Read it fully before doing anything. Follow the task discipline rules in the last section — they are mandatory.

---

## 1. What This Project Is

**SGEI** (Sistema de Gestão de Equipamentos Informáticos) is a multi-institution IT equipment management system. It is a Portuguese-language web application targeting schools and organizations that need to track, move, maintain, and request IT equipment across rooms and buildings.

Live deployment: https://gest-equip.vercel.app

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 10, TypeScript |
| ORM | Prisma ORM |
| Database | PostgreSQL 16 |
| Frontend | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS |
| State Management | Zustand (with localStorage persistence) |
| Forms | React Hook Form + Zod |
| Real-time | Socket.io (backend gateway + frontend client) |
| Auth | JWT (access + refresh tokens), argon2 password hashing |
| Containerization | Docker + Docker Compose |

**Backend port:** 3001  
**Frontend port:** 3000  
**DB port:** 5432

---

## 3. Repository Structure

```
gestEquip/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/             # JWT auth, guards, strategies
│   │   ├── users/
│   │   ├── institutions/
│   │   ├── equipment/
│   │   ├── equipment-types/
│   │   ├── rooms/
│   │   ├── maintenance/
│   │   ├── movements/
│   │   ├── requests/
│   │   ├── notifications/
│   │   ├── messages/
│   │   ├── upload/
│   │   ├── websocket/
│   │   ├── audit/
│   │   ├── reports/
│   │   ├── schedules/
│   │   ├── favorite-rooms/
│   │   └── assistance-requests/
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema — source of truth for data models
│   │   └── seed.ts           # Seeds demo data
│   └── Dockerfile
├── frontend/                 # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── (auth)/       # Login, public routes
│       │   └── (dashboard)/  # Protected app pages + layout
│       ├── lib/
│       │   └── api/
│       │       ├── client.ts # Axios instance with JWT interceptor
│       │       └── index.ts  # All API endpoint methods (e.g. equipmentApi.getAll())
│       ├── store/
│       │   └── auth.ts       # Zustand auth store
│       └── components/
├── scripts/
│   └── start-dev.sh          # Starts Postgres (Docker) + backend + frontend
├── docker-compose.yml
├── CLAUDE.md                 # Original AI context file
└── package.json
```

---

## 4. Backend Architecture

### Module Pattern
Every feature is a NestJS module at `backend/src/<feature>/` containing:
- `<feature>.module.ts` — NestJS module declaration
- `<feature>.controller.ts` — HTTP endpoints (decorated with guards/roles)
- `<feature>.service.ts` — Business logic using Prisma
- `dto/` — Request validation DTOs using class-validator

### API Conventions
- **Global prefix:** `/api/v1`
- **Response envelope:** All responses are wrapped by `TransformInterceptor`:
  ```json
  { "success": true, "data": ..., "timestamp": "..." }
  ```
- **Error mapping:** `AllExceptionsFilter` maps Prisma errors (P2002 → 409, P2025 → 404)
- **Rate limiting:** 100 requests per 60s (ThrottlerModule)
- **Swagger docs:** Available at `/api/docs` in non-production environments

### Auth & Guards
- JWT access tokens + refresh tokens
- `@Public()` decorator bypasses auth globally
- Global `JwtAuthGuard` protects all routes by default
- `@Roles(UserRole.ADMIN)` + `RolesGuard` for role-based access
- `@CurrentUser()` decorator extracts user from request

### Roles
`SUPER_ADMIN` | `ADMIN` | `TECHNICIAN` | `TEACHER` | `STAFF`

### Real-time (Socket.io)
- WebSocket gateway at `backend/src/websocket/`
- JWT-authenticated connections
- Room-based broadcasting: `user:<id>`, `institution:<id>`, `ticket:<id>`

---

## 5. Frontend Architecture

### Routing
- `(auth)/` — Login and public pages
- `(dashboard)/` — All protected pages, wrapped by a layout that enforces auth and renders the sidebar

### State & Auth
- Zustand store: `src/store/auth.ts` with localStorage persistence
- Hydration check in the store prevents SSR mismatches

### API Layer
- Axios instance: `src/lib/api/client.ts`
  - Auto-injects `Authorization: Bearer <token>` on every request
  - Clears auth state and redirects on 401
- All endpoints defined in `src/lib/api/index.ts` as typed method objects:
  ```ts
  equipmentApi.getAll()
  equipmentApi.getById(id)
  equipmentApi.create(dto)
  // etc.
  ```

### Forms
- React Hook Form + Zod for all form validation

### Proxying
- Next.js rewrites proxy `/api/*` and `/uploads/*` to the backend URL (configured in `next.config.js`)
- Path alias `@/*` maps to `./src/*`

---

## 6. Database

- **ORM:** Prisma — schema at `backend/prisma/schema.prisma`
- **Multi-tenancy:** `Institution` model — nearly all entities have an `institutionId` field
- **Soft deletes:** `deletedAt` field on key models (do not hard-delete, set `deletedAt`)
- **Audit trail:** `AuditLog` model tracks all changes system-wide

### Demo Seed Credentials
| Email | Password | Role |
|---|---|---|
| admin@sgei.pt | Admin@1234 | ADMIN |
| tecnico@sgei.pt | Tech@1234 | TECHNICIAN |

---

## 7. Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://gestequip:gestequip@localhost:5432/gestequip?schema=public
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:3001
```

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Docker Compose DB credentials
- User: `gestequip`
- Password: `gestequip`
- DB name: `gestequip`

---

## 8. Development Commands

### Quick Start (recommended)
```bash
bash scripts/start-dev.sh   # Starts Postgres via Docker + backend + frontend
```

### Backend (`cd backend/`)
```bash
npm run start:dev            # Dev server with watch mode
npm run build                # Production build
npm run prisma:migrate       # Create dev migration
npm run prisma:migrate:prod  # Apply migrations (production)
npm run prisma:seed          # Seed DB with demo data
npm run prisma:studio        # Open Prisma database GUI
npm run prisma:generate      # Regenerate Prisma client after schema changes
```

### Frontend (`cd frontend/`)
```bash
npm run dev                  # Dev server on :3000
npm run build                # Production build
npm run lint                 # ESLint
```

### Docker (full stack)
```bash
docker compose up --build    # Build and run all services
docker compose up -d         # Run in background
docker compose down          # Stop all
```

> **Note:** There are no automated tests in this project. No test framework is configured.

---

## 9. Key Patterns to Follow When Making Changes

- **Adding a new backend feature:** Create a full NestJS module (`module`, `controller`, `service`, `dto/`) following the existing pattern. Register it in `app.module.ts`.
- **Adding a new API endpoint:** Define the method in `frontend/src/lib/api/index.ts` and use it from components — never call Axios directly in components.
- **Schema changes:** Edit `backend/prisma/schema.prisma`, then run `npm run prisma:generate` and `npm run prisma:migrate`.
- **Auth on new routes:** All routes are protected by default. Add `@Public()` only for intentionally public endpoints.
- **Soft deletes:** Never use Prisma `delete()`. Always set `deletedAt: new Date()` and filter by `deletedAt: null` in queries.
- **Multi-tenancy:** Always scope queries by `institutionId` when working with institution-specific data.
- **UI language:** All user-facing text must be in **Portuguese**.

---

## 10. ⚠️ Task Discipline Rules (Read This Before Every Task)

These rules exist because AI assistants frequently lose context mid-task, leave work half-done, or drift into tangential work. You must follow them strictly.

### Before starting any task:
1. **Re-read the relevant section of this document** before touching any code.
2. **State your plan explicitly** in 2–5 bullet points before writing any code. If the task is complex, list every file you will touch.
3. **Confirm scope** — if the request is ambiguous, ask one clarifying question before proceeding. Do not make assumptions and silently proceed.

### While working:
4. **Complete one thing fully before starting the next.** Do not partially implement feature A, then jump to feature B. Finish A (including wiring it up end-to-end) before moving on.
5. **Do not leave TODOs, placeholder functions, or stub implementations** in the code unless explicitly asked to. Every function you write must work.
6. **Do not refactor unrelated code** while implementing a feature. Stay in scope.
7. **When editing a file, always produce the complete updated file** (or the complete updated function/block if the file is large). Never produce a diff with `// ... rest of file unchanged` — write it all out.

### After completing a task:
8. **List every file you modified** and briefly describe what changed in each.
9. **Check for broken imports and missing wires.** If you added a NestJS module, confirm it is registered in `app.module.ts`. If you added an API method, confirm it is defined in `api/index.ts`. If you added a Prisma model, confirm you ran `prisma:generate`.
10. **Do not stop mid-task.** If you are running out of context or output space, say so explicitly — do not silently deliver incomplete work.

### General:
- Prefer **editing existing patterns** over introducing new ones.
- When unsure how something is done in this codebase, **look at an existing similar module** (e.g. `equipment/` or `maintenance/`) and replicate the pattern.
- **Do not hallucinate APIs, methods, or libraries.** If you are not sure something exists, say so.
