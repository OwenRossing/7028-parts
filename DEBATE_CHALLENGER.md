# The Challenger: A Case for Restructuring 7028 Parts Tracker

*Role: Architectural Challenger — building the strongest honest case for restructuring*

---

## Preamble: What This Is and Is Not

This is not a claim that the current architecture is broken today. For a single team, running on a single server, with a handful of concurrent users, the current stack works and works reasonably well. The code is clean, the data model is coherent, and the developer experience is smooth.

The argument for restructuring is about **trajectory**, not current state. The codebase is young enough to change cheaply. The architectural choices that are comfortable at 5 concurrent users become load-bearing constraints at 50, and near-impossible to change at 500. The question is whether this structure can carry the weight of plausible futures — multi-team support, mobile access, offline mode, external API consumers — or whether it will require a painful rewrite at exactly the moment the project is most valuable.

The answer, in several specific and concrete ways, is that the current architecture will not carry that weight gracefully.

---

## 1. The SSE In-Memory Registry Will Break Under Real Conditions

### The Core Problem

`lib/sse-registry.ts` is 49 lines. The registry is a module-level `Map<string, Set<SSEController>>`. This is simple, correct, and completely incompatible with any deployment beyond a single Node.js process.

```ts
// lib/sse-registry.ts line 17
const registry = new Map<string, Set<SSEController>>();
```

### Specific Failure Modes

**Failure Mode 1: PM2 or any multi-process deployment.**
The most common production deployment pattern for Next.js is `pm2 -i max` or Vercel's serverless model, which spawns multiple Node.js workers. A mutation in Worker A calls `broadcast(projectId, event)`. Worker A's registry has zero clients if those clients connected to Worker B. The SSE push silently sends to nobody. The clients' query caches never invalidate. Users see stale data with no error indication.

This is not a hypothetical. It happens the moment a second process exists. A laptop running `npm run dev` in one terminal and the dev server in another would not trigger this, but any production deployment using multiple workers does.

**Failure Mode 2: Serverless / edge functions.**
`next.config.ts` has no forced runtime configuration beyond `serverExternalPackages`. The events route correctly forces `export const runtime = "nodejs"`, but if this annotation were ever dropped (e.g., during a Next.js upgrade that changes defaults), the route would run in the edge runtime, where long-lived connections and module-level state are explicitly prohibited.

**Failure Mode 3: Server restart drops all active connections.**
When the Next.js process restarts (deploy, crash, OOM kill), every SSEController in the registry is garbage-collected. All connected clients hit their `onerror` handler and start the 2-second reconnect loop. This is handled gracefully by `hooks/use-sse.ts` — the reconnect logic is correct. But there is a silent data consistency window between the restart and the client reconnecting during which any mutations are missed. The client-side `staleTime: 10_000` in the parts query provides a 10-second window where stale data is shown without triggering a refetch. If a deploy takes 10+ seconds, clients will reconnect but hold stale data until the next SSE event or TanStack Query's background refetch interval expires.

**Failure Mode 4: Connection leak when cleanup races.**
In `app/api/projects/[id]/events/route.ts`, cleanup is wired to `request.signal.addEventListener("abort", ...)`. This is correct for graceful client disconnects. However, if the Node.js process is killed with SIGKILL (not SIGTERM), abort events never fire. The registry accumulates stale controllers that will throw on `enqueue()`, which is silently caught. The registry never shrinks. Under bursty reconnects (e.g., a deploy that drops all connections simultaneously), the registry could temporarily hold hundreds of dead controllers all failing silently on every broadcast. This is a minor memory leak, not a fatal crash, but it degrades over time on long-running processes.

### What a Real Fix Requires

The fix is not a small refactor. You need a pub/sub backend — Redis with its `PUBLISH/SUBSCRIBE` commands being the standard answer — that all process instances share. The broadcast call writes to Redis; a subscriber loop in each process reads from Redis and pushes to local SSEControllers. This is a meaningful architectural addition: a new infrastructure dependency, connection management, and serialization of the SSEEvent type across a network boundary. The current architecture makes this addition harder than it needs to be because the registry is statically imported throughout the API routes, meaning every route that calls `broadcast()` would need updating.

---

## 2. The Next.js Monolith Creates Hidden Coupling and Complexity

### Server Components Mixing Auth Logic with DB Calls

`app/page.tsx` is a React Server Component that directly calls `prisma.user.findUnique()`, `prisma.project.findMany()`, and `isEmailAdmin()`. This is idiomatic Next.js, but it creates coupling that is easy to miss:

```ts
// app/page.tsx — server component calling DB directly
const [user, projects] = await Promise.all([
  prisma.user.findUnique({ ... }),
  prisma.project.findMany({ ... }),
]);
```

The same query also appears in `app/settings/page.tsx`. The "deduplicate data access" instinct points toward a service layer (`lib/user-service.ts`, `lib/project-service.ts`), but the current pattern puts fetching logic directly into route files. When the `currentUser` shape needs to change — say, to add a `teamId` for multi-team support — you touch `app/page.tsx`, `app/settings/page.tsx`, and every API route that re-derives the user. There is no single source of truth.

### The `isEmailAdmin()` Call Pattern Is a Performance Tax Disguised as Simplicity

`lib/admin.ts` is clean. But `isAdminUser()` in `lib/permissions.ts` does a DB roundtrip to get the user's email, then calls `isEmailAdmin()`. This roundtrip happens on every request that checks admin status — status updates, photo uploads, owner management. The pattern is:

```ts
// lib/permissions.ts
export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return false;
  return isEmailAdmin(user.email);
}
```

And `canManagePart()` calls `isAdminUser()` then potentially another query for owner lookup. A single permission check can be 2 sequential DB queries. In the parts API route for a status update (`/api/projects/[id]/parts/[partId]/status/route.ts`), the execution is: validate session (1 DB query) → check canManagePart → check isAdminUser → fetch user email (1 DB query) → check isOwner (1 DB query) → fetch current part status (1 DB query) → update part (1 DB query) → create event (1 DB query). That is 6 sequential database round-trips for a status button click. On a local network this is imperceptible. On a cloud deployment with a managed database in a different region, each round-trip is 10–30ms. 6 × 20ms = 120ms of pure latency for a tap on a status button.

### The Client-Heavy Architecture Has No API Contract

The API routes in `app/api/` are the de facto public API of this application. They are documented nowhere, versioned nowhere, and consume no shared type contract between server and client. `components/parts-explorer/part-detail.tsx` calls `fetch('/api/projects/${projectId}/parts/${partId}')` and casts the response to `PartDetailType` from `@/types`. There is no runtime validation that the API response matches this type. When the API response shape changes, the TypeScript compiler catches it if you're lucky and the types are kept in sync; it silently breaks at runtime if you're not.

This matters for extensibility: if a mobile app or a third-party integration wants to consume these APIs, they're consuming undocumented, unversioned endpoints with no schema. That's not a problem today; it's a wall tomorrow.

### The `"use client"` Boundary Is Managed by Convention, Not Structure

`components/parts-explorer/index.tsx` is a client component that imports `SSEEvent` from `lib/sse-registry.ts`, which is a server-side module. This works because the import is type-only at runtime, but it's a sign of a blurring boundary. The client layer reaches into server lib files for types, which means any structural change to server modules requires auditing client imports. There is no explicit boundary enforcement — it's managed by developer discipline.

---

## 3. The Dual Auth System Is a Maintenance Timebomb

### Two Auth Flows, Zero Shared Abstraction

The auth system has two modes that are mutually exclusive in production but can coexist in `demo` mode:

- **Local mode**: `LOCAL_MASTER_KEY` + user picker from DB. Code path: `app/api/auth/local-login/route.ts`.
- **Production mode**: Google OAuth ID token validation via tokeninfo endpoint. Code path: `app/api/auth/google/route.ts`.

Both ultimately call `createAuthSession()`, which is the one shared abstraction. But the flows above that are completely separate. This is not inherently wrong — the two flows are genuinely different. The problem is in what they each implicitly assume about the User model.

### The Google Flow Creates Users On Demand; The Local Flow Requires Pre-Seeded Users

In `app/api/auth/google/route.ts`:
```ts
const user = await prisma.user.upsert({
  where: { email },
  update: { displayName: ..., avatarUrl: ... },
  create: { email, displayName: ..., avatarUrl: ... },
});
```

In `app/api/auth/local-login/route.ts`:
```ts
const user = await prisma.user.findUnique({ where: { id: userId } });
if (!user) return jsonError("User not found.", 404);
```

Google mode creates users automatically. Local mode requires users to exist via seed or the admin API. If you switch from local to production mode without first running `db:seed` with matching emails, Google login succeeds but creates a new user record that has none of the ownership data from the local-mode sessions. The email merge described in CLAUDE.md ("a Google account and a local account with the same email merge naturally") is true, but only if the emails match exactly. A local dev who seeded as `owen@team.org` and authenticates with Google as `owen@team.org` merges correctly. If they used a different email locally, they get a blank user account in production.

### `APP_MODE` vs `NODE_ENV` Is a Layered Confusion

The codebase has both `NODE_ENV` (standard Node.js environment variable) and `APP_MODE` (custom application mode). `lib/app-mode.ts` reads `APP_MODE`. `lib/auth.ts` reads `NODE_ENV` for the secure cookie decision. The cookie security logic is:

```ts
function isSecureCookieEnabled(): boolean {
  const override = process.env.AUTH_COOKIE_SECURE;
  if (override === "true") return true;
  if (override === "false") return false;
  if (isDemoMode() || isLocalMode()) return false;
  return isProduction(); // isProduction() checks NODE_ENV === "production"
}
```

This means: if `APP_MODE=production` but `NODE_ENV=development` (common during testing a production config locally), cookies are not marked secure. If `APP_MODE=local` but `NODE_ENV=production` (unusual but possible in a containerized setup), cookies are also not secure. The decision depends on the conjunction of two orthogonal variables. There is no single "is this a production deployment?" truth.

### Adding a Third Auth Provider Is Painful

If the team wanted to add GitHub OAuth, Microsoft Azure AD, or magic-link email: there is no auth provider abstraction to plug into. You would add a new route file, duplicate the upsert pattern, and add another mode flag check. The `createAuthSession()` function is the only reusable piece. Every new auth method is a new bespoke implementation.

---

## 4. `prisma db push` Without Migration History Is a Real Production Risk

### What `db push` Actually Does

`prisma db push` introspects the target database, computes the diff between the current schema and `schema.prisma`, and applies DDL changes directly. It does not create migration files. There is no history of what changed, when, or why. This is explicitly documented by Prisma as appropriate for prototyping and development — not production.

### Concrete Risk Scenarios

**Scenario 1: Additive change gone wrong.**
You add a non-nullable column to `Part` — say, `robotId String` to support multi-robot tracking. `prisma db push` will:
1. Add the column as nullable.
2. Fail to set defaults on existing rows (there are none for nullable fields, but this is the safe case).

But if you meant to add `robotId String NOT NULL DEFAULT 'robot-1'`, `db push` applies the `DEFAULT` only as a schema default, not as a backfill. Existing rows get `NULL` if the column was added nullable first, then you try to make it non-nullable — `db push` will refuse or do a destructive reset depending on the `--accept-data-loss` flag. You are now manually editing production data with no rollback path.

**Scenario 2: Rename treated as drop-and-add.**
Rename `Part.quantityRequired` to `Part.quantityNeeded` in the schema. `db push` drops the old column and creates a new one. All existing `quantityRequired` data is silently lost. With migrations, this would be an explicit `ALTER TABLE RENAME COLUMN` with review and rollback. With `db push`, it is gone.

**Scenario 3: Enum value addition.**
Adding a new `PartStatus` value — say, `SCRAPPED` — with `db push` works fine in Postgres. But removing one requires a data migration first. If you remove `MACHINED` because the workflow changed, `db push` will fail on rows that still have `status = 'MACHINED'`. You now need to update data before the schema change. With migration files, you write: Step 1 — update rows. Step 2 — drop enum value. With `db push`, you're doing this manually in a `psql` session on production.

**The Real Risk: No Rollback.**
Migration history exists so that `prisma migrate deploy --rollback` (or equivalent) can undo a bad change. `db push` has no rollback. If a `db push` in production breaks something, your options are: restore from backup (how long ago was it? how much data do you lose?), manually write and apply reverse DDL (error-prone under pressure), or accept the broken state. The `db:reset` script in `package.json` literally runs `prisma migrate reset --force` — it drops and recreates the database. This is fine for development. Running it on production by mistake ends the season.

### The `prisma migrate` Path Is Not Much More Work

The migration-based workflow is: `prisma migrate dev --name add-robot-id` in development (creates a migration file, applies it). `prisma migrate deploy` in production (applies pending migrations in order, idempotently). The main cost is discipline: you must run `migrate dev` locally instead of `db push`, and you must commit migration files to the repo. That is a small change in process for a large gain in safety.

---

## 5. Features That Would Be Hard to Add With the Current Architecture

### Multi-Team Support

The data model has `WorkspaceTeam`, `WorkspaceRobot`, and `WorkspaceSubsystem` tables. But `Project` has no `teamId` foreign key. Parts belong to Projects; Projects float free of teams. If team 7028 and team 254 both run this software (the stated aspiration of "FRC teams"), they share one database, one user pool, one admin list, and one project namespace. User A from team 7028 can call `GET /api/projects/254-project-id/parts` and get team 254's parts if they know the project ID. There is no row-level security by team.

Adding real multi-tenancy requires: a `teamId` on `Project`, authorization checks that verify the requesting user belongs to the project's team, and tenant isolation in every single query. That's a schema migration plus touching every API route. The current structure does not make this easy — there is no `requireTeamMember()` primitive analogous to `requireUser()` or `canManagePart()`.

### Offline / PWA Mode

The client architecture is fetch-first. `useQuery` fetches from `/api/projects/${projectId}/parts` on mount. `useMutation` fires `fetch()` calls. There is no service worker, no request queue, no optimistic update commit pattern. Adding offline support would require:

1. A service worker to intercept and cache API responses.
2. A local mutation queue (IndexedDB or similar) for operations made while offline.
3. Conflict resolution when the queue is flushed on reconnect — especially for status changes where two offline users might have both advanced the same part.

None of these are easy to bolt onto the current architecture. TanStack Query supports optimistic updates but not durable offline queues. The SSE connection is meaningless offline. The entire real-time model assumes connectivity. Offline mode would require rebuilding the data layer, not extending it.

### Mobile App

There is no native mobile app, but the question is whether one could be added. The answer is: the API is usable, but only just. Problems:

- No API versioning (`/api/v1/`). A mobile app pinned to an API version would break on every deploy.
- No OpenAPI/swagger schema. A mobile client would need to hand-track API shapes.
- Authentication is cookie-based with `httpOnly` cookies. Mobile apps (React Native, Swift, Kotlin) cannot use `httpOnly` cookies — they need token-based auth (JWT or opaque bearer tokens) that can be stored in secure storage and passed in `Authorization` headers.
- The SSE connection is browser-native. React Native's `EventSource` polyfills are brittle; native apps would need WebSockets or polling instead.

The auth cookie problem alone blocks native mobile. You'd need to add a parallel token-based auth flow or replace the session mechanism entirely.

### External API Consumers / Webhooks

The current model has no concept of API keys, webhook subscriptions, or rate limiting. A third-party integration (CAM software, build dashboard, season-tracking service) would need to:

1. Authenticate — impossible without API key support or OAuth 2.0 client credentials flow.
2. Receive events — SSE requires a browser-like long-lived connection. Webhooks (POST to a registered URL) are the standard alternative for server-to-server, and they don't exist.
3. Trust the data shape — no schema, no versioning, no contract.

---

## 6. What a Better Architecture Would Look Like — Concretely

This is not "use microservices." The team is small. Microservices would be overengineering. The argument is for specific targeted changes that fix the concrete problems above without introducing unnecessary complexity.

### Layer 1: Add Migration History Now (Zero-Cost, High-Value)

Stop using `prisma db push` for schema changes. Run `prisma migrate dev` locally, commit migration files, and use `prisma migrate deploy` in production. The `package.json` scripts change minimally:

```json
"db:migrate": "prisma migrate deploy",
"db:dev": "prisma migrate dev"
```

Keep `db:push` for the initial `dev:all` bootstrap on fresh installs where no data exists. Delete the `db:reset --force` shortcut from documentation that's safe to run on dev but catastrophic on prod.

### Layer 2: Replace the SSE Registry With Redis Pub/Sub (Or Accept the Constraint)

If this application will only ever run on a single server process, document that constraint explicitly and enforce it (a `package.json` start script that sets `NODE_OPTIONS=--max-old-space-size=...` and disallows clustering). The current SSE approach is then correct for its scope.

If multi-process or multi-server is ever needed, the fix is a Redis pub/sub adapter around the broadcast/subscribe interface. The `broadcast()` function signature does not change. `subscribe()` adds a Redis subscription. The registry becomes a local cache of active connections only, not the source of truth for routing. This is ~150 lines of new code concentrated in `lib/sse-registry.ts` with no changes to callers.

```ts
// Sketch of the Redis-backed registry interface
// broadcast() publishes to Redis channel "sse:project:{projectId}"
// Each process subscribes to all "sse:project:*" channels
// and pushes to local SSEControllers
```

### Layer 3: Extract a Service Layer for Auth and Permissions

Add `lib/services/user.ts` and `lib/services/project.ts` with functions like `getCurrentUser(userId)`, `getProjectWithAccess(userId, projectId)`, `requireTeamMember(userId, teamId)`. These become the single location for data fetching patterns that are currently duplicated between `app/page.tsx`, `app/settings/page.tsx`, and API routes.

The permission functions in `lib/permissions.ts` gain a version that accepts a pre-fetched user object, eliminating the redundant DB query:

```ts
// Current: 2 DB queries (user email + owner lookup)
await canManagePart(userId, partId)

// Better: 1 DB query if user already fetched
await canManagePartWithUser(user, partId)
```

### Layer 4: Add a `teamId` to `Project` and Authorization Middleware

Add `teamId String` to `Project`, with a corresponding `TeamMember` table. Add a `requireProjectAccess(userId, projectId)` function that checks team membership. Every API route that touches a project calls this instead of just `requireUser()`.

This change is a migration (medium complexity), not a rewrite. It does not change the client-side code at all. But it is much harder to add after you have hundreds of parts in the database because the migration needs to assign a `teamId` to every existing Project. The earlier this happens, the cheaper it is.

### Layer 5: Define an API Contract (OpenAPI or tRPC)

The lowest-friction path is tRPC: define procedures in `server/routers/`, generate type-safe client hooks, and eliminate the `fetch(...).then(r => r.json())` pattern that currently has no runtime type validation. The API routes become the tRPC transport layer. This is a meaningful refactor but not a rewrite — the Prisma queries stay the same, the auth checks stay the same, only the transport glue changes.

The alternative is generating an OpenAPI schema from Zod schemas (already present throughout the API routes) using `zod-to-openapi` or equivalent. This provides documentation and type generation for future non-TypeScript consumers without changing the routing architecture.

### Layer 6: Abstract Auth Providers

Create `lib/auth-providers/google.ts` and `lib/auth-providers/local.ts`, both implementing a `AuthProvider` interface with a single method: `authenticate(request) -> { email, displayName, avatarUrl } | null`. The session creation, cookie management, and user upsert logic moves into a shared `lib/auth-session.ts`. Adding GitHub OAuth becomes implementing the interface, not copying boilerplate.

---

## Where the Current Architecture Is Actually Working Well

To be honest about the other side:

- The **session management** in `lib/auth.ts` is clean and secure. `httpOnly` cookies, explicit TTL, `lastSeenAt` tracking, proper expiry — this is not what needs fixing.
- The **Zod validation** pattern in API routes is consistent and catches bad input at the boundary. The `parseJson()` helper in `lib/api.ts` is a good abstraction.
- The **storage abstraction** in `lib/storage.ts` is correctly designed. Switching from local to S3 is a one-line env change. This is what a pluggable provider looks like when done right.
- The **part number format and helpers** in `lib/part-number.ts` are well-designed for the domain. The structured format (`TEAM-YY-ROBOT-SUBSYSTEM-SEQ`) is coherent and the helpers encode the format in one place.
- The **BOM import pipeline** (PREVIEW → COMMITTED) is the right pattern for bulk operations that need user confirmation before applying. This is solid design.
- The **TanStack Query integration** with SSE invalidation is the right pattern for the client. When SSE works (single process), the real-time updates are responsive and the client code is clean.
- The **data model** in `schema.prisma` is well-normalized for the domain. The relationships are correct, the indexes are appropriate, and the audit trail via `PartEvent` is a design choice that will pay dividends.

---

## Summary: The Hierarchy of Risk

Ranked by urgency and cost-to-fix-later:

| Issue | Urgency | Cost Now | Cost Later |
|---|---|---|---|
| No migration history | High | Very Low | Very High |
| SSE breaks under multi-process | Medium | Medium | High |
| No API contract | Medium | Medium | High |
| No multi-team isolation | Medium | Low now | Very High later |
| Dual auth has no abstraction | Low | Medium | Medium |
| Permission checks are chatty | Low | Low | Medium |

The migration history issue is uniquely urgent because every day of `db push` usage is another day of schema change history that cannot be recovered. All other issues can be addressed incrementally; schema history cannot be backfilled.

The multi-team isolation issue is uniquely expensive to defer because the longer the system runs with data in it, the harder the migration becomes — you need to assign a `teamId` to every existing Project, every existing User, and enforce it in every existing query. Doing it before real data accumulates is a small migration. Doing it after a full season of data is complex.

The rest are real problems with real costs, but they can be addressed in the order the project's needs demand them.
