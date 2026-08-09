# CUE frontend — implementation progress

Mirrors `backend/PROGRESS.md`'s shape exactly, same reason: each milestone below has its own
standalone prompt in the project root (`Prompt F0` onward), written so a brand-new Claude Code
session with no memory of prior conversations can execute it correctly on its own.

**Before starting any `Prompt FN` file below: read this table first.** If a milestone's listed
prerequisite isn't marked Done, stop and flag it rather than building on a foundation that isn't
there yet. Also read `backend/PROGRESS.md` — every frontend milestone below consumes a real,
already-shipped backend surface (M1–M10, all Done); it does not add backend capability, except
where F0 explicitly says otherwise (the auth/CORS gap, see its own row).

**Scope decision, recorded once here rather than repeated in every prompt:** this table covers the
Next.js web app (`frontend/`) only — Living WIP, Ask, Admin, and the other desktop-primary surfaces
CUE-Tech-Stack.md §7 assigns to web. The Line and Onsite Mode are mobile-only by that same section
("Onsite Mode... this is the hard constraint") and are deliberately **not** in this plan — no
`mobile/` or `apps/` monorepo restructure has been done, and none of the work below requires one.
CUE-Tech-Stack.md §7's `apps/web` / `apps/mobile` / `packages/domain-types` layout is a documented
*mechanical* move for whenever mobile work actually starts (lift `frontend/` into `apps/web`, add
`packages/domain-types` for the generated OpenAPI types both planes would then share) — deliberately
not done pre-emptively, same "mechanism exists, not a v1 feature commitment" discipline
CUE-PRD.md §4.2.1 already applies to the ontology's tenant tier and the Twin's archetype layering.
Don't restructure into a monorepo as a side effect of any prompt below; that's its own future
session's job, triggered by real mobile work starting, not by convenience.

| # | Milestone | Prompt file | PRD surface | Depends on | Status |
|---|---|---|---|---|---|
| F0 | Foundations — auth, API client, app shell, CI | `Prompt F0 — Frontend Foundations.txt` | §12.1 design language; infra for all surfaces below | backend M1–M10 (Done) | Done (2026-08-09) |
| F1 | Living WIP, verification & write-back | `Prompt F1 — Living WIP, Verification and Write-back.txt` | §12.2; FR-RPT; FR-LED-07/08; FR-WBK | F0 | Not started |
| F2 | Production Twin visualisation | `Prompt F2 — Production Twin visualisation.txt` | FR-TWN | F0 | Not started |
| F3 | Foresight — risks, deviations, escalation | `Prompt F3 — Foresight, Risks and Deviations.txt` | FR-FOR; FR-DEV; FR-NTF | F0 | Not started |
| F4 | Documents | `Prompt F4 — Documents.txt` | FR-DOC | F0 | Not started |
| F5 | Ask & Successor Brief | `Prompt F5 — Ask and Successor Brief.txt` | §12.5; FR-ASK | F0 | Not started |
| F6 | Vendor Reliability Graph | `Prompt F6 — Vendor Reliability Graph.txt` | FR-VRG | F0 | Not started |
| F7 | Admin console | `Prompt F7 — Admin console.txt` | §6.14 FR-ADM; channel/consent/retention | F0 | Not started |
| F8 | Analytics dashboard | `Prompt F8 — Analytics dashboard.txt` | §13 | F0, and partially F1/F3/F6 for data sources | Not started |
| F9 | Hardening — accessibility, localisation, perf | `Prompt F9 — Hardening, accessibility and localisation.txt` | §7.6 NFR-ACC; §7.1 NFR-PRF (web-applicable subset) | all of the above | Not started |

F1–F8 do not strictly have to run in table order after F0 — each depends only on F0, not on each
other, since every backend surface they read already exists and is independently REST-addressable.
The order above is a *recommended* sequence (flagship surface first, admin/analytics last because
they're least differentiated), not a hard dependency chain the way the backend table's M1→M4→M5
chain was. Note this explicitly in whichever prompt runs first after F0, so a session doesn't assume
a blocking dependency that isn't real.

## Design tokens (pre-F0 addendum, 2026-08-09)

Not a milestone of its own — folded into F0's own design-tokens task, done ahead of schedule because
the user wanted to review the visual direction before any application code existed. **Read
`frontend/DESIGN.md` before writing a single component** — it's the durable record of the palette
(validated with the `dataviz` skill's `validate_palette.js`, not eyeballed), type pairing (Geist
Sans/Mono + Noto Sans SC/TC, verified for real CJK glyph coverage by inspecting `pnpm build`'s actual
output), and layout concept, plus a link to the approved review artifact.

Implemented and verified: `app/globals.css` (the full token architecture — primitives → `@theme`
mapping → base rules), `app/layout.tsx` (Geist Sans/Mono + Noto Sans SC/TC via `next/font/google`),
`app/page.tsx` (the default `create-next-app` boilerplate is gone — it referenced tokens that no
longer exist). `pnpm build` and `pnpm lint` both clean.

**Not done, still F0's job**: the actual theme-toggle control (the CSS contract is ready —
`prefers-color-scheme` plus a `[data-theme]` override — but nothing sets `data-theme` yet), the app
shell/nav, and every surface's real content. `Prompt F0 — Frontend Foundations.txt` has been updated
to drop its own design-tokens task accordingly; don't redo it.

## Known gap this plan does not close

**`packages/domain-types` / a shared types package does not exist**, and isn't created by any
prompt below — F0 generates the OpenAPI client straight into `frontend/lib/api/`. This is the
correct call for a web-only, single-consumer plan (CUE-Tech-Stack.md §7's package only earns its
keep once a second client — mobile — needs the same generated types). Revisit the moment F-mobile
work starts, per this file's own scope note above.

## F0 notes (2026-08-09)

**Dev-seed script**: `backend/scripts/seed_dev_data.py`, a sibling to `loadtest/seed.py` rather than
an extension of it (that script deliberately stays a single-identity k6 bootstrap; this one seeds one
organisation, one `event-production-default`-archetype project, and one `User`+`Membership` per
FR-ADM-01 role). Prints `organisation_id` and each role's email to stdout for pasting into `/login`.
**Non-obvious fix mid-implementation**: `POST /auth/dev-login` always mints `subject=body.email`
(`app/api/auth.py`), and `resolve_user` matches existing users by `(issuer, external_subject)`, not
email — so a seeded row is only ever *found* by a later dev-login (instead of colliding with it on
`users_org_email_key` while trying to insert a "new" user) if `external_subject == email`. That in
turn means the seeded emails must be unique per run, not just per organisation, since
`(issuer, external_subject)` is a global constraint — hence `{role}+{org_id_prefix}@cue.dev` rather
than a bare `{role}@cue.dev`. Cost this session a live 500 in the Playwright run before being caught;
worth knowing before extending this script.

**Fetch wrapper**: `openapi-fetch`, per the prompt's own named judgment call — no deviation.
`frontend/lib/api/schema.gen.ts` is generated (`pnpm generate:api`, backend must be running) and
committed; `lib/api/client.ts` is the thin wrapper (Authorization header attached via middleware,
`NEXT_PUBLIC_CUE_API_URL` env var); `lib/api/server.ts` / `lib/api/browser.ts` split Server vs. Client
Component usage (`auth()` vs. `useSession()` as the token source).

**Auth flow**: Auth.js v5 (`next-auth@beta`), Credentials provider (`auth.ts`) calling
`POST /auth/dev-login`, JWT session strategy, backend access token carried in the Auth.js JWT/session
via `callbacks.jwt`/`callbacks.session`. `/login` posts through `next-auth/react`'s `signIn()`.
`@auth/core` had to be added as an explicit devDependency purely so its type declarations are
resolvable for module augmentation (`types/next-auth.d.ts`) — pnpm's strict `node_modules` otherwise
nests it only inside `next-auth`'s own install, which silently breaks `declare module "@auth/core/..."`
merging (surfaced as `Property 'accessToken' does not exist on type 'Session'`, wrong at first for a
non-obvious reason — see that file's own comments for the full explanation, including the `export {}`
"module vs. script" gotcha that briefly made `NextAuth(...)` itself stop type-checking as callable).

**This Next.js version renamed `middleware.ts` to `proxy.ts`** (functionally identical — see
`frontend/proxy.ts`'s own comment) — `frontend/AGENTS.md`'s warning to check
`node_modules/next/dist/docs/` rather than trained-in knowledge caught this before it became a
same-named-file-does-nothing bug.

**Route layout**: `/login` (outside the shell), `app/(shell)/layout.tsx` (auth-gated, fetches
`GET /projects` for the nav), `app/(shell)/page.tsx` ("/", redirects to the sole project or shows a
picker), `app/(shell)/projects/[projectId]/...` for project-scoped surfaces (Living WIP at the
project's own root, `twin`/`foresight`/`documents`/`ask` alongside it), and top-level `/admin`,
`/vendors`, `/analytics` for the org-scoped surfaces (Admin console, VRG, Analytics) — deliberately
*not* nested under `/projects/[projectId]`, since their own backend endpoints (`/admin/*`, `/parties`)
are org-scoped, not project-scoped. F1–F8 own the real content; this session only left the shell.

**CI**: `.github/workflows/ci.yml` has two jobs — `lint-typecheck-test-build` (lint, typecheck,
Vitest, `next build`, no backend needed) and `e2e` (checks out `cue-backend` as a sibling directory,
brings up its `docker-compose.yml` stack, applies migrations, starts the API, then runs the one real
Playwright spec against it — no mocks, per this file's own testing-philosophy note). Confirmed green
against a real pushed commit via `gh run watch`, not just "should work" (see commit history).

## Updating this file

When a milestone completes:
1. Flip its Status cell to `Done`, with the commit/date.
2. Note anything the next milestone's prompt should know that wasn't true when it was written (a
   design decision made mid-implementation, a scope adjustment, a discovered blocker) — own
   subsection below, same shape `backend/PROGRESS.md` uses per milestone.
3. Run the frontend's full check (typecheck + lint + unit tests + the Playwright suite against a
   real running `backend/` per `docker-compose.yml`, not a mocked API — see F0's own testing
   philosophy note) and confirm it's green before flipping the status.
