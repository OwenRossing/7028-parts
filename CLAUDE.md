# CLAUDE.md

FRC Parts Tracker — full-stack manufacturing tracker for FIRST Robotics Competition teams.
Next.js 15 App Router · React 19 · TypeScript · Prisma + PostgreSQL · Tailwind CSS · TanStack React Query v5

## Development Commands

```bash
npm run dev          # Next.js dev server
npm run dev:db       # PostgreSQL via Docker Compose only
npm run dev:all      # DB + schema push + seed + dev server
npm run build        # Production build (pre-PR validation)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run db:push      # Sync Prisma schema to local DB
npm run db:seed      # Seed demo data
npm run db:reset     # Reset DB and reseed
```

No automated test framework. Pre-PR: `npm run build` + manual test login, parts list, add-part, status update, BOM import.

On WSL without Docker CLI integration: `docker.exe compose ...`

## Architecture

### Key Modules

- **`app/`** — Next.js App Router. Root renders `<PartsExplorer />`. API routes in `app/api/**/route.ts`.
- **`components/`** — Client components. Shared primitives under `components/ui/`.
- **`lib/`**
  - `auth.ts` — session management (cookie-based, httpOnly, sameSite lax)
  - `db.ts` — Prisma singleton
  - `env.ts` — Zod-validated environment config
  - `permissions.ts` — RBAC: isAdminUser, canManagePart, editorContext
  - `admin.ts` — env-only admin (ADMIN_EMAILS whitelist, no DB table)
  - `storage.ts` — pluggable local/S3 provider
  - `status.ts` — part workflow helpers
  - `sse-registry.ts` — in-memory SSE client registry for real-time push
  - `workspace-config.ts` — team/robot/subsystem hierarchy helpers
  - `bom/` — CSV + Onshape importers
  - `onshape/client.ts` — CAD API with HMAC signing
- **`prisma/`** — `schema.prisma` core entities; `seed.ts` demo data.
- **`middleware.ts`** — Auth guard; redirects unauthenticated users to `/login`.

### Auth Modes

- **`production`** — Google OAuth only. Optionally restrict by domain via `GOOGLE_AUTH_DOMAIN`.
- **`local`** — Master key (`LOCAL_MASTER_KEY`) + user picker from shared DB. No Google.
- Users are identified by email so a Google account and a local account with the same email merge naturally.
- Admin is env-only: `ADMIN_EMAILS` comma-separated. No DB admin table.

### Real-time Updates

`lib/sse-registry.ts` maintains an in-memory `Map<projectId, Set<SSEClient>>`. API mutations call `broadcast(projectId, event)` after committing. Client subscribes via `GET /api/projects/[id]/events` (Node.js runtime, not edge).

### Data Flow

Client-heavy: TanStack React Query for server state. Mutations hit Next.js API routes → Prisma. SSE stream invalidates queries on the client.

### Part Status Workflow

`DESIGNED → CUT → MACHINED → ASSEMBLED → VERIFIED → DONE` — `lib/status.ts`. Dashboard renders Kanban + TODO queue.

### Part Number Format

`TEAM-SEASON-ROBOT-SUBSYSTEM-SEQUENCE` (e.g. `7028-26-1-3-042`). Helpers in `lib/part-number.ts`.

### Storage

`lib/storage.ts`: `LocalStorageProvider` (`public/uploads/`) or `S3StorageProvider`. Switch via `STORAGE_DRIVER=local|s3`.

### BOM Import

PREVIEW → COMMITTED pipeline. Importers in `lib/bom/`: CSV and Onshape. Row actions: CREATE, UPDATE, NO_CHANGE, ERROR.

### Permissions

`lib/permissions.ts` — `isAdminUser()`, `canManagePart()`, `editorContext()`. All part creation/import is open to any authenticated user; admin only needed for destructive ops.

## UI

Valve/Steam dark industrial aesthetic. Color tokens: `steel`, `surface`, `rim`, `ink`, `brand`.
Grouping modes: by status, priority, or student (PRIMARY owner).
TODO view: active (your turn) vs waiting (blocked on upstream step).

## Coding Conventions

- 2-space indentation; imports logically grouped
- Components: PascalCase filenames; utilities: kebab-case
- API handlers: `app/api/[feature]/route.ts`
- Tailwind-first; avoid inline styles
- Path alias: `@/*` → project root

## Environment

Copy `.env.example` to `.env`.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | `localhost` for npm dev; `db` for container-to-container |
| `APP_MODE` | `demo` \| `local` \| `production` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (production) |
| `GOOGLE_AUTH_DOMAIN` | Restrict Google login to one domain (optional) |
| `LOCAL_MASTER_KEY` | Gate for local user picker |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `STORAGE_DRIVER` | `local` or `s3` |
| `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` | Public base URL for S3 media |
| `ONSHAPE_ACCESS_KEY/SECRET_KEY` | Onshape BOM import |
