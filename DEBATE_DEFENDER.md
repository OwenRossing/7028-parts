# DEBATE_DEFENDER.md — The Case for Continuing and Iterating on the Current Architecture

**Position:** The 7028 Parts Tracker's current architecture is the right tool for the job. It is cohesive, deployable by a single developer, and already delivers meaningful value. The correct path forward is iteration, not restructuring.

---

## 1. The Next.js App Router Monolith Is the Right Shape for This Team and Use Case

### What "right shape" actually means

Architecture fitness is not an absolute quality — it is a measure of how well a shape fits its operational constraints. The constraints here are:

- **One primary developer** (Owen Rossing, `prisma/seed.ts` line 7 reveals the sole named user in the seed data)
- **A seasonal, deadline-driven project** (FRC build season is approximately 6 weeks)
- **A small, fixed user base** — a high school robotics team: perhaps 15–30 members touching the app concurrently at absolute peak, realistically 5–10 at any given moment during a build session
- **Zero dedicated infrastructure budget** — the app runs on a single Docker Compose service (`docker-compose.yml`) and is almost certainly deployed on a single VM or even a developer's machine

Given these constraints, the monolith is not a compromise — it is the optimal choice.

### The App Router delivers what this domain needs at zero operational cost

The root page (`app/page.tsx`, lines 11–57) does something elegant: it performs two parallel Prisma queries on the server (`Promise.all` at line 15), serializes the result, and passes it as props to the client component. This is exactly the App Router's value proposition — server-rendered initial data with no separate API call on first load, no client-side waterfall on the critical path, and no separate BFF (Backend for Frontend) service to operate.

The alternative — a React SPA + a separate Express or FastAPI backend — would require:
- Running and deploying two processes
- Managing CORS
- Duplicating auth validation logic
- Adding an HTTP round-trip to the critical path on every page load

None of those costs are justified for this user count.

### The API surface is already RESTful and well-structured

The API routes (`app/api/**`) are cleanly organized by resource:

```
/api/projects                          — project CRUD
/api/projects/[id]/parts               — parts list + create
/api/projects/[id]/parts/[partId]      — part detail + delete
/api/projects/[id]/parts/[partId]/status  — status mutation
/api/projects/[id]/parts/[partId]/owners  — owner assignment
/api/projects/[id]/parts/[partId]/photos  — photo upload
/api/projects/[id]/events              — SSE stream
/api/projects/[id]/import              — BOM import preview
/api/projects/[id]/import/[batchId]/commit — import commit
/api/auth/google                       — OAuth login
/api/auth/local-login                  — local/demo login
/api/auth/logout                       — session revocation
/api/users                             — user list
/api/admin/users                       — admin user management
/api/workspace/...                     — workspace config hierarchy
```

This is a well-designed REST surface. It is not entangled with Next.js rendering concerns in any way that would prevent it from being consumed by a native mobile app or a different frontend in the future. Restructuring into a separate API process would move exactly these same route handlers into a separate process — gaining nothing architecturally, only operational complexity.

### The client side is appropriately heavy where it needs to be

`components/parts-explorer/index.tsx` (lines 21–131) is the application shell. It uses TanStack React Query for server state cache, URL search params for navigation state (so deep links and browser back work correctly), and SSE for real-time invalidation. This is a well-considered client architecture. The sidebar uses `@tanstack/react-virtual` (visible in `package.json` line 31) for windowed rendering of the parts list, which correctly anticipates the case where a project might have hundreds of parts. None of this architecture needs to change for the foreseeable scale.

---

## 2. SSE with an In-Memory Registry Is Good Enough — and Is Architecturally Honest

### The actual requirement

FRC teams need to see status updates without manually refreshing. When a machinist marks a part DONE, the student checking on progress across the shop should see it update. The latency requirement is "within a few seconds." The reliability requirement is "best-effort during build sessions." There is no SLA, no compliance requirement, no financial consequence for a missed event.

### The implementation is correct for a single-process deployment

`lib/sse-registry.ts` is a clean 49-line module. The registry is a `Map<string, Set<SSEController>>` (line 17). `subscribe()` adds a controller and returns an unsubscribe function (lines 19–31). `broadcast()` iterates clients and enqueues encoded events, silently dropping disconnected clients (lines 33–48).

The client hook (`hooks/use-sse.ts`) implements 2-second reconnect with a `dead` flag to prevent reconnect storms after unmount (lines 40–46). The `onEvent` handler is stored in a ref (line 13) so it never goes stale. This is production-quality SSE client code.

### The "in-memory doesn't survive restarts" objection is irrelevant here

Yes, if the server restarts, connected clients lose their SSE stream. The client reconnects in 2 seconds. The `staleTime: 10_000` on the parts query (index.tsx line 54) means the client will refetch data after reconnect. The user sees a brief disconnection indicator and then current data. For a shop floor tool used by a high school robotics team, this is entirely acceptable.

The argument that this needs Redis Pub/Sub or a message queue is only valid if you have multiple application server instances. This deployment has one. Adding a message broker to solve a multi-instance problem you don't have is premature architecture — it adds operational complexity, a new failure mode, and a new service to monitor, for zero user-visible benefit.

### The four event types are exactly right

The SSE event union (`lib/sse-registry.ts` lines 9–13) is `part_created | part_updated | part_deleted | batch_committed`. Each event carries only a `partId` or `batchId` — no payload data. The client uses these events to invalidate React Query caches, which then re-fetches from the API. This is the correct separation: SSE is a notification channel, not a data delivery channel. This design prevents the SSE stream from becoming a parallel data API that needs its own versioning and schema management.

---

## 3. The Env-Based Auth Is a Smart Tradeoff, Not a Liability

### Three modes for three contexts — all correct

The `lib/app-mode.ts` module defines three modes: `demo`, `local`, `production`. Each has a corresponding auth path in `app/api/auth/`:

- **`production`**: Google OAuth via ID token verification against `tokeninfo` endpoint (`app/api/auth/google/route.ts` lines 30–38). Domain restriction via `GOOGLE_AUTH_DOMAIN` (line 47). This is secure — it delegates identity to Google, validates the token server-side, and restricts to the team's org domain.
- **`local`**: Master key gate + user picker (`app/api/auth/local-login/route.ts`). The master key prevents random people from picking any user; the user picker enables team members to log in without individual passwords during build sessions on a trusted LAN.
- **`demo`**: Same code path as local, which is fine — demo is a trusted environment by definition.

### Admin-as-env is architecturally simpler and harder to escalate

`lib/admin.ts` (lines 7–11) checks `ADMIN_EMAILS` by splitting a comma-separated string and doing a case-insensitive email comparison. There is no DB `isAdmin` column to be corrupted, no admin promotion endpoint to be exploited, and no admin session token to be stolen.

The counterargument — that you can't promote or demote admins without restarting the server — is true and is a valid tradeoff. But for a team of one primary admin (the mentor/lead developer), changing `ADMIN_EMAILS` in the deployment config and restarting is a 30-second operation. A DB-backed admin system would require: a migration, a UI for admin management, additional permission checks on admin-promotion endpoints, and audit logging of admin changes. The complexity cost vastly exceeds the benefit for this team size.

### Sessions are properly implemented in the DB

`lib/auth.ts` stores sessions in the `Session` table (Prisma schema lines 71–83) with `expiresAt`, `lastSeenAt`, and `userAgent` fields. Sessions are validated on every request (`validateSession` at line 74), cleaned up on expiry (line 84), and have a properly configured TTL (default 7 days, configurable via `SESSION_TTL_SECONDS` in `lib/env.ts` line 15).

The cookie is `httpOnly`, `sameSite: lax`, and optionally `secure` depending on mode (lines 41–51 of `auth.ts`). The secure flag is correctly disabled for local/demo modes to enable HTTP access on a LAN without HTTPS — this is a thoughtful tradeoff, not a bug.

### Email-as-identity-merge is genuinely clever

From CLAUDE.md: "Users are identified by email so a Google account and a local account with the same email merge naturally." The `app/api/auth/google/route.ts` uses `prisma.user.upsert` keyed on `email` (line 51). This means a team member who used local login during development and then switches to Google SSO in production automatically gets the same account, same ownership records, same history. No migration needed, no duplicate accounts, no support ticket. This is elegant.

---

## 4. `prisma db push` Is the Right Tool for This Project's Lifecycle

### What `db push` does and doesn't do

`prisma db push` synchronizes the Prisma schema to the database without generating migration files. It introspects the current database state, computes the diff, and applies it. This is distinct from `prisma migrate dev` which generates versioned `.sql` files in a `migrations/` directory.

### The tradeoff is appropriate here

Migration files are valuable when:
1. You have multiple environments that need to stay in sync (e.g., dev, staging, prod with separate databases)
2. You need an audit trail of schema changes
3. You have rollback requirements

For this project:
- There is one database per deployment (the docker-compose.yml shows a single `db` service)
- The seed data is idempotent (`upsert` throughout `prisma/seed.ts`) — a reset is `db:reset` which is `migrate reset --force && db:seed`
- The schema is in early active development — generating migration files for every exploratory schema change during build season would create noise without value
- There is no staging environment to keep in sync

The `db:reset` script (package.json line 17) provides the escape hatch: when the schema and data diverge too far, blow it away and reseed. For a seasonal project where data is reset each robot year anyway, this is entirely acceptable.

The `next.config.ts` `serverExternalPackages` setting (line 4) correctly externalizes `@prisma/client` and `prisma` to avoid bundling the Prisma query engine, which is another sign of architectural maturity — the developer understands Next.js's module bundling behavior.

When the project matures to the point of needing migration files (e.g., if it's deployed to multiple FRC teams), transitioning from `db push` to `migrate dev` is a one-time `prisma migrate dev --name init` command that snapshots the current schema. The cost of deferring migrations is near zero; the cost of maintaining them prematurely is real.

---

## 5. What Would Be LOST or Made Harder by Restructuring

### Colocation of concerns is a feature, not a bug

The current architecture colocates:
- Data fetching (Prisma) close to the API handler that uses it
- API routes with the pages that consume them (same repo, same types)
- Auth logic in a single `lib/auth.ts` consumed by both middleware and API routes
- The `broadcast()` call immediately after the database write in the same file (e.g., `app/api/projects/[id]/parts/route.ts` line 118, `app/api/projects/[id]/parts/[partId]/status/route.ts` line 44)

Splitting into a separate backend service would force:
- Shared type definitions to live in a separate package or be duplicated
- The `broadcast()` call to either stay in the backend service (losing colocation) or be moved to a separate event bus
- Auth validation to be duplicated or moved to a shared library
- Every API change to require coordinating two deployments

The TypeScript types (`types/index.ts`, referenced throughout) are shared between server and client code freely. In a monorepo with two separate services, this requires a shared package, a build step, and version management. For a one-person team, this overhead is not justified.

### The developer experience would degrade

Currently:
```bash
npm run dev:all   # DB up, schema pushed, seeded, dev server running — one command
npm run build     # Validate everything in one step
```

With a split architecture:
- Two dev servers to start
- Two build processes to validate
- Two sets of environment variables to manage
- Two Docker services (at minimum) to coordinate
- Two deployment targets

The CLAUDE.md explicitly notes the pre-PR validation is `npm run build` + manual testing. A single build step is not an accident — it is a deliberate choice that reduces friction for a solo developer on a deadline.

### The Onshape integration would become more complex

`lib/onshape/client.ts` (referenced in CLAUDE.md) implements HMAC-signed requests to the Onshape CAD API. This is server-side code that holds API credentials. In the current architecture, it lives in `lib/` and is consumed directly by the import API route. In a split architecture, either the credentials live in the backend service (fine) or in the BFF layer (credential leakage risk). The current structure is the safer one.

### Real-time would need a broker

As argued in section 2, the SSE registry is correct for a single process. Restructuring would force adoption of a message broker (Redis, etc.) as a new required infrastructure component. During FRC build season, new infrastructure components are failure modes. The team cannot afford to debug a Redis connection issue at 11pm the night before a competition.

---

## 6. Realistic User Base and Deployment Context

### The numbers are small by design

FRC Team 7028 (St. Mary's Robotics, per the seed user's email domain `stmarobotics.org`) is a high school robotics team. The FRC model typically involves:
- 20–40 students
- 2–6 mentors
- One active robot project per season
- Build sessions of 2–4 hours, 3–5 days per week during the 6-week build season

Peak concurrent users: likely 5–15 during a build session. The parts list for one robot might contain 100–500 parts. The sidebar already uses virtual rendering (`@tanstack/react-virtual`) to handle even the upper end of this range.

The deployment is almost certainly:
- A single VM or a developer's machine on the team's LAN
- PostgreSQL running in Docker Compose (single container)
- Next.js running as `next start` on Node.js
- No CDN, no load balancer, no horizontal scaling

This is the correct deployment for the problem. A Kubernetes cluster for a high school robotics team's internal tool is absurd.

### The multi-team potential doesn't require restructuring now

The `WorkspaceTeam`, `WorkspaceRobot`, `WorkspaceSubsystem` models in the schema (lines 105–130) and the `defaultTeamNumber()` function in `lib/part-number.ts` (line 24, reading `NEXT_PUBLIC_TEAM_NUMBER`) show forward-thinking for multi-team deployment. But this is handled by running separate instances of the same application — one per team, each with its own database URL and team number config. This is a simpler operational model than a multi-tenant SaaS architecture, and it's correct for the current scale.

---

## Summary: The Architecture Matches the Problem

| Dimension | Current Architecture | What It Would Take to "Improve" It | Net Value of Change |
|---|---|---|---|
| Deployment complexity | Single Next.js process + one DB | Separate API + frontend + message broker | Negative — more failure modes |
| Developer velocity | One `npm run dev:all`, one `npm run build` | Two processes, two builds, two deploy targets | Negative — more friction |
| Real-time | SSE in-memory, reconnects in 2s | Redis Pub/Sub + SSE or WebSocket gateway | Negative — new infrastructure, same UX |
| Auth | DB sessions + Google OAuth + local key | Same, but in a separate auth service | Negative — distributed session management |
| Type safety | Shared types in one repo | Shared package or code duplication | Negative — build coordination overhead |
| Schema evolution | `db push` + idempotent seed | Versioned migrations | Neutral now, positive later — easy to add |
| Scale ceiling | ~50 concurrent users | Unlimited (with restructuring) | Irrelevant — team has 15–30 users |

The one area where the architecture will need to evolve is migration files, when (if) the project is deployed to multiple teams with production data that can't be reset. That is a one-hour migration effort, not a restructuring.

Everything else — the monolith, the in-memory SSE, the env-based admin, the `db push` workflow — is correctly sized for the problem. Restructuring would trade real developer-hours (a scarce resource during build season) for theoretical scalability improvements that will never be exercised at this team's scale.

**The correct move is to keep building features on this foundation, not to restructure the foundation.**

---

*Prepared by: The Defender*
*Codebase reviewed: March 2026 — commit d3afaba and working tree*
