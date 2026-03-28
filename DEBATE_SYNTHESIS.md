# DEBATE_SYNTHESIS.md — Architectural Verdict

*Synthesis of DEBATE_DEFENDER.md and DEBATE_CHALLENGER.md, reviewed against source code.*
*Judge: Claude Sonnet 4.6 — March 2026*

---

## Verdict

Continue iterating on the current architecture, but switch from `prisma db push` to `prisma migrate dev` immediately and add a `teamId` to `Project` before real season data accumulates — everything else can wait or be skipped entirely.

---

## What the Defender got right

- **The monolith is correctly sized.** A Next.js App Router monolith with a single Postgres instance is the right deployment shape for 5–15 concurrent users on a LAN. The Defender's table comparing deployment complexity across alternatives is accurate: splitting frontend/backend/broker would add failure modes with zero user-visible benefit at this scale.

- **The SSE registry is fine for a single-process deployment.** The code in `lib/sse-registry.ts` is clean and correct. The client reconnect logic in `hooks/use-sse.ts` handles restarts gracefully. The 2-second reconnect plus `staleTime: 10_000` on parts queries means the worst-case stale window is acceptable for a shop floor tool. The Challenger's multi-process failure modes are real but irrelevant: this app runs `next start` on one machine, period.

- **Env-based admin is the right call at this team size.** `lib/admin.ts` is 11 lines. There is no admin escalation attack surface, no migration needed to add or remove an admin, and no UI to build. For one primary admin (the mentor), changing `ADMIN_EMAILS` and restarting is genuinely the correct workflow. A DB-backed admin system would require a promotion endpoint, audit logging, and additional permission surface for zero operational gain.

---

## What the Challenger got right

- **`prisma db push` is a real production risk, not a style preference.** The Challenger's rename scenario is the killer case: rename `quantityRequired` to `quantityNeeded` in the schema and `db push` silently drops the column. No warning, no diff review, data gone. The schema already has both field names (`Part.quantityRequired` in the model, `ImportRow.quantityNeeded` in import rows) which shows this kind of evolution is actively happening. This is the one change that must happen before the next schema edit on a live database.

- **`Project` has no `teamId` and that gets harder to add every day data accumulates.** The schema confirms it: `Project` has `id`, `name`, `season`, `createdAt` — no team ownership. The `WorkspaceTeam`, `WorkspaceRobot`, and `WorkspaceSubsystem` tables exist but are disconnected from `Project`. Right now there is one team and one season's worth of data. Adding `teamId` to `Project` before real data exists is a trivial migration. After a full season of parts, owners, events, and import batches, it requires a data migration that assigns every existing record to a team — much harder, and easy to get wrong.

- **The permission query chain is legitimately chatty.** The Challenger correctly identified that a status update triggers: session lookup → user email fetch (for admin check) → owner lookup (for canManagePart) → current part fetch → update → event create. That is 5–6 sequential DB queries. On a local network this is imperceptible. But the fix is targeted and small — pass a pre-fetched user object through to permission functions — not an architectural restructuring. It is worth doing as a cleanup item, not a crisis.

---

## What to do, in order

**[DO NOW] Switch to `prisma migrate dev` — ~2 hours**
Run `npx prisma migrate dev --name init` to snapshot the current schema into a migrations directory. Update `package.json`: replace `db:push` in `dev:all` with `prisma migrate deploy` (for CI/prod) and document that local schema changes use `prisma migrate dev --name <description>`. Keep `db:push` only as an escape hatch for fresh installs with no existing data, labeled clearly in comments. This eliminates the silent data-loss risk on every future schema change.

**[DO NOW] Add `teamId` to `Project` — ~3 hours including migration**
Add `teamId String` to the `Project` model, defaulting to the team's number (e.g., `"7028"`). Write the migration that backfills existing rows. Add a `requireProjectAccess(userId, projectId)` helper that at minimum verifies the project exists (team isolation can come later). This does not require a `TeamMember` table yet — just anchoring the data so the migration is cheap now instead of expensive later. Without this, multi-team support (even running separate instances with shared data) is structurally incomplete.

**[DO SOON] Collapse the redundant DB query in permission checks — ~2 hours**
Add a `canManagePartWithUser(user: { email: string }, partId: string)` variant to `lib/permissions.ts` that accepts an already-fetched user object. Update the status, owner, and photo API routes to use it. This cuts the permission check from 2 sequential queries to 1. Small change, high frequency, measurable improvement in response consistency under load.

**[DO SOON] Add a comment to `lib/sse-registry.ts` documenting the single-process constraint — 15 minutes**
One comment: `// This registry is in-memory and process-local. Do not run multiple Node.js workers (no PM2 cluster mode, no serverless). Single process only.` This costs nothing and prevents a future deploy mistake that would cause silent stale data with no error indication.

**[DO LATER] Switch to `prisma migrate` for the `dev:all` bootstrap flow — ~1 hour**
Once `migrate dev` is in place, update `dev:all` to run `prisma migrate deploy` instead of `db:push`. Adjust the seed script to be idempotent against a migrated schema. This completes the migration workflow and removes the last use of `db push`.

**[DO LATER] Extract a service layer for current-user fetching — ~4 hours**
Create `lib/services/user.ts` with `getCurrentUser(userId)` that fetches the user with email. Call it once per request and thread the result through to permission checks. Eliminates the duplicated `prisma.user.findUnique` calls in `app/page.tsx`, `app/settings/page.tsx`, and `lib/permissions.ts`. Not urgent — but when you next touch two or more of these files, do it then.

**[DON'T BOTHER] Redis pub/sub for SSE**
This app runs on one process. The failure modes the Challenger described are all multi-process scenarios. Adding Redis introduces a new infrastructure component, a new connection to manage, and a new failure mode (Redis down = no real-time updates at all, vs. current where SSE simply reconnects). The cost is real; the benefit is zero at current scale. If you ever move to multiple processes, add it then — the `broadcast()` interface is narrow enough that the change is contained.

**[DON'T BOTHER] tRPC or OpenAPI schema generation**
The API surface is clean REST, the types are shared in `types/index.ts`, and the client already casts responses correctly. Adding tRPC requires migrating every route and every `useQuery` call — a massive refactor for type safety that TypeScript already provides within the monorepo. OpenAPI generation is only valuable if external consumers need to integrate; there are none. Skip both.

**[DON'T BOTHER] Auth provider abstraction**
Two auth modes (Google OAuth, local master key) is not a maintenance burden — it is a feature. The Challenger's `AuthProvider` interface would be justified if you were adding a third provider. You are not. The `APP_MODE` / `NODE_ENV` confusion the Challenger raised is real but the fix is one line: add `AUTH_COOKIE_SECURE=true` to your production `.env` and stop relying on the `NODE_ENV` inference. That is a 30-second fix, not an abstraction.

**[DON'T BOTHER] Mobile app compatibility (cookie auth → token auth)**
Cookie-based httpOnly sessions are more secure than bearer tokens for a web app. The claim that mobile apps cannot use httpOnly cookies is true for native apps, but there is no evidence of a native mobile app on the roadmap. If a mobile client is needed, add a token endpoint at that time. Changing auth architecture preemptively for a mobile app that may never be built is premature optimization.

---

## The one decision that matters most

**Switch to `prisma migrate dev` before the next schema change.**

Everything else on this list is incremental improvement. This is the only item with an irreversible downside if deferred. Every `db push` you run on a production database is a schema change with no history, no rollback, and one rename away from silent data loss. The migration to `migrate dev` takes two hours and produces a migrations directory that will save you hours of manual DDL work the first time a column rename or non-nullable addition goes wrong under pressure. The Defender correctly noted it is a one-hour operation to add migrations later — but that framing assumes nothing goes wrong in the meantime. One bad `db push` on a database with a season's worth of parts data is not recoverable without a backup.

Do this first, today, before the next schema edit.

---

## What NOT to do

**Do not split the backend into a separate service.** Both agents acknowledged this implicitly. The Defender made the case clearly. The Challenger's restructuring proposals were all within-monolith changes (service layer, migrations, Redis). Do not interpret the Challenger's critique as an argument for microservices — it is not.

**Do not add infrastructure during build season.** Redis, message brokers, separate auth services, OpenAPI tooling — none of these belong in a codebase being actively used by a team under a competition deadline. New infrastructure components are failure modes. Build season is not the time to introduce them.

**Do not generate migrations for every exploratory schema change during development.** The Challenger's prescription is `migrate dev` for all changes, but during early exploration (new table, prototype feature), `db push` on a local dev database with no real data is still the right tool. The critical rule is: once real data exists in a deployed instance, only `migrate deploy` touches that database. Never `db push` on production.

**Do not add multi-tenant row-level security before you have a second tenant.** The Challenger's `requireTeamMember()` primitive is correct to propose, but full tenant isolation (every query filtered by `teamId`, team membership table, join on every request) should not be built speculatively. Add `teamId` to `Project` now (cheap, unambiguous schema anchor). Build the access control when you have a second team that needs isolation.

**Do not add API versioning (`/api/v1/`).** There are no external API consumers. Versioning adds URL complexity, routing boilerplate, and the discipline overhead of maintaining multiple versions — all for consumers that do not exist. The internal TypeScript type system already catches breaking API changes at compile time, which is better than versioning for an internal API.
