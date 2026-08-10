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
| F1 | Living WIP, verification & write-back | `Prompt F1 — Living WIP, Verification and Write-back.txt` | §12.2; FR-RPT; FR-LED-07/08; FR-WBK | F0 | Done (2026-08-09) |
| F2 | Production Twin visualisation | `Prompt F2 — Production Twin visualisation.txt` | FR-TWN | F0 | Done (2026-08-10) |
| F3 | Foresight — risks, deviations, escalation | `Prompt F3 — Foresight, Risks and Deviations.txt` | FR-FOR; FR-DEV; FR-NTF | F0 | Done (2026-08-10) |
| F4 | Documents | `Prompt F4 — Documents.txt` | FR-DOC | F0 | Done (2026-08-10) |
| F5 | Ask & Successor Brief | `Prompt F5 — Ask and Successor Brief.txt` | §12.5; FR-ASK | F0 | Done (2026-08-10) |
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

## F1 notes (2026-08-09)

**Pending-verification entry point: Living WIP alone, not a separate "needs verification" view.**
Every section that carries a commitment reference (vendor status's outstanding/confirmed rows,
next steps, decision log's outstanding approvals, budget summary's provenance, the export-blocked
409 list) already opens the same commitment detail drawer — a dedicated pending-items list would
only be a filtered re-projection of what's already one click away from several places on this one
page. Documented here rather than left as an open question for a later session, per the prompt's
own instruction.

**Two small, additive backend gaps found and closed while reading the surfaces this session builds
against** (same "close the gap you find, document it" pattern `backend/PROGRESS.md`'s post-M10
section already established) — see that file's own "Frontend-enablement additions, round 2" entry
for the full reasoning:
- `EvidenceOut.media_ref` was never exposed by any response schema, so FR-VOI-05 (audio playback
  from any evidence link) had no API surface at all. Added.
- `GET /projects/{project_id}/members/me` (effective roles) didn't exist, so the frontend had no
  way to know which role-gated controls (payment-status, budget-revise, write-back, verify) to
  *show* the current user — F0's own stated "UX nicety, not a security boundary" position needed
  this to be more than a stated intention. Added, any-member-gated, mirrors
  `app.identity.service.effective_roles` exactly.
- `PATCH /projects/{project_id}/writeback/{outbound_id}` (draft_text edit) was also missing — this
  prompt's own §4 explicitly asks for "review/**edit** before authorisation," and there was no way
  to edit a composed draft before this, only to review it. Added, draft-status-only, same
  `WRITE_ROLES` gate as draft/authorise/send.

`backend/scripts/seed_dev_data.py` (F0's own script) extended with real ledger content per this
session's own TESTING EXPECTATION ("prefer extending the seed over hand-crafting one-off
fixtures"): a vendor `Party` + `Channel` + `ChannelIdentity` + real-capture `Message`/`Evidence`
(bilingual, Chinese original / English translation — exercises P7's toggle), one
`pending_verification` monetary `Commitment` off that evidence (drives verify-end-to-end, the
export-block 409, and write-back draft in one fixture — write-back's `_resolve_writeback_target`
needs real-capture evidence, not a manually-entered commitment), one `human_verified` `Commitment`
for section variety, a `Budget` baseline, and one `auto_drafted` `Deviation`. Hit and fixed a real
bug in the same pass: `channel_identities` has a *global* `UNIQUE(channel_type, external_id)`
constraint (not per-organisation), so a fixed phone number collided across separate seed runs the
same way F0's own notes describe for a fixed dev-login email — fixed with the same
org-suffix-per-run treatment.

**A real correctness bug caught by actually running the app against the backend, not just
typecheck/lint/build:** the commitment correction form's `due_at` field round-tripped through
`toDatetimeLocal` by slicing the UTC ISO string's first 16 characters and handing it to
`<input type="datetime-local">`, which the browser (correctly) treats as *local* time — off by the
viewer's UTC offset, and building the value back to compare against the original's full-precision
UTC string flagged *every* plain "Confirm" as a correction (`human_corrected` instead of
`human_verified`), polluting FR-LED-09's training-signal labelling on every single verification.
Fixed by (1) building the datetime-local string from `Date`'s own local-timezone getters instead of
slicing the raw UTC string, and (2) comparing the form's value against the *same* minute-precision
transform applied to the original, not full ISO precision the input can never actually express.
Caught via a real Playwright-driven browser session against the live backend (screenshots + network
log), not inferred from reading the code — see the two other bugs that same pass caught: a
`<button>` nested inside `ProvenanceChip`'s own `<button>` (invalid HTML, hydration error, blocked
the whole page in dev) in `CommitmentSummaryRow`, and `ExportBlockedBody` missing FastAPI's own
`{"detail": {...}}` wrapper around `HTTPException(detail=...)` (crashed the export-blocked-list
render with `Cannot read properties of undefined`). All three fixed; the full 8-step manual
walkthrough (view report → open evidence → translation toggle → export-blocked 409 → verify →
report figure updates → write-back draft → export succeeds) and a second pass (deviation
confirm-as-is, budget revise, payment-status) were re-run clean afterward with zero console errors.

**Testing**: `pnpm test` (Vitest) covers the verification badge across all five states, the
original/translation evidence toggle (plus the no-translation and no-media-ref cases), and the
export-blocked-409 list rendering (`useExportMutation` mocked, `ExportBlockedError` real) — the
three behaviours this session's own TESTING EXPECTATION names explicitly. `pnpm test:e2e`
(`e2e/living-wip.spec.ts`, `test.describe.serial` since both tests act on the same seeded
commitment) covers, against the real backend: viewing all seven sections with real seeded data;
export blocked with a genuine unverified monetary commitment; verifying it and seeing the budget
summary's own verification pills flip in the same page (not just the drawer); the full write-back
draft → authorise → send cycle (draft composed by the real local Ollama model — the test budgets
150s for this, not a fixed sleep); and export succeeding once verified, with a real signed MinIO
download link. `pnpm typecheck` / `pnpm lint` / `pnpm build` all clean.

## F2 notes (2026-08-10)

**Layout decision, made deliberately per this prompt's own instruction: a vertical, chronologically-
ordered timeline (a rail with a dot/lock marker per milestone, ordered by each node's own CPM-computed
`earliest` date), not a horizontal Gantt bar-chart and not a force-directed graph.** CUE-Tech-Stack.md
§4's "tens of nodes... twenty lines of code, not a database" already ruled out a graph-visualisation
library; between the two remaining timeline shapes, horizontal Gantt bars need a fixed date scale and
either truncate real milestone names or force horizontal scrolling once a project has two dozen items
(the seeded archetype alone has 19) — a vertical list reads top-to-bottom like Living WIP's own
"stable document" pattern (DESIGN.md's layout concept) and scales to any milestone count without a
scale problem. Dependency *edges* (upstream/downstream/lag) are a separate "Dependencies" section
below the timeline, not drawn as rail connectors — overlaying both concerns on one rail would
reintroduce the density problem a graph layout was ruled out for in the first place. See
`lib/twin/presentation.ts`'s `joinTwinNodes` docstring and `components/twin/timeline.tsx`'s own
docstring for the full reasoning kept in-code.

**Ontology `type_code` discovery, confirmed working as documented**: `GET /projects/{id}/ontology-
terms?category=milestone_type` (F0's own addition) backs the add-milestone type picker
(`components/twin/add-milestone-form.tsx`) — no CUE-PRD.md §4.2 term list hardcoded client-side, per
this prompt's own instruction. One real gap found while wiring it: `OntologyTermOut` deliberately
omits `id` (`backend/app/api/schemas.py`'s own docstring: "this response shape matches what a caller
can actually use" — codes are the only stable reference), which means `MilestoneOut.type_term_id` (a
raw UUID) has **no way to resolve back to a human-readable type label** anywhere in the current API
surface — the ontology-terms endpoint can validate/populate a picker by code, but can't answer "what
type is milestone X" after the fact. This session works around it by simply never displaying a
milestone's type in the UI (name + dates + slack + fixed-ness carry enough identity on their own) —
worth a `GET /ontology-terms/{id}` or an `id` field added to `OntologyTermOut` if a later session
needs to show it.

**Two backend-response-shape gaps found and worked around, not fixed** (documented per this prompt's
own instruction, same "flag it in PROGRESS.md rather than working around it client-side" pattern):
- `POST .../milestones/dependencies`'s cycle-rejection 422 and `DELETE .../milestones/{id}`'s
  referenced-edge 409 are both a plain `HTTPException(detail="...")` — a bare string, never
  `HTTPValidationError`'s typed `{detail: ValidationError[]}` array shape openapi-typescript generates
  for every other 422 in this API. `lib/api/types.ts`'s `TwinErrorBody` and `lib/twin/hooks.ts`'s
  `TwinConflictError` name this explicitly (same pattern `lib/reports/hooks.ts`'s `ExportBlockedError`
  already established for the export-blocked 409). The cycle 422 also doesn't name *which* milestones
  form the loop — surfaced verbatim as the backend's own message ("this dependency would create a
  cycle (FR-TWN-01)") rather than re-derived client-side, per this prompt's own explicit instruction
  not to work around it that way.
- `DELETE .../milestones/{id}`'s 409 body is a flat message, not a structured list of blocking edges —
  `components/twin/milestone-detail-panel.tsx` never actually sends that request while blocked: it
  filters the already-loaded `dependencies` list client-side for edges referencing the milestone and
  refuses locally, listing them with an inline "remove edge" action per row, so the UI never has to
  parse a 409 it can't get structure out of.

**Real backend gap found and closed, not just a frontend workaround**: `backend/scripts/
seed_dev_data.py`'s seeded project never set `event_start` — `materialize_archetype`'s own docstring
says every seeded `Milestone.planned_at` is `None` without it, so the Twin surface would have rendered
completely dateless (`earliest`/`latest`/`slack_days` all `null` on every node, nothing to visually
distinguish). Added `event_start = now + 90 days` (covers the archetype's own earliest anchor,
`fnb_confirmation` at day offset -86). Also added one real fork/join branch — "Backup generator
delivery," forking from "Exhibits move in" and rejoining at "Content load into screens," 5 days versus
the original path's 1 — per this prompt's own TESTING EXPECTATION ("extend the dev-seed script... a
couple of parallel branches, at least one fixed node"); `doors` already covered the fixed node. This
produces a genuinely non-trivial, verified-against-the-real-CPM-engine fixture: the new branch becomes
critical (-4d slack, pulling the *entire* upstream chain's `latest` back with it, a real and correct
property of `app/twin/graph.py`'s backward pass once a shared ancestor has two successors of different
length), while the original rigging/install/exhibitor-check-in leg it bypasses sits at exactly 0d slack
— off the critical path despite being "on schedule," a genuinely instructive case for slack rendering.
Confirmed live against the real backend (`uv run python3 scripts/seed_dev_data.py`, then
`GET /twin/current`) before writing any frontend code against it, not assumed from reading
`graph.py` alone.

**Propagation simulator supports multi-candidate comparison in one call** (FR-TWN-07's own "recovery
options" surface) — not cut for a later pass. `PropagateRequest.candidates` already accepts more than
one; `components/twin/propagation-simulator.tsx` lets a PM add several "what if" rows and submits them
in one `/twin/propagate` call, rendering each candidate's result as its own card in a wrapped row for
side-by-side comparison. Cost nothing extra structurally once the single-candidate form existed, so
built rather than deferred.

**Manual recompute affordance kept** (`components/twin/recompute-button.tsx`, `POST .../twin/
recompute`) even though every mutation this session's own hooks make already invalidates and refetches
`/twin/current` — §11.2's resource table lists it as its own operation, and unlike the equivalent-read
`GET /twin/current`, it leaves a distinct, audited "a PM explicitly asked for a fresh look" entry
server-side (`app/api/twin.py`'s own docstring). Useful for a change made outside this app (e.g. an ops
fix run directly against the database) that this session's own cache has no other reason to refetch.

**Testing**: `pnpm test` (Vitest) — `lib/twin/presentation.test.ts` covers `joinTwinNodes`'s join-by-
`milestone_id` and earliest-date ordering (including the orphan-milestone and tied-date fallback cases)
against hand-built `TwinCurrentOut`-shaped fixtures, and `formatSlackDays`'s null/negative/zero/positive/
fractional cases; `components/twin/timeline-node.test.tsx` renders `TimelineNodeRow` directly against
hand-built `TimelineNode` fixtures and asserts the critical-path badge, the fixed-node lock marker +
badge (independent of criticality), and slack-text rendering — this milestone's own TESTING EXPECTATION
named all three explicitly. `pnpm test:e2e` (`e2e/twin.spec.ts`, `test.describe.serial`, extending the
same seeded project `e2e/living-wip.spec.ts` already logs into) covers, against the real backend:
viewing the timeline with real critical-path/fixed-node styling from the seeded fork/join fixture;
editing "F&B confirmation" (the graph's one source node, so its own date edit is guaranteed to ripple
forward — `graph.py`'s forward pass ignores a non-source node's own `planned_at`) and confirming a
downstream row's rendered text changes; attempting a cycle-creating dependency and seeing the
`TwinConflictError` message rendered inline; opening "Backup generator delivery" (this session's own
seed fixture, with exactly two edges) and confirming the delete affordance never renders while blocked,
listing both edges instead; and running a propagation simulation, then hard-reloading and confirming
the binding-constraint banner's text is byte-identical to before the simulation. No test deletes a real
milestone or dependency, so nothing here corrupts the shared fixture for a spec file running alongside
it in the same suite. `pnpm typecheck` / `pnpm lint` / `pnpm build` all clean. Verified live in a real
browser against the real backend before writing the Playwright spec (not just inferred from code) —
screenshots covered the full timeline, a blocked-delete drawer, a rejected cycle, and a completed
propagation run followed by a reload proving no persistence.

## F3 notes (2026-08-10)

**Route/composition decision**: kept the existing `/projects/[projectId]/foresight` placeholder route
(F0 already reserved it in `components/app-shell/project-subnav.tsx`) rather than folding into another
surface. One scrolling page (`components/foresight/foresight-view.tsx`), same "sections as bounded
panels" concept `SectionPanel` already establishes for Living WIP/Twin, not a new layout system:
Risks, Deviations, Your notifications, Webhook subscriptions, Quiet hours, Foresight thresholds — in
that order, risk feed first per the Challenge Brief's own "Critically weighted" note this prompt
called out. **Quiet-hours and threshold config live here, not under Admin (F7, not yet built)** — both
are Foresight-specific configuration (item 5's own judgment call); F7 should link to these two screens
when it exists, not duplicate them.

**Role gates, confirmed by reading the dependency each endpoint actually uses, not assumed**:
`app/api/foresight_admin.py`'s `threshold_router` is `require_org_administrator` — org-wide ("holds
`administrator` on *any* project in the org"), genuinely different from every other write gate on this
page. `quiet_hours_router` and `webhooks`/`risks`/`deviations` write actions are all ordinary
`require_project_role(*WRITE_ROLES)`. `components/foresight/threshold-config-panel.tsx` renders a 403
as an explainable "you don't hold that role" message (`ForesightPermissionError`,
`lib/foresight/hooks.ts`), not a generic failure — most write-role viewers of this page will see it.

**Severity/status color mapping actually wired** (DESIGN.md flagged its own §12.1 mapping as "a
reasonable default, not tested against every real value yet" — this is that): `SeverityBadge`
(`components/foresight/severity-badge.tsx`) steps `low`→quiet neutral, `medium`→warning,
`high`→serious, `critical`→critical (low and medium deliberately share the warning dot hue — label
text carries the distinction, not color alone, per §12.1). `RiskStatusBadge` is a second, independent
brand-hue pill system (open/acknowledged/signal/dusk), same "can never be confused with severity even
at a glance" discipline the verification-chip system already established — `resolved` and
`superseded` render with visibly different hue/copy, never collapsed into one "closed" look, per this
prompt's own NON-OBVIOUS note.

**Two real backend-shape gaps found — and actually fixed, not left as documented workarounds.**
Originally landed as flagged-not-fixed (this codebase's own "flag it, don't silently work around it"
convention, `components/twin/`'s own PROGRESS.md notes set the precedent) since fixing either meant
touching backend code outside F3's own stated scope. Both were then closed on explicit direction, same
"close the gap you find, document it" pattern the post-M10 and F1 frontend-enablement additions already
established — see `backend/PROGRESS.md`'s new "round 3" section for the full backend-side writeup:
- **`OntologyTermOut.id`** — was deliberately omitted (a choice that only covered *picking* a term to
  write, not resolving an already-persisted `*_term_id` FK back to a label; F2's notes had already hit
  the identical gap for `MilestoneOut.type_term_id` and worked around it by never displaying a
  milestone's type at all). Now a real, additive field. `lib/foresight/hooks.ts`'s
  `useDeviationClassTermsQuery` + `resolveTermLabel` (a plain `Map`-style lookup over the already-
  fetched category list, unit-tested in `lib/foresight/resolve-term-label.test.ts`) resolve
  `Deviation.class_term_id` to its real `label_en (code)` in `components/foresight/deviation-row.tsx`,
  falling back to the raw id only if a term is ever genuinely missing from the fetched set (stale
  cache, or a term retired from the project's effective vocabulary after the Deviation was created) —
  never a guess. F2/Twin's own identical `type_term_id` gap is now trivially closeable by the same
  mechanism (same schema fix); not retrofitted into Twin's code this session, since that wasn't asked
  for and Twin is a separate, already-Done, already-tested surface.
- **`GET /projects/{project_id}/members`** — didn't exist; only self-only `/members/me` and the
  org-admin-gated `GET /admin/roles` (which itself carries no display_name/email) did.
  `DeviationResolveRequest.resolution_owner` (FR-DEV-03) is a required user id, so an ordinary
  write-role PM — the same tier actually allowed to call `POST .../resolve` — had no way to name a
  colleague at all. Now a real, project-scoped, any-member-readable endpoint (`ProjectMemberOut`: a
  proper `Membership` × `User` join, one explicit query, not two round trips). `lib/members/hooks.ts`'s
  `useProjectMembersQuery` + `resolveMemberLabel` (unit-tested in `lib/members/
  resolve-member-label.test.ts`) back a real `<select>` of names in the resolve-deviation form —
  no more pasted UUID — and also resolve an already-recorded `resolution_owner` back to a name in the
  "Resolved for ... owner ..." line, which the pre-fix version left as a raw id too.

Both fixes verified against the real backend before regenerating the client (`curl` against the live
`fastapi dev` reload, not just read from the diff) — `lib/api/schema.gen.ts` regenerated via
`pnpm generate:api`, `pnpm typecheck`/`pnpm lint`/`pnpm test`/`pnpm build` all clean afterward, and the
full backend suite (`uv run pytest`, 508 passing, up from 504) confirmed no regression from either
schema/endpoint change.

**Cross-surface linking is plain navigation, not a query-param deep link.** A Risk/Deviation card's
`commitment_id`/`milestone_id` links to `/projects/{id}` (Living WIP) or `/projects/{id}/twin`, not a
specific open drawer — F1/F2 render their own detail drawers from local `useState`, not a URL param, so
wiring true deep-linking would mean adding `useSearchParams`-driven initial state to both of those
already-Done, already-tested surfaces. Judged not worth the regression risk for this session; landing
on the right surface (rather than a generic project page) still satisfies "linking through to whichever
real object it's about" honestly. `spec_claim_id` renders as inert text ("see Documents — coming soon")
since no Document surface exists yet (F4), per this prompt's own EXPLICITLY OUT OF SCOPE note.

**Dev-seed extension** (`backend/scripts/seed_dev_data.py`): two `Risk` rows (one `silence`/`open` with
a fixture `base_rate=0.8` on the pending LED-wall commitment, one `forecast`/`open`/`critical` with
`base_rate=None` on "Content load into screens" — covers both the base-rate-present and honestly-absent
render paths), one collapsed `Notification` (`collapsed_count=2`) to the seeded administrator (same
role `e2e/global-setup.ts` logs Playwright into), and a second, already-`confirmed` manual `Deviation`
(distinct from the existing auto-drafted `spec_drift` one, so confirm and resolve each have their own
row to act on) — real ORM-direct rows, same pattern `loadtest/seed.py` established, since the arq
worker's periodic sweeps only ever fire on real elapsed time.

**Testing**: `pnpm test` (Vitest, 57 passing across 13 files) — `severity-badge.test.tsx`/
`risk-status-badge.test.tsx` cover all four `RiskSeverityLiteral`/`RiskStatusLiteral` values each (this
milestone's own TESTING EXPECTATION named both explicitly); `notification-list.test.tsx` covers the
collapsed-count "N related findings" rendering (both the collapsed and uncollapsed cases) against
`NotificationRow` directly, hand-built fixtures, no query client needed; `lib/foresight/
resolve-term-label.test.ts` and `lib/members/resolve-member-label.test.ts` cover the two ontology-
term/member label resolvers' found/not-found/not-yet-loaded cases (the "round 3" fixes above). `pnpm
test:e2e` (`e2e/foresight.spec.ts`, `test.describe.serial`, 7 specs) covers, against the real backend:
server-side severity filtering on the risk feed; every risk card leading with `downstream_consequence`
and rendering `base_rate` honestly (present vs. "not enough history yet"); the acknowledge/resolve 409
race — confirmed that `acknowledge_risk` is actually idempotent on an already-*acknowledged* risk
(`app/api/risks.py`'s own guard only rejects `resolved`/`superseded`), so the real race test resolves
the risk out-of-band via the same session's own bearer token (`GET /api/auth/session`) and confirms a
stale-UI acknowledge click 409s but the mutation's `onSettled` refetch still converges the card on the
true "Resolved" state with an explanatory message, never a stuck stale "Open"; confirming an
auto-drafted deviation as-is *and* asserting its class now renders as "Spec drift / contradiction," not
a raw `class <uuid>` string; recording a deviation resolution by picking a real name from the member
`<select>` (asserting the option count matches the seeded roster and the resolved row reads "owner
Producer," never a UUID); a webhook's signing secret shown exactly once (asserted absent from the page
after dismissal *and* after a hard reload); and a project-scoped threshold override, verified by
reading it back after a reload rather than inferring the POST succeeded from the optimistic UI alone.
Two real bugs this test run caught and fixed: the risk conflict-error message was originally nested
inside the same `canAcknowledge || canResolve`-gated block as the action buttons, so it disappeared the
instant the risk moved to a terminal status — exactly when it mattered most (moved outside that block
in `risk-card.tsx`); and the initial "round 3" edit to `app/api/ontology.py` dropped the already-
required `sort_order` field while adding `id` (caught immediately by the live `curl` check against the
running backend, not by a passing-but-blind test). `pnpm typecheck` / `pnpm lint` / `pnpm build` all
clean; full `pnpm test:e2e` suite (F0–F3, 15 specs) passes together, confirming no regression in F1/F2's
own already-Done surfaces from either backend schema/endpoint change.

## F4 notes (2026-08-10)

**Route/composition decision**: `/projects/[projectId]/documents` reuses F0's reserved placeholder
route (list + search + upload entry point, `components/documents/documents-view.tsx`); document
detail (lineage, versions, approve, tagging, spec claims) is a new nested
`/projects/[projectId]/documents/[documentId]` route — the first nested dynamic route in this app
(every other surface so far is one page per top-level route). Chosen over a client-side drawer
because the prompt's own WHAT TO BUILD lists "Document detail" as a distinct item from "list," and a
real URL per document is worth having for direct linking (Foresight's risk cards now link straight
to one, see below).

**The prompt file's own OCR/parsing NON-OBVIOUS note is stale — verified against the running
backend, not trusted.** It states real OCR/document parsing "is not wired up" for the direct
`POST /documents` upload endpoint. That was true when the prompt was written but not anymore:
`app/documents/service.py`'s `_derive_extracted_text` (backed by `app/capture/media.py`'s real
pdftotext/Office/Tesseract extractors) now runs automatically whenever a caller doesn't supply
`extracted_text`, confirmed by reading the service code directly and by
`tests/test_upload_without_extracted_text_auto_derives_it_from_a_real_pdf` passing against the real
backend. The upload/new-version forms' copy reflects the real behaviour ("leave blank to let CUE
auto-extract... not every file type can be auto-extracted") rather than the prompt's blanket "not
wired up" framing — an upload with no `extracted_text` supplied is very often still searchable now.
The "not yet indexed" warning on a version (`components/documents/version-history.tsx`) still fires
correctly for the genuine remaining case: `extracted_text` is `null` because derivation genuinely
failed or the file type isn't one of the real extractors' targets.

**Multipart-vs-generated-client handling decision** (the prompt's own item to document): no custom
`bodySerializer` needed. `openapi-fetch`'s `defaultBodySerializer` (`node_modules/openapi-fetch/src/
index.js`) already special-cases `body instanceof FormData` — returns it untouched and skips setting
`Content-Type` so the browser sets the real multipart boundary itself. `lib/documents/hooks.ts`'s
`toFormData` builds a real `FormData` and casts it through the generated `Body_create_document_...`/
`Body_create_version_...` type at the call site (which renders a file upload field as `file: string`
— openapi-typescript's stand-in for binary, never what's actually sent). No prior milestone had a
multipart precedent to follow; this is F4's own judgment call, verified against the library source
directly rather than assumed, and proven end-to-end by `e2e/documents.spec.ts`'s real
`setInputFiles`-driven upload against the real backend/MinIO.

**Documented response-shape gap, not fabricated**: `DocumentVersionOut` carries no write-back-outcome
field — confirmed by reading `app/api/schemas.py` directly. `approve_version`'s real outcome
(`sharepoint_write_back: "ok"`/`"failed: ..."`) is recorded only on `document_audit_log`, which has
no read endpoint at all. The Approve UI (`version-history.tsx`) reads as unconditionally final
("Approved by X on Y") with a plain caption noting sync status isn't surfaced by this build — never a
fabricated "synced to SharePoint" the API never actually confirmed, per this milestone's own
NON-OBVIOUS note. Left as documented, not closed: exposing an audit-log read endpoint is a real but
separate addition, out of scope for what this session needed.

**One real Class-A gap found and closed — `SpecClaim.contradicts` resolution across documents.**
`app/foresight/contradiction.py` compares spec claims project-wide by shared
`deliverable_id`/`location_code`, not just within one document version, so a `contradicts` target can
live on a version the spec-claims view never fetched (`GET .../versions/{id}/spec-claims` only
returns one version's claims). There was no endpoint to resolve a single claim by id at all. Closed
on the spot (backend/PROGRESS.md's "round 4"): `GET .../documents/spec-claims/{spec_claim_id}` +
`SpecClaimResolvedOut` (adds `document_id`/`document_name`/`document_version_no`, doesn't touch
`SpecClaim`'s own CUE-PRD.md §4.3 field set). `lib/documents/hooks.ts`'s `useResolveSpecClaimQuery`
backs `components/documents/spec-claims-panel.tsx`'s real "Conflicts with X at Y — from Z" link, and
is reused as-is (not duplicated) by `components/foresight/risk-card.tsx` to turn `RiskOut.
spec_claim_id` into a real "View spec claim in Documents →" link, replacing the inert "coming soon"
placeholder F3 left there. Verified against the live backend (`curl`) before regenerating
`lib/api/schema.gen.ts`; full backend suite green afterward (510 passing, up from 508).

**Two Class-A-shaped checks that turned out to already be closed, not new gaps**: `DocumentOut`'s
`class_term_id`/`milestone_type_term_id`/`phase_term_id` are the same shape of raw-id-needing-a-
resolver risk F2 left open for `MilestoneOut.type_term_id` — but F3's own "round 3" fix
(`OntologyTermOut.id`) already covers all three categories (`deliverable_class`/`milestone_type`/
`phase`), so `lib/documents/hooks.ts`'s three thin category-scoped query hooks +
`resolveTermLabel` (mirrors `lib/foresight/hooks.ts`'s copy, not imported cross-surface — same
per-surface-owns-its-hook convention F2/F3 already established) close it for Documents without any
backend change. `DocumentVersionOut.approved_by` is a raw user id too, but `lib/members/hooks.ts`'s
`resolveMemberLabel` (added in F3's own round 3) already resolves it — no new gap either.

**Documented, not silently presented as more than it is**: `GET .../documents` has no server-side
filter query params (unlike `GET .../risks`'s `status`/`source`/`severity`), so the class-filter
dropdown on the list page filters the already-fetched document list client-side —
`components/documents/document-list.tsx`'s own comment says so; not built to look like a server
filter it isn't. Signed URLs (`DocumentVersionOut.download_url`, NFR-SEC-02) expire after 3600s
(`storage.py`'s own default) against F0's global 60s `staleTime` default — confirmed, not assumed,
that this is two orders of magnitude of headroom, so no per-query override was added.

**Dev-seed extension** (`backend/scripts/seed_dev_data.py`): two documents (`quotation.pdf`/
`shop-drawing.pdf`), one spec claim each at the same `location_code`/`attribute` with genuinely
different `dimension` values, `contradicts` wired directly — same reasoning F3's own
`risk_silence`/`risk_forecast` ORM-direct fixtures give (the real contradiction detector only fires
from the arq worker's periodic sweep, not something Playwright can wait on). `e2e/documents.spec.ts`'s
own upload/version/approve test uploads a fresh document through the real UI instead, so that path
still exercises the real `StorageBackend`/MinIO rather than relying on the seeded fixtures' fake
`storage_ref`.

**Testing**: `pnpm test` (Vitest, 64 passing across 15 files, up from 57) — `version-history.test.tsx`
(4 new: exactly one row marked Current with every other one Superseded, `approved_by` resolved to a
real member label not a raw id, the not-yet-indexed warning firing correctly on a null
`extracted_text` while a populated one previews instead, and Approve only offered for a
not-yet-approved version to a write role) and `upload-document-form.test.tsx` (3 new: nothing rendered
for a non-write role, the multipart mutation never firing without both `file` and `name`, and a real
`File` object plus every typed field reaching the mutation call once both are present — jsdom doesn't
correctly recognise a `required` file input as satisfied by `userEvent.upload` for
`checkValidity()`, a jsdom gap not a real-browser one, so these two use `fireEvent.submit` to exercise
the component's own guard directly rather than depend on that). `pnpm test:e2e`
(`e2e/documents.spec.ts`, `test.describe.serial`, 4 specs) against the real backend/MinIO: a real
multipart upload appearing in the list, gaining a second version, the current pointer moving and the
old version reading Superseded, and Approve marking it approved without implying a sync outcome;
lexical search returning a real match against uploaded `extracted_text`; tagging round-tripping a
real ontology-term code through a reload (not a pasted UUID); and the seeded cross-document
`contradicts` pair rendering as a real link with no raw UUID visible, followed all the way to the
target document. `pnpm typecheck`/`pnpm lint`/`pnpm build` all clean; full `pnpm test:e2e` suite
(F0–F4, 19 specs) passes together — one `foresight.spec.ts` failure seen under 5-way parallel workers
(a `dev-login` race between concurrently-running `global-setup` seed scripts, not a documents
regression) reproduced as a clean pass when re-run alone, confirming no regression in F1–F3's own
already-Done surfaces from the risk-card change or the backend schema/endpoint addition.

## F5 notes (2026-08-10)

**Route/composition decision**: one page, three tabs (`components/ask/ask-view.tsx`) — chat, five
summary variants, Successor Brief — rather than three separate routes. The prompt's own WHAT TO
BUILD lists them as three distinct capabilities but never asks for three URLs, and all three share
one thing worth keeping in one place: a single `openCommitmentId` piece of state backing one
`CommitmentDetailPanel` (F1's own drawer, reused directly), so a citation opened from a chat answer,
a summary row, or a brief section all land on the exact same surface. Chat state (turns,
`conversationId`) lives in `ChatView` itself, not lifted to `AskView` — nothing outside the chat tab
needs it.

**Citation routing, per source_type — `lib/ask/citation-routing.ts` + `components/ask/
citation-chip.tsx`**: `commitment` opens F1's drawer directly; `deviation`/`budget` land on the
surface that owns that data (Foresight / Living WIP) since neither has a per-row deep-link target
yet (same "plain navigation, not a query-param deep link" call F3's own notes already made for
Risk/Deviation cards); `document_version` needs an async resolve (see the backend gap below) so it's
its own `CitationRoute` kind, not treated as synchronous; `audit_log` and `evidence` render as
inert "not yet available" chips with the reason in a `title` tooltip, never a fabricated link — see
the backend-gap entry below for why. All six values are covered by name in
`lib/ask/citation-routing.test.ts` (this milestone's own TESTING EXPECTATION), not just the four
that resolve to a real page.

**Real backend gap found and closed — `GET /projects/{project_id}/documents/versions/{version_id}`**
(`app/api/documents.py`, no new response schema — `DocumentVersionOut` already carries
`document_id`). A `document_version`-typed `Citation` (app/ask/schema.py) only ever carries the
DocumentVersion's own id, confirmed by reading `app/ask/answer.py`'s `_resolve_citation` directly —
every other version route in that router is nested under `/{document_id}/versions/{version_id}` and
needs both ids, which the citation doesn't have. Same Class A gap shape (frontend/CLAUDE.md's own
gap-audit section) as round 3's `OntologyTermOut.id` and round 4's `SpecClaimResolvedOut`; closed
the same way, on the spot. `lib/ask/hooks.ts`'s `useResolveDocumentVersionQuery` backs
`CitationChip`'s own small loading state around the resolve. See `backend/PROGRESS.md`'s "round 5"
for the full writeup and `tests/test_frontend_enablement_f5.py` for the backend tests (513 passing,
up from 511).

**Real backend gap found, deliberately left open — `audit_log` citations have no routing target at
all, not just no actor name.** This milestone's own NON-OBVIOUS note already named the actor-name
half (`Citation.label` is always null for this type, `AuditLog.actor_id` has no resolver anywhere).
Reading `_resolve_citation` further: the `Citation` for an `audit_log` hit carries only the
`AuditLog` row's own id — never `commitment_id`, which the row does have
(`app/models/audit.py`: `NOT NULL`) — and no endpoint resolves one to the other, so there's no way
to route to the commitment the log entry is even about, regardless of the actor problem. Closing
this would mean a second small resolver endpoint in the same shape as the document_version one
above; judged worth flagging rather than adding this session, since (unlike the document_version
gap) nothing in this milestone's own WHAT TO BUILD specifically depends on it and the prompt's own
NON-OBVIOUS note already anticipated leaving it as a named gap ("a real, named backend gap to flag
... not something to route around"). `routeCitation` returns `unavailable` for it, with the reason
in the chip's tooltip.

**`AskVendorStatusSummary` reused Living WIP's `VendorStatusPanel` component directly, unmodified**
(`components/ask/summaries/vendor-status-summary.tsx`) — the backend schema
(`{vendors, reliability_data_available}`) is byte-identical to `VendorStatusSection`, confirmed by
reading `app/ask/schema.py` before writing any UI, per this milestone's own instruction not to build
a parallel renderer. `DecisionLogRow`/`RiskLogRow` list-item rendering were extracted out of F1's own
`sections/decision-log-section.tsx` / `sections/risk-and-issues-section.tsx` into standalone
`components/living-wip/decision-log-row.tsx` / `risk-log-row.tsx` (both now import the extracted
component instead of inlining the same JSX) so the Successor Brief's decision-history and risks
sections reuse the exact same rows rather than a second copy — same reuse instruction, applied to
the two report-composer row shapes that didn't already have a standalone component.

**Summaries are auto-loading tabs, not a "generate" button per variant** — `useAskSummaryQuery`
(`lib/ask/hooks.ts`) wraps the `POST .../ask/summarise` call in a `useQuery`, not a mutation, so
switching tabs fetches immediately (same shape `useReportQuery` already gives Living WIP), except
`period_digest`: the only variant needing caller-supplied dates, so it owns a small date-range form
(defaulting to the trailing 30 days) and its own self-contained query rather than the shared
tab-switch-triggers-fetch pattern the other four use.

**Successor Brief is a real mutation-on-click, not a query that loads on mount** — matches §12.5's
"one control" framing literally: nothing renders until "Generate successor brief" is clicked, since
the backend endpoint takes no request body at all (confirmed against `app/api/ask.py` directly, per
this milestone's own instruction to check before assuming). A "Regenerate" affordance re-fires the
same mutation once a brief is showing.

**A real, live race condition found and fixed while writing `e2e/ask.spec.ts` against the real
backend, not inferred from reading the code** — `components/ask/chat-view.tsx`'s "New conversation"
button reset `conversationId` to `null`, but a *previous* question's response could still be in
flight at that moment (a real 32B local reasoning model isn't fast); when it landed, its own
`onSuccess` unconditionally called `setConversationId(data.conversation_id)`, silently reviving the
old conversation's id right after the user had asked for a fresh one. Caught by a Playwright run
that clicked "New conversation" immediately after firing a second question and asserted the *next*
request's `conversation_id` was `null` — it wasn't. Fixed with an `epochRef` bumped on every reset;
a mutation's `onSuccess`/`onError` now checks the epoch it was asked under against the current one
and no-ops if they've diverged, the same "ignore a stale response after the state it belongs to is
gone" shape a search-as-you-type debounce needs, applied here to a chat reset instead.

**`scripts/seed_dev_data.py` now ends with a real call to `app/ask/embed_worker.py`'s
`run_embedding_sweep()`** — the only thing that ever populates `RetrievalChunk` (Evidence/AuditLog
text) or `DocumentVersion.embedding`, normally an arq cron tick on real elapsed time, the same "not
something Playwright can wait on" gap F3's own risk fixtures and F4's own `contradicts` fixture
already work around, applied here to Ask's retrieval index instead of a foresight/documents fixture.
`DocumentVersion.search_vector` needs no such help (a `GENERATED` column, live the instant a version
is inserted) — confirmed by watching `e2e/ask.spec.ts`'s own document-grounded-answer test pass
before the embedding sweep's model dependency (`bge-m3`, below) was even available, since that test
deliberately only needs lexical document search. Real Evidence/AuditLog-citation coverage does need
the sweep to have run at least once; covered at the unit level for all six `source_type` values
regardless (`lib/ask/citation-routing.test.ts`), and this session confirmed the sweep itself succeeds
end-to-end (373 rows embedded from one seed run) once its model was actually available — see next.

**Environment note, not a code gap**: `app/ask/config.py`'s `EmbeddingSettings` defaults to
`bge-m3` (matching `DocumentVersion.embedding`/`RetrievalChunk.embedding`'s hardcoded `Vector(1024)`
column width — `nomic-embed-text`, the only other embedding model already pulled into this
environment's local Ollama, is 768-dim and would fail on insert, not a drop-in swap), but `bge-m3`
itself hadn't been pulled yet in this sandbox. Pulled it during this session (`ollama pull bge-m3`,
retried once after a transient network timeout at 5%) rather than working around it — this is
infra state, not application behaviour, so there was nothing to "fix" in the repo, just a one-time
local setup step future sessions in a fresh sandbox may need to repeat.

**Real CI gap found post-merge and closed — `.github/workflows/ci.yml`'s `e2e` job never pulled an
embedding model.** A real push surfaced `embedding sweep failed ... 404 Not Found for url
.../api/embed` in the job log, then `e2e/ask.spec.ts`'s document-grounded-answer test timing out on
its citation locator. Root-caused by direct reproduction, not guessed: held CI's own
`CUE_LLM_REASONING_MODEL: qwen2.5:14b` override fixed locally and toggled only the embedding model —
with a real one available, the test passed clean (30.9s); with the embedding call forced to 404 (the
exact CI condition, `CUE_EMBED_MODEL` pointed at a name Ollama doesn't have), the test failed
identically to the CI log (same locator, same 100s timeout). A smaller reasoning model was not the
cause; the missing embedding model was — losing the semantic half of retrieval changed what got
surfaced/ranked enough that the model's grounded-answer decision came out differently for this
question. Fixed by adding a `Pull bge-m3` + embed-warm-up step to the `e2e` job, mirroring the
existing `qwen2.5:14b` pull/warm-up pattern exactly, and bumping the Ollama model-blob cache key
(`ollama-models-qwen2.5-14b-bge-m3-v1`) since its contents changed. Not caught before the original
push because this session's own sandbox already had `bge-m3` pulled by the time
`e2e/ask.spec.ts` was written and run — the gap was in the *CI* environment specifically, never
exercised until a real workflow run.

**That fix was correct but incomplete — confirmed by watching the next real CI run rather than
assuming green.** The `bge-m3` pull itself succeeded cleanly (no `embedding sweep failed` trace at
all in that run's log, unlike the first), but the same document-grounded-answer test still missed
its own budget. Root cause this time: CI's `ubuntu-latest` runner is 2 vCPUs with no GPU, and
Playwright's own log line ("`Running 25 tests using 2 workers`") confirms a second worker's browser
is genuinely competing with Ollama inference for those same two cores — a fundamentally slower
environment than a developer machine, not a logic bug. The original 100s budget (already generous
by local standards, where this test passes in well under 45s) wasn't enough there. Widened every
answer-wait in `e2e/ask.spec.ts` to 220s (`test.setTimeout` to 240s) — comfortably inside the `e2e`
job's own 25-minute ceiling even with `playwright.config.ts`'s CI-only `retries: 1`, since every
other spec in the suite runs in seconds.

**Testing**: `pnpm test` (Vitest, 74 passing across 19 files, up from 64) —
`lib/ask/citation-routing.test.ts` (this milestone's own TESTING EXPECTATION: all six
`CitationSourceType` values, including the two `unavailable` ones) and
`components/ask/refusal-message.test.tsx` (the two refusal kinds render distinctly, never the same
generic shell — this milestone's own other named TESTING EXPECTATION). `pnpm test:e2e`
(`e2e/ask.spec.ts`, `test.describe.serial`, 6 specs, real Ollama qwen2.5:32b reasoning + bge-m3
embeddings, no mocks) covers, against the real backend: a document-grounded question producing a
real cited answer whose citation opens the real document (resolved via this session's own
`GET .../documents/versions/{version_id}` addition); a question with no supporting evidence
producing the honest `no_citable_source` refusal; an action-shaped question ("please chase the
vendor...", FR-ASK-06's own example) producing `action_not_yet_supported`, asserted visibly distinct
from the no-evidence refusal; a follow-up reusing the first answer's real `conversation_id` (asserted
at the network-request level, not inferred from UI text, so it doesn't depend on the model's actual
answer content) and "New conversation" genuinely dropping it afterward; each of the five summary
variants rendering against the real seeded project; and a full Successor Brief covering every named
section with real content, including a deviation row whose `resolution_owner` — if another spec's
own test had already resolved it — reads as a real member name, never a raw UUID. Every answer/
refusal assertion carries a generous timeout (up to 100s): a 32B local reasoning model with no
production serving infra behind it routinely exceeds Playwright's own 30s default, confirmed by
watching this suite actually time out before raising the budget, not assumed from NFR-PRF-04's
production-model figures. `pnpm typecheck` / `pnpm lint` / `pnpm build` all clean; the full
`pnpm test:e2e` suite (F0–F5, 25 specs) run together confirms zero regression in F1–F4's own
already-Done surfaces from the shared-component extraction (`decision-log-row.tsx`/
`risk-log-row.tsx`) or the backend schema/endpoint addition — all 19 of those pass clean under the
6-way parallel run. `e2e/ask.spec.ts` itself is real-LLM-heavy in a way no earlier spec is (every
one of its 6 tests makes at least one live call to the same local Ollama instance for
`classify_intent`/answer generation/embeddings), and one of its tests missed its own 100s budget
under that 6-way parallel run specifically (aborting the rest of its `describe.serial` block as a
result) — the same "flaky only under N-way parallel contention, not a real regression" mode F4's own
notes already documented for `foresight.spec.ts`, not a new problem. Confirmed, not just assumed:
`e2e/ask.spec.ts` run alone (`--workers=1`) passed all 6 specs cleanly three separate times across
this session, including immediately after the full-suite run that saw the one contended failure.

## Updating this file

When a milestone completes:
1. Flip its Status cell to `Done`, with the commit/date.
2. Note anything the next milestone's prompt should know that wasn't true when it was written (a
   design decision made mid-implementation, a scope adjustment, a discovered blocker) — own
   subsection below, same shape `backend/PROGRESS.md` uses per milestone.
3. Run the frontend's full check (typecheck + lint + unit tests + the Playwright suite against a
   real running `backend/` per `docker-compose.yml`, not a mocked API — see F0's own testing
   philosophy note) and confirm it's green before flipping the status.
