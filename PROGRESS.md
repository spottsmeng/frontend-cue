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
| F6 | Vendor Reliability Graph | `Prompt F6 — Vendor Reliability Graph.txt` | FR-VRG | F0 | Done (2026-08-10) |
| F7 | Admin console | `Prompt F7 — Admin console.txt` | §6.14 FR-ADM; channel/consent/retention | F0 | Done (2026-08-11) |
| F8 | Analytics dashboard | `Prompt F8 — Analytics dashboard.txt` | §13 | F0, and partially F1/F3/F6 for data sources | Done (2026-08-11) |
| F9 | Hardening — accessibility, localisation, perf | `Prompt F9 — Hardening, accessibility and localisation.txt` | §7.6 NFR-ACC; §7.1 NFR-PRF (web-applicable subset) | all of the above | Done (2026-08-11) |

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
its own budget, even after widening every answer-wait to 220s. Direct instrumentation (temporary
timing logs in `app/ask/answer.py`, since reverted) plus a direct local measurement — `ollama ps`
confirmed `qwen2.5:14b` running `100% GPU` on this machine, and forcing genuine CPU-only inference
(`num_gpu: 0`) only added ~5s to an otherwise-identical call — showed that raw compute speed alone
didn't explain a request that never returned even once, twice.

**The actual correction, not another timeout tune: real Ollama should never have been running in CI
at all.** This project's own dev strategy (CLAUDE.md's Models table) scopes real Ollama models to
the developer's own local machine only — dev, test, demo — switching to a frontier model for
production once the app is solid, specifically to control cost. A GitHub Actions runner is neither
of those places; installing and pulling models there (first for F1's write-back spec before this
session, extended much further by this session for Ask) was a boundary violation no amount of
GPU/timeout budgeting was the right fix for. The real fix: `FakeClient`/`FakeEmbeddingClient`
(backend's `app/llm/client.py` / `app/ask/embeddings.py` — see `backend/PROGRESS.md`'s own
"Architecture correction" entry for the full writeup) — a third, CI-only provider
(`CUE_LLM_EXTRACTION_PROVIDER=fake`, `CUE_LLM_REASONING_PROVIDER=fake`, `CUE_EMBED_PROVIDER=fake`)
alongside `ollama`/`anthropic`/`tei`. `.github/workflows/ci.yml`'s `e2e` job no longer installs,
pulls, or talks to Ollama at all — every "Install Ollama"/"Pull ..."/"Warm up" step is gone, along
with the `CUE_LLM_REASONING_MODEL` override they existed to support. `e2e/ask.spec.ts`'s own
generous timeouts (`test.setTimeout(240_000)`, `timeout: 220_000` on every answer-wait) are gone
too — a fake response is instant, so every wait is back to Playwright's own untouched default.

One real UI bug the fake surfaced that a real model's own judgment had been quietly papering over:
a *fake* embedding client (needed so `DocumentVersion.embedding`/`RetrievalChunk` inserts still
succeed) always returns *some* "closest" vector regardless of true relevance — the same way real
cosine-distance ranking would for a genuinely unrelated question — so "retrieval found a hit" can no
longer stand in for "the excerpts actually answer this." `FakeClient`'s answer-generation branch
makes an honest word-overlap judgment between the question and each excerpt instead of an
unconditional "yes, cite everything" (backend/PROGRESS.md has the full before/after) — without that
correction, `no_citable_source` would have silently stopped being reachable in CI at all.

**Testing**: `pnpm test` (Vitest, 74 passing across 19 files, up from 64) —
`lib/ask/citation-routing.test.ts` (this milestone's own TESTING EXPECTATION: all six
`CitationSourceType` values, including the two `unavailable` ones) and
`components/ask/refusal-message.test.tsx` (the two refusal kinds render distinctly, never the same
generic shell — this milestone's own other named TESTING EXPECTATION). `pnpm test:e2e`
(`e2e/ask.spec.ts`, `test.describe.serial`, 6 specs, real backend/Postgres, fake LLM/embedding
client) covers, against the real backend: a document-grounded question producing a real cited
answer whose citation opens the real document (resolved via this session's own
`GET .../documents/versions/{version_id}` addition); a question with no supporting evidence
producing the honest `no_citable_source` refusal; an action-shaped question ("please chase the
vendor...", FR-ASK-06's own example) producing `action_not_yet_supported`, asserted visibly distinct
from the no-evidence refusal; a follow-up reusing the first answer's real `conversation_id` (asserted
at the network-request level, not inferred from UI text) and "New conversation" genuinely dropping
it afterward; each of the five summary variants rendering against the real seeded project; and a
full Successor Brief covering every named section with real content. `pnpm typecheck` / `pnpm lint`
/ `pnpm build` all clean; the full `pnpm test:e2e` suite (F0–F5, 25 specs) confirms zero regression
in F1–F4's own already-Done surfaces. Verified at CI's own real concurrency, not just locally:
`--workers=2` (matching a 2-vCPU runner) passes all 25 specs in well under a minute, every Ask spec
resolving in under a second — down from a 17+ minute run and a real, reproducible failure with
Ollama in the loop. (Local `--workers=6`, this machine's own full core count, shows occasional
unrelated dev-login flakiness under that much heavier concurrency than CI itself ever produces —
not investigated further since it doesn't reflect CI's real load and isn't specific to this
milestone's own surface.)

## F6 notes (2026-08-10)

**Route-naming decision, per the prompt's own instruction to document it**: `/vendors` (not
`/parties`) — matches `components/app-shell/top-nav.tsx`'s pre-existing `ORG_LINKS` entry (F0 already
named it "Vendors" in the nav, even though F6 hadn't been built yet), and reads better to the
Finance/Procurement persona than the backend's own internal `Party` naming. Detail is a nested
dynamic route, `/vendors/[partyId]`, the same "a real URL per item is worth having for direct
linking" call F4 already made for `/documents/[documentId]` over a client-side drawer — the
organisation-mapping panel's own "view vendor" links (below) depend on it. Both routes are `"use
client"` thin wrappers delegating to `VendorsView`/`VendorDetailView`, same F1–F5 shape.

**Two real backend gaps found and closed on the spot, not worked around** (this milestone's own
gap-audit check, frontend/CLAUDE.md's Class A/B checklist — see backend/PROGRESS.md's "round 6" for
the full write-up):
- **`GET /parties/{party_id}`** didn't exist — only the org-wide list and the reliability/
  organisation sub-resources did. A vendor detail page has nothing else to build a header from, and
  specifically needs `type` to decide whether the organisation-mapping section applies at all
  (person-only, FR-NRM-04). `lib/vendors/hooks.ts`'s `useVendorQuery` backs it.
- **`ProjectOut.archetype_code`** was never surfaced by any response schema, even though the column
  exists and its own docstring names it as FR-VRG-02's segmentation axis outright. Without it, the
  segment picker's `event_archetype` field had no real values to offer at all.

**A third gap found, deliberately left open, not closed — `GET /parties/{id}/organisation` is
`require_org_administrator`-gated, not `require_org_finance` like every other read this surface
makes.** Confirmed by reading `app/api/parties.py`'s `organisation_router` directly, not assumed
from the prompt's own "read-only this session" framing, which doesn't mention the gate at all. A
Finance/Producer-only user (the tier that gates the rest of this entire page) will get a real 403 on
the "Represents" section specifically, even though they can see every vendor's reliability metrics
fine. This is a genuine, live access-tier mismatch, not a bug this session introduced — and not one
this session should silently paper over by loosening a backend access decision it didn't make (F7's
Admin console, which owns FR-NRM-04's write side too, is the natural place to reconsider whether
that gate is right). `lib/vendors/hooks.ts`'s `VendorOrganisationPermissionError` and
`components/vendors/organisation-mapping-panel.tsx` render it as an explainable permission message
naming the exact gate mismatch, same `ForesightPermissionError`/`ThresholdConfigPanel` posture F3
already established for its own org-admin-only surface.

**`event_archetype`'s segment-picker options are derived, not fabricated — and honestly incomplete
by construction.** Unlike `vendor_category` (a real `ontology_terms` vocabulary, discoverable via
the same `GET .../ontology-terms?category=X` pattern every prior milestone's hook already uses),
`Project.archetype_code` is free text with no vocabulary table and no per-vendor "which archetypes
does this vendor actually have data under" query either. `lib/vendors/hooks.ts`'s
`distinctArchetypeCodes` offers every distinct archetype code in use across the org's own projects
(via `GET /projects`, the gap closed above) — real values that exist, never invented, but not
narrowed to values *this specific vendor* has commitments under (no endpoint answers that). `city`
has no discovery endpoint at all (`Party.city` is plain free text) and is a real text input, not a
select dressed up as one.

**Party-organisation mapping only renders for `type: "person"` parties.** `GET .../organisation`
doesn't error for a `vendor_org`/`internal_staff` id — it just returns an honestly empty history,
which would be a confusing, meaningless-looking empty section on a party this mapping was never
about (FR-NRM-04 is person -> vendor-company). `VendorDetailView` checks `party.type` before
rendering the section at all, rather than showing empty state for every party type.

**Nav visibility computed server-side by fanning out to F1's own `/members/me`, not a new org-wide
"my roles" endpoint.** `require_org_finance` answers "does this user hold finance/producer on *any*
project in the org" — genuinely org-wide, which no single project's `/members/me` call can answer
alone, and there's no dedicated org-wide roles endpoint (closing one would be a new backend surface
built purely for a nav-hiding nicety F0's own docstring already says isn't a security boundary — not
worth it at this app's project counts, CUE-Tech-Stack.md §4's own "don't distribute early" scale
reasoning applied to request fan-out instead of a new endpoint). `app/(shell)/layout.tsx` now calls
`GET /projects/{id}/members/me` once per project the user can already see (via `Promise.all`,
already-fetched project list, F1's own endpoint) and shows the "Vendors" link if any grants
finance/producer. Deliberately **not** importing `lib/roles.ts`'s own `FINANCE_ROLES`/`hasAnyRole`
into this Server Component — that file also exports client-hook-housing code
(`useEffectiveRoles`, built on `lib/api/browser.ts`'s `"use client"` `useApiClient`), so
`app/(shell)/layout.tsx` keeps its own tiny, independent copy of the constant instead, same "second,
independent copy, never itself a security boundary" posture `lib/roles.ts`'s own comment already
states for its three exported role-set constants. The real gate is still the backend's 403
(`VendorPermissionError` in `lib/vendors/hooks.ts`, rendered as an explainable message by
`VendorList`/`VendorMetricsPanel`), never the nav check alone.

**History trend is a dependency-free inline SVG polyline, not a charting library** —
`components/vendors/metric-history-chart.tsx`'s `Sparkline`. Same "tens of nodes... twenty lines of
code, not a library" reasoning CUE-Tech-Stack.md §4 already gave Twin's own timeline over a
graph-visualisation dependency, applied here to a five-point metric trend. Plotted only over
snapshots with a real `value` (`available: true`) — an unavailable snapshot has no y-coordinate to
honestly place and is never interpolated; the full snapshot list (value or `unavailable_reason`,
whichever is real) always renders underneath the chart regardless, so the exact numbers never live
only in the SVG.

**Absent vs. unavailable, rendered distinctly per the prompt's own instruction** —
`components/vendors/vendor-metric-row.tsx`. `VendorMetricsPanel` iterates the five canonical
`VendorMetricNameLiteral` values (`components/vendors/metric-meta.ts`'s `METRIC_NAMES`, mirroring
`app/parties/service.py`'s own `_METRIC_FUNCS` order) and looks each one up in the fetched
`metrics` list by name: missing entirely -> "Not yet computed," no reason shown (there is nothing to
explain); present with `available=false` -> "Not available" plus the real `unavailable_reason`,
never a fabricated value. Each metric formats its own value with its own unit
(`formatMetricValue`) — `on_time_rate`/`revision_churn` are fractions needing `*100`,
`price_drift_pct` is already a percentage (`compute_price_drift`'s own `* 100.0`), formatting both
the same way would silently mis-scale one of them.

**Dev-seed extension** (`backend/scripts/seed_dev_data.py`): the existing vendor ("Golden Sound &
Light Pte Ltd") gets a real `vendor_category_term_id` (`av_led`, a real seeded ontology term, not
invented) and `city`; a second vendor ("Nimbus Event Staffing Pte Ltd," `staffing`/Kuala Lumpur) for
the directory's own filter controls to have something real to narrow down; a person-type contact
("Amanda Lim") mapped to the first vendor via a real `set_current_organisation` call, for the
organisation-mapping panel; and two more real commitments (one delivered on time, one delivered
late) with their own Evidence/AuditLog rows, so `median_response_time_days` and `on_time_rate` both
compute genuinely `available` values — `revision_churn`/`price_drift_pct` stay honestly unavailable
no matter what this script adds, structurally blocked on `Commitment.supersedes` (FR-LED-05) per
`app/parties/compute.py`'s own module docstring. `recompute_vendor_metrics` is called twice, with a
real intermediate `session.commit()` between them (not deferred to the script's single trailing
commit like everything else) specifically so the two snapshots land in separate Postgres
transactions and get genuinely distinct `computed_at` values — `VendorMetric.computed_at` is
`server_default=func.now()`, fixed for the lifetime of one transaction, so two recomputes inside the
same uncommitted transaction would otherwise tie on the history endpoint's own sort key. Verified
against the real running backend before writing any frontend code against it (`curl`, not assumed):
`median_response_time_days` 5.0 -> 6.0, `on_time_rate` 1.0 -> 0.5, `deviation_frequency` 0.333 ->
0.25, `revision_churn`/`price_drift_pct` unavailable both times, two distinct `computed_at`
timestamps ~230ms apart.

**Testing**: `pnpm test` (Vitest) — `components/vendors/vendor-metric-row.test.tsx` covers this
milestone's own named TESTING EXPECTATION (the absent-vs-unavailable split) plus the per-metric
value-formatting split, against hand-built `VendorMetricOut` fixtures. `pnpm test:e2e`
(`e2e/vendors.spec.ts`, `test.describe.serial`, 4 specs, real backend) covers, against the real
seeded data above: a Finance-role user seeing the Vendors nav entry and the real directory; a
project_manager-only user with the nav entry hidden *and* a real 403 on direct navigation to
`/vendors` (not just the hidden link); a vendor's current metrics showing one genuinely available
metric (`on_time_rate`, 50%) alongside both FR-LED-05-blocked ones with their real
`unavailable_reason` text visible; and the history view showing two real snapshots for the same
metric. `pnpm typecheck` / `pnpm lint` / `pnpm build` all clean. Full `pnpm test:e2e` suite (F0–F6,
29 specs) run together, `CUE_LLM_*_PROVIDER=fake`/`CUE_EMBED_PROVIDER=fake` set on the backend
(matching CI — see backend/PROGRESS.md's "round 6" for why a plain local restart without these
briefly broke two *unrelated* F1/F5 specs, root-caused and fixed, not a regression from this
milestone's own changes): 28/29 pass. The one remaining failure
(`ask.spec.ts`'s five-summary-variants spec) is pre-existing, reproduces identically on a checkout
without this session's changes, and is outside F6's own surface (Ask/decision-log content,
untouched by anything in this round) — left exactly as found and documented in backend/PROGRESS.md's
"round 6" rather than chased inside this milestone.

## Post-F6: commitment supersession review + organisation-mapping gate fix (2026-08-10)

Two real gaps F6's own notes named but didn't close, fixed on direct request rather than left
documented — see backend/PROGRESS.md's own "FR-LED-05" and "round 6" entries for the full backend-side
writeup; this section covers the UI half.

**FR-LED-05: `revision_churn`/`price_drift_pct` no longer permanently `available=False`.** A new
"Commitment revisions" section on Living WIP (`components/living-wip/supersession-review-panel.tsx`,
placed right after Vendor status, before Budget summary — a price revision is exactly the kind of
thing that precedes and explains a budget figure) lists every AI-proposed candidate
(`app/ledger/supersession.py`'s own propose/confirm/reject lifecycle) grouped "Needs review" /
"Recently reviewed", each `SupersessionCandidateRow` resolving both commitments via the same
`useCommitmentQuery` the detail drawer already uses (the API only ever returns plain ids —
`CommitmentSupersessionCandidateOut`'s own docstring: "resolve against an already-fetched list
client-side," this codebase's own established discipline, not a new one invented here) and offering
real Confirm/Reject actions, `WRITE_ROLES`-gated.

**A real UX bug this session's own e2e test caught before it shipped**: the panel originally queried
only `status=pending`, so confirming a candidate immediately dropped it out of the refetched list —
the row a reviewer just acted on silently vanished instead of showing the real "Confirmed" outcome,
indistinguishable from the click not having registered at all. Fixed by fetching every status and
grouping client-side (same two-group shape `ThresholdConfigPanel`'s own "organisation-wide" / "this
project's overrides" split already established) — `SupersessionCandidateRow`'s own confirmed/rejected
rendering, already built, was simply never being reached before this fix.

**`GET /parties/{id}/organisation`'s gate mismatch, closed, not just documented.** F6's own notes
named this precisely: a Finance/Producer viewer of a vendor's detail page would 403 specifically on
the "Represents" section (`require_org_administrator`-only), even though every other section on that
page is `require_org_finance`-gated. Backend now accepts Finance/Producer *or* administrator on the
two reads (`require_org_finance_or_administrator`, app/api/deps.py); the write stays admin-only.
`components/vendors/organisation-mapping-panel.tsx`'s own copy updated to match — the permission
message is now a real (if rarer) edge case rather than the expected common case for every plain
Finance user, and says so.

**Testing**: `pnpm test` — `components/living-wip/supersession-candidate-row.test.tsx` (5 new: real
formatted amounts either side of the revision, an honest "not specified" for a null amount rather
than a fabricated $0, confirm/reject visible only for a write-role viewer on a still-pending
candidate, hidden for a read-only viewer, and hidden again — replaced by the real outcome — once
already confirmed). `pnpm test:e2e` (`e2e/supersession.spec.ts`, `test.describe.serial`, 2 specs)
covers, against the real backend, real Ollama locally / `FakeClient`'s own new branch in CI: a real
pending candidate visible in Living WIP with its real model-generated reasoning and real amounts: and
confirming it — a real click, not a seeded state — making `revision_churn`/`price_drift_pct` genuinely
`available` on the Vendor Reliability Graph afterward, read back from the real API, not asserted on
the confirm response alone. Deliberately targets a *different* seeded vendor ("Nimbus Event Staffing
Pte Ltd") than `e2e/vendors.spec.ts`'s own subject ("Golden Sound & Light Pte Ltd") — a real
cross-spec-file interaction this session's own verification run caught (both files share one seeded
org for a whole Playwright invocation; confirming a candidate on the vendor the other suite asserts
stays permanently unavailable would make that independently-correct assertion false depending on run
order) — see backend/PROGRESS.md's own notes for the two real seed-script bugs this same run caught
(a same-transaction `created_at` tie, and a stray `pending_verification` state that broke
`e2e/living-wip.spec.ts`'s own unrelated, already-established assertion). Full `pnpm test:e2e` suite
(F0–F6 plus this addition, 31 specs) run twice — once against real local Ollama, once with
`CUE_LLM_*_PROVIDER=fake` matching CI exactly — both green except one pre-existing, unrelated F5
(Ask) failure already documented before this work started. `pnpm typecheck`/`pnpm lint`/`pnpm build`
all clean throughout.

## F7 notes (2026-08-11)

**Route/composition decision**: several distinct screens under one admin shell, not one monolithic
page, per this prompt's own top-of-file instruction. `/admin` (`AdminSubnav`: Overview / Users /
Delegations / Retention / Channel identities — genuinely global, no project needed) and
`/admin/projects/[projectId]` (`AdminProjectSubnav`: Members & Delegations / Channels / Consent /
Budget / Settings / Export — one project at a time, root segment is Members & Delegations, same
"root = the first/primary screen" convention `project-subnav.tsx` already established). Both
subnavs are plain client components mirroring `components/app-shell/project-subnav.tsx`'s own shape
exactly; the per-project layout re-uses `Depends(get_project)`'s plain membership tier (not
`require_org_administrator`) just to resolve the project's own name for the header, the same
"real, if lighter, access check" `app/(shell)/projects/[projectId]/layout.tsx` already does — every
actual admin action underneath still independently enforces `require_org_administrator` server-side
regardless.

**Nav visibility wired the same fan-out way F6 wired Vendors**: `app/(shell)/layout.tsx` now also
checks `ADMIN_ROLES = ["administrator"]` against the same per-project `GET .../members/me` calls it
already fans out for `FINANCE_ROLES`, and `TopNav` takes a second `canSeeAdmin` boolean. Same
"UX nicety, not a security boundary" posture — the real gate is each `/admin/*` endpoint's own 403.

**Gap-audit findings, three real backend gaps found and closed on the spot** (this session's own
required check, `frontend/CLAUDE.md`'s Class A/B checklist) — see `backend/PROGRESS.md`'s "round 7"
for the full backend-side writeup:
- **`GET /projects/{project_id}/budget/history`** — `GET .../budget` only ever returned the current
  row; `BudgetOut.revision_of` was a real Class A id-with-no-resolver otherwise. Closed so the
  Budget screen can show a baseline alongside the revision that superseded it, most recent first —
  this milestone's own TESTING EXPECTATION names this exact scenario.
- **`GET /parties` / `GET /parties/{party_id}` widened from `require_org_finance` to
  `require_org_finance_or_administrator`** — a Class B gap (a form needs to pick an entity, but no
  endpoint exists at the picking role's own access tier): FR-NRM-03's channel-identity override
  screen and FR-NRM-04's organisation-mapping write control are both administrator-only actions that
  still need a real party picker, and the only party directory was finance/producer-gated. The
  mirror image of F6's own round 6 fix (there an administrator-only gate was stricter than the
  finance-gated page around it; here a finance-only gate was stricter than the administrator-only
  actions needing it) — same `require_org_finance_or_administrator` dependency reused, not a new one
  invented.
- **`GET /admin/projects`** — `GET /admin/delegations`/`GET /admin/roles` can both return rows whose
  `project_id` refers to a project the calling Administrator was never a member of
  (`require_org_administrator`'s own documented "not just ones they happen to be a member of"
  scope), but the only project listing before this, `GET /projects`, is FR-ADM-02's own
  membership-filtered view — a real Class A gap on the org-wide Delegations screen specifically.
  Closed; `AdminOverviewView`'s own project picker uses this too, so it's genuinely org-wide rather
  than membership-filtered like every other surface's project list.

**Judgment call, explicitly checked before building, per this prompt's own instruction**: no
archetype or vertical picker on the provisioning form. Confirmed by reading
`app/twin/models.py`'s `MilestoneArchetype` docstring and
`alembic/versions/9b2f8bc21d89_seed_default_event_production_archetype.py` directly — `organisation_id`
is empty at v1 ("no tenant-authored archetype UI exists," the model's own words) and exactly one
archetype (`event-production-default`) and one vertical (`event-production`) are seeded in the whole
system, with no `GET /verticals` or archetype-listing endpoint at all. A picker would only ever offer
one option, so both fields are simply omitted from `POST /projects`'s body — the backend resolves
each to its sole real default. Not a backend gap to close (widening it would mean building a v1
tenant-archetype-authoring UI nobody asked for, the exact over-build `CUE-PRD.md §4.2.1`'s "mechanism
exists, not a v1 feature commitment" posture already warns against).

**A real frontend bug this session's own e2e run caught**: `useReviseBudgetMutation`
(`lib/budget/hooks.ts`, added back in F1 for the Living WIP report's budget-summary section) never
invalidated the current-budget query — F1's own report query has `staleTime: 0` and happened to
refetch anyway, masking this for its own surface, but this milestone's new `ProjectBudgetView`
(`useBudgetQuery`) has no such forced refetch, so a revision's own "Current baseline" line stayed
stale at the pre-revision amount after a real, successful `POST .../budget/revise` (confirmed 201 via
`page.waitForResponse` before concluding it was a frontend bug, not a backend one). Fixed by adding
the missing `invalidateQueries` call.

**A real, load-bearing cross-spec-file interaction found and fixed, not just documented** — the
exact category `backend/PROGRESS.md`'s "round 6" notes already flag as worth verifying directly
rather than assuming. `e2e/admin.spec.ts`'s own provisioning test is the *first* session in this
plan to create a real second `Project` via the UI; every other e2e spec's `login()` helper
(`login.spec.ts`, `twin.spec.ts`, `foresight.spec.ts`, `documents.spec.ts`, `ask.spec.ts`,
`supersession.spec.ts`, `vendors.spec.ts`, `living-wip.spec.ts`) assumed `scripts/seed_dev_data.py`'s
"exactly one project per organisation" holds for the whole Playwright invocation, since
`app/(shell)/page.tsx` only auto-redirects `"/"` to a project when `list.length === 1`. Confirmed
broken by actually running `e2e/admin.spec.ts` alongside each of them (not assumed) — `login.spec.ts`
failed outright, and every helper that does `page.goto(page.url() + "/twin")`-style relative
navigation right after login would have silently built a malformed URL against the multi-project
picker instead. Fixed at the root: every affected `login()`/`beforeEach()` now waits for navigation
to settle (`waitForLoadState("networkidle")`, needed because Next's server-side redirect can commit
an intermediate `"/"` URL Playwright observes before the client finishes navigating away from it —
found by first shipping a version without it and watching a real, reproducible timeout) and, if still
on the picker, clicks the seeded project by its own known name ("CUE Dev Project") rather than
assuming the redirect. `login.spec.ts`'s own assertion updated to match — it still proves the same
auth chain works end to end, just no longer coupled to which of the two real cases fires. Re-run
together (`e2e/admin.spec.ts` + `login.spec.ts` + `twin.spec.ts` + `living-wip.spec.ts` +
`supersession.spec.ts` + `vendors.spec.ts`, 20 specs) confirms no regression; `ask.spec.ts` and
`foresight.spec.ts` weren't re-run this session (see below).

**Cross-milestone notes, as this prompt's own TESTING EXPECTATION asks**:
- **Payment-status control**: already on F1's own commitment detail view (`commitment-detail-panel.tsx`'s
  `usePaymentStatusMutation`), confirmed by reading the code directly — nothing to add here, per this
  prompt's own EXPLICITLY OUT OF SCOPE note.
- **Party-organisation mapping's write control**: added to F6's `organisation-mapping-panel.tsx`
  (`components/vendors/`), not a new screen — `lib/vendors/hooks.ts`'s new `useSetOrganisationMutation`
  (`POST /parties/{id}/organisation`, `require_org_administrator`-only, a genuinely stricter gate
  than the read the rest of that panel already uses, so a Finance-role viewer sees the history but a
  real, explainable 403 on the form specifically — `VendorOrganisationWritePermissionError`).
- **Quiet hours / foresight thresholds**: deliberately *not* duplicated here — F3's own notes already
  named this "Foresight-specific configuration... F7 should link to these two screens when it exists,
  not duplicate them." No link was added this session (F3's Foresight page is reachable from its own
  project's subnav already); worth revisiting only if a later session finds real user confusion about
  where these live.
- **Report schedule config**: F1's own EXPLICITLY OUT OF SCOPE named this console's job, and it was
  still undone — built here (`lib/reports/hooks.ts`'s new schedule hooks, `ProjectSettingsView`),
  alongside write-back's daily ceiling on the same screen per this prompt's own instruction not to
  split "project-provisioning-adjacent settings" into unrelated standalone screens.

**Provisioning flow, FR-ADM-06's own "under 10 minutes" bar**: not literally stopwatched by a human
this session (no hands to click with) — what's confirmed instead, and recorded honestly as such, is
the *shape* the bar depends on: one page, one form, ~6 fields plus an inline team-access sub-form,
ending in a single `POST /projects` (`ProjectCreate.members` grants initial access in the same
request per `app/api/projects.py`'s own docstring) — never a second "now add people" request. The
automated `e2e/admin.spec.ts` run completes the whole flow (fill name, add two team-access rows,
submit, land on the new project's Members screen showing all three grants) in ~1.3s end to end,
which is not itself the FR-ADM-06 measurement but is consistent with there being no structural
reason a human walkthrough would approach 10 minutes.

**Testing**: `pnpm test` (Vitest, 92 passing across 21 files, up from 19 files pre-session, the 2 new
ones below) — `components/admin/delegation-row.test.tsx` (this milestone's
own named TESTING EXPECTATION: "the delegation expiry/scope display" — active/expired/revoked
states, each resolved to real names, never a raw uuid) and
`components/admin/retention-policy-view.test.tsx` (this milestone's own named TESTING EXPECTATION:
"the retention-policy narrowing/broadening table rendering" — an organisation-wide NULL/NULL default
rendered distinctly from a narrower region-scoped override, a vertical-scoped policy's own real
vertical resolved never as a raw id, the explainable permission message, and the honest empty state).
`pnpm test:e2e` (`e2e/admin.spec.ts`, `test.describe.serial`, 6 specs) covers, against the real
backend: the full provisioning flow (project + two initial team-access grants in one submit); attach
→ an honest empty health history → a real degraded report (simulated out-of-band via this session's
own bearer token, `foresight.spec.ts`'s own precedent, since no capture-agent identity exists to call
that endpoint as) → reconnect; a consent action-request round-tripping to a real current status,
read back after a reload; a budget baseline creation then revision showing both in the resulting
history (the real frontend bug above, caught and fixed by this very test); both export formats
producing a real, non-empty downloaded file (`page.waitForEvent("download")`, file size asserted
`> 0`); and a retention-policy override narrowing behaviour, read back after a reload. `pnpm
typecheck` / `pnpm lint` / `pnpm build` all clean. `uv run pytest` (backend): 549 passing (up from
546 pre-session).

**Not re-run this session, not assumed clean**: `e2e/ask.spec.ts` and `e2e/foresight.spec.ts` (the
latter's own `login()` was patched the same way as every other affected file, but not re-verified
live) — both are slower, LLM-adjacent specs this session's own time budget didn't cover a fresh run
of after the shared `login()` fix. Everything else in the suite that was re-run together with
`e2e/admin.spec.ts` (`login`, `twin`, `living-wip`, `supersession`, `vendors` — 20 specs total) is
confirmed green; `living-wip.spec.ts`'s own second spec (write-back draft compose) hit a real, timing
-only failure against a locally-running backend with no `CUE_LLM_*_PROVIDER=fake` set — the exact
pre-existing, documented flakiness class `backend/PROGRESS.md`'s "round 6" notes already describe
("Setting the three `*_PROVIDER=fake` env vars... fixed `living-wip.spec.ts` fully"), reproduces
identically without any change this session made, and is a CI-parity/local-env concern, not an F7
regression.

## F8 notes (2026-08-11)

**Charting architecture decision, made explicit rather than left implicit**: this session
introduces **visx** (`@visx/group`, `@visx/shape`, `@visx/scale`, `@visx/axis`, `@visx/grid`,
`@visx/responsive`, `@visx/tooltip`, `@visx/event`, each installed individually, never the
`@visx/visx` meta-package) for genuinely multi-series charts — a real reversal of the
dependency-free-SVG stance F2's Twin timeline and F6's `metric-history-chart.tsx` sparkline both
took, citing `CUE-Tech-Stack.md §4`'s "twenty lines of code, not a library." That reasoning still
holds for what it was applied to (a five-point single-series sparkline, a chronological node list)
and neither is retrofitted here — both stay exactly as they were, small and already tested. What
changed is the shape of F8's own data: verification burden and reply rate are genuinely
multi-series (one line per project, PRD §13's own "per project" framing), which is precisely the
case the dependency-free approach doesn't scale to gracefully. `frontend/DESIGN.md`'s new
"Charting" section states this split as a standing rule (hand-rolled SVG for small-N single-series,
visx for multi-series/dashboard-grade) so a future session doesn't have to infer it from two
contradicting code comments, and a new `components/charts/` layer (`themed-line-chart.tsx`,
`chart-legend.tsx`, `chart-colors.ts`, `not-yet-measurable.tsx`) is built once here for every future
chart to reuse rather than each session re-solving visx-to-token theming from scratch.

**New categorical chart palette**: five tokens (`chart-1`…`chart-5`), added through all three
`app/globals.css` layers and `DESIGN.md`'s own tables in this same change, validated with the
`dataviz` skill's `validate_palette.js` against this project's own surfaces (`#FFFFFF` light /
`#12151B` dark), `--pairs adjacent` (the correct test for a line chart, per the skill's own
guidance — lines are compared as legend-order neighbours, not scattered marks). Worst adjacent CVD
ΔE 7.2 light / 6.9 dark (the 6–8 floor band, legal only with secondary encoding — every chart on
this dashboard ships a legend plus an exact-numbers table unconditionally, so the mitigation is
real, not aspirational) and worst adjacent normal-vision ΔE 22.9 light / 19.8 dark, both clear of
the 15 floor. Five slots, not the skill's own eight-hue default — three slots (orange/aqua/yellow)
were free of the existing brand triad and status quad entirely; the other two (green/red) share a
hue family with `good`/`critical` but validate as distinct steps for a genuinely different axis
(project identity, never rendered beside a status chip). Capped at five deliberately: this
project's realistic project counts (its own dev-seed data runs 1–2 projects) are well inside that,
and pushing further risks the normal-vision floor the same way the skill's own reference palette's
fourth slot does.

**Route decision**: `/analytics` (`app/(shell)/analytics/page.tsx`), not `/admin/analytics` — this
was already decided before this session started, not this session's own call. `TopNav`'s
`ORG_LINKS` already listed `/analytics` as a top-level, org-scoped entry alongside `/admin` and
`/vendors` (with its own comment: *"Analytics isn't gated the same way yet — F8's own job"*), and
the stub page already existed at that path. `AnalyticsPage` is a thin client wrapper matching
`app/(shell)/vendors/page.tsx`'s own shape (not a Server Component fetching `GET /projects`, the
original plan's assumption) — `AnalyticsView` fetches its own project list client-side via
`useAnalyticsProjectsQuery`, avoiding a second, redundant server-side fetch of the same list
`app/(shell)/layout.tsx` already does for the nav.

**Gating decision**: per-panel, not whole-page. `GET /admin/cost-summary` is
`require_org_administrator`-gated; `GET .../commitments` and `GET .../writeback` are any-project-
member-gated — genuinely different access tiers on the same page. `top-nav.tsx`'s `/analytics` link
stays unconditional (any authenticated user with ≥1 project sees the verification-burden/reply-rate
panels for their own projects); the cost panel independently renders a named, explainable message
on 403 (`CostSummaryPermissionError`, mirroring `lib/vendors/hooks.ts`'s `VendorPermissionError`
pattern exactly) rather than gating the whole route. No changes were needed to
`app/(shell)/layout.tsx` or `top-nav.tsx` — both already had the right shape waiting.

**Gap-audit (frontend/CLAUDE.md's standing checklist)**: `CostSummaryRow.project_id` is a raw uuid
on the wire with no embedded label — a real Class A gap. Resolved without a new endpoint: the same
`GET /projects` fetch every panel already needs gives an id→name map (`projectNameMap`,
`lib/analytics/hooks.ts`) to join against it. No Class B concerns — this dashboard is entirely
read-only, no entity-picker forms.

**§13 metrics: which ended up real vs. honestly-blocked, and why.**

Real, live data (3):
- **Verification burden** — `bucketVerificationBurdenByWeek` (`lib/analytics/aggregate.ts`, unit-
  tested), fed by a fan-out of `GET .../commitments` across every project the caller can see
  (`useAnalyticsCommitmentsQuery`). Counts commitments whose `verification_state !== "auto"`,
  bucketed by the ISO week (Monday-start, UTC) of `created_at` — an arrival count, not a live
  queue-depth snapshot; documented as such in the aggregate function's own comment.
- **Write-back reply rate** — `computeWritebackReplyRate`, same fan-out shape over
  `GET .../writeback`. Per project per week: `sent` = messages with `status === "sent"`, `replied`
  = of those, `reply_outcome !== null` (both `"transitioned"` and `"escalated"` count as a real
  reply — only a still-open thread doesn't). A week with zero sent messages has no row at all,
  never a fabricated 0%.
- **Cost per active project** — a direct render of `GET /admin/cost-summary`'s already-real rows
  (this session builds nothing new backend-side, per the prompt's own instruction). `null` vs. real
  `0.0` kept visually distinct throughout (`"unknown"` vs. `"$0.00"`), per `CostSummaryRow`'s own
  docstring.

Honestly blocked, each with its own named reason on the dashboard itself
(`components/analytics/unmeasurable-metrics-panel.tsx`), not a blank space or a silent omission (7):
coordination overhead and status meeting duration (no product-usage telemetry pipeline or calendar
integration exists anywhere in this codebase yet), report preparation time (only the export half of
"WIP opened → exported" is timestamped today), active chats per PM per day (same telemetry gap),
contingency drawn (`Budget` has no contingency-vs-base split in the schema — flagged here as a real
open decision for Finance or a future backend session, the same way this prompt's own text asks it
to be, not resolved unilaterally), commitment capture rate (no real ground-truth corpus exists —
Phase 0 discovery hasn't run for any live project), and extraction accuracy by slice (decided to
leave this **absent** rather than wire a live endpoint that shells out to `cue-eval/run_eval.py
--json` on demand — the prompt's own text names that as a design smell, "re-running eval from a
dashboard request," and no persisted drift-check table exists yet for a cheap read instead; flagged
here as a decision for a future backend session, same shape as the `contingency` flag above).

**Testing**: `pnpm test` (Vitest, 105 passing across 22 files, up from 92/21 pre-session) —
`lib/analytics/aggregate.test.ts` (this milestone's own named TESTING EXPECTATION: "the aggregation
math — verification-burden weekly bucketing, reply-rate calculation — against fixed input sets with
known correct output"), covering ISO-week boundary rollover (a Sunday-vs-Monday timestamp landing in
different buckets, a week crossing a month boundary), `verification_state === "auto"` correctly
excluded, escalated replies counted the same as transitioned ones, drafts/authorised-but-unsent
messages excluded from the reply-rate denominator entirely, and no fabricated zero-rows for weeks
with no traffic. `pnpm typecheck` / `pnpm lint` / `pnpm build` all clean — the production build was
inspected directly for the five new `chart-*` Tailwind utilities (`stroke-chart-1`…`5`,
`fill-chart-1`…`5`, `bg-chart-1`…`5`) to confirm the token wiring compiled for real rather than
silently dropping, the same class of failure `app/globals.css`'s wiped default palette is designed
to make loud.

`pnpm test:e2e e2e/analytics.spec.ts` (2 specs, `.serial`) against the real backend: green. The
first spec asserts the dev seed's own 6 real non-auto commitments and 1 real `LLMUsageEvent` row
(from `scripts/seed_dev_data.py`'s own Ask-index embedding call) render as real numbers, the
write-back panel shows its honest empty state (no messages sent yet in the fresh seed), then seeds
real additional activity out-of-band (`page.request` with this session's own bearer token,
`e2e/admin.spec.ts`'s established pattern) — a manually-created-then-verified commitment, and a
real draft→authorise→send write-back cycle against local Ollama (`CUE_LLM_*_PROVIDER` unset,
per this repo's own "dev/test = Ollama only" line — no Anthropic spend) — and confirms, after a
reload, that verification burden moves 6→7, the reply-rate panel shows the one real sent/unreplied
message at a real 0% rate, and the cost table's `call_count` moves 1→2 from that same draft call's
own real LLM usage. The second spec confirms a non-administrator project member still sees the
trend panels (any-project-member-gated) while the cost panel alone renders its named permission
message (`CostSummaryPermissionError`, org-administrator-gated) — the per-panel gating decision
above, proven live, not just typed.

Also ran, per this file's own "re-run the full suite before marking Done" instruction:
`pnpm test:e2e --grep-invert "Ask|Foresight"` (26 specs across `login`, `documents`, `living-wip`,
`supersession`, `twin`, `vendors`, `admin`, `analytics` — the slower LLM-heavy Ask/Foresight specs
excluded from this pass the same way F7's own session scoped its re-run). 24 of 26 passed,
`analytics.spec.ts`'s own 2 among them; the 2 failures are both pre-existing and untouched by this
session — `living-wip.spec.ts`'s write-back-draft-compose spec hit the exact same real-Ollama
timing flakiness `frontend/PROGRESS.md`'s F7 notes already documented and attributed to no
`CUE_LLM_*_PROVIDER=fake` being set locally, and `login.spec.ts`'s own `getByText("CUE Dev
Project")` assertion is unscoped enough to match three separate elements (the project-switcher
button, the page heading, and Next's own route-announcer live region) — a pre-existing test-
authoring gap this session didn't introduce (this session touched neither file, nor any app-shell
nav component). Neither is an F8 regression; both are named here rather than silently glossed over,
the same honesty this row's own dashboard practices about its data. `pnpm test:e2e ask` /
`foresight` remain in the same "not re-run this session" state F7 already left them in.

## Post-F8: F6 sparkline retrofitted to `ThemedLineChart` (2026-08-11)

F8's own notes above record a deliberate choice not to retrofit F6's `metric-history-chart.tsx`
sparkline to visx — small, already tested, already working, converting it would've been scope
creep. That reasoning held for *scale* (a five-point single series doesn't need a charting library)
but the underlying goal driving the whole visx decision was reframed mid-session: this product is
being built to compete and sell to multiple prospects, not serve one buyer's internal audit, and
the ask sharpened from "don't introduce unjustified complexity" to "one consistent charting
technique across the whole app, full stop, so a reviewer or new hire sees exactly one pattern with
zero explanation needed." Under that bar, two techniques — however well-documented the split — is
still two techniques. Retrofitting was cheap (one file, ~140 lines, no dedicated unit test to
break) and low-risk, so it was done rather than left as a documented exception.

**What changed, concretely**: `components/charts/themed-line-chart.tsx`'s prop type was generalised
from the analytics-specific `ProjectSeries` (imported from `lib/analytics/aggregate.ts`) to a
genuinely generic `ChartSeries`/`ChartPoint` shape (`{ id, label, points: [{x, value}] }`) defined
in the shared chart layer itself, not borrowed from one surface's own domain types — `lib/analytics/
aggregate.ts`'s own tested public API (`ProjectSeries`, `weekStart`) is untouched; F8's two feature
components (`verification-burden-chart.tsx`, `writeback-reply-rate-chart.tsx`) each gained a
three-line mapping step at the render boundary instead. `metric-history-chart.tsx`'s hand-rolled
`Sparkline` function (the custom `<svg>`/`<polyline>` code) was deleted outright and replaced with
`ThemedLineChart` fed a single-element series array — a history with fewer than two available
snapshots still renders no chart (a one-point line has nothing to compare against), same as the
original `Sparkline`'s own `points.length < 2` gate, just checked at the call site now. The exact-
values list underneath the chart, and the loading/error/empty-state branches, are byte-for-byte
unchanged.

`frontend/DESIGN.md`'s "Charting" section was rewritten to state the current, single-technique
policy as the primary rule, with the F8→F6 history kept as a parenthetical for whoever wonders why
two separate decisions exist in this file's own edit history. Twin's timeline was never part of
this policy either way — confirmed again here — it has no SVG in it at all, just a plain `<ol>`.

**Verification**: `pnpm typecheck` / `pnpm lint` / `pnpm test` (105 passing, same count as
pre-retrofit — no test depended on `Sparkline`'s internals) all clean. `e2e/vendors.spec.ts` was
re-run live against the real backend and caught a real regression: `ThemedLineChart`'s `AxisLeft`
now renders real numeric tick labels (the original bare-polyline `Sparkline` had none), and on this
vendor's real 0–100% history one tick legitimately reads "100%" — the same text the snapshot list
below already shows for its own reason, so `history-view`'s own `getByText("100%")` assertion (not
scoped past the whole History section) started matching two elements instead of one. Fixed by
scoping that spec's assertions to the snapshot `<ul>` specifically, not the section as a whole — a
real, live-caught interaction between this retrofit and existing test coverage, not a hypothetical
one left for a future session to discover. `e2e/vendors.spec.ts` (4 specs) and `e2e/analytics.spec.ts`
(2 specs) both green afterward, against the real backend.

## F9 notes (2026-08-11)

Mirrors `backend/PROGRESS.md`'s own M10 (Hardening) session in shape: real evidence, honest gaps,
no capability claimed that wasn't actually run. Two architecture decisions were confirmed with the
user directly before building, rather than assumed:

1. **High-contrast persistence is backend, per-user** (`User.high_contrast`, a new migration,
   `GET/PATCH /users/me`) — deliberately distinct from the theme toggle's own device-local
   `localStorage` design (`lib/store/ui-store.ts`'s own comment: "a device preference, not project
   data... nor should there be" a per-user row). The prompt's own wording ("persisted per-user, not
   just per-session") was different on purpose, and a low-vision user's contrast need should follow
   them across devices.
2. **`next-intl` without i18n routing** — locale in a cookie, resolved server-side per request, no
   `[locale]` URL segment. Chosen over locale-prefixed URLs specifically to leave every existing
   route, every existing e2e spec's navigation, and this app's own "stable per-project URL" design
   principle untouched — a fully-supported next-intl mode, not a workaround.

### 1. Backend gap closure — `GET/PATCH /users/me`

New `app/api/users.py`, `User.high_contrast` (migration `5d68b34f2fa8`), `UserMeOut`/
`UserPreferencesUpdate` schemas. `tests/test_users_me.py` (4 tests: default value, flip-and-persist,
no cross-user leakage, 401 unauthenticated).

**A real bug found and fixed, not caught by this session's own unit test.** The endpoint originally
called `session.commit()` then `session.refresh(user)` — backwards. `app/core/db.py`'s own
`get_session` docstring: `app.current_org_id` is set `is_local=true`, scoped to the request's
transaction; `commit()` ends that transaction, so a `refresh()` called *after* it runs its SELECT
with no RLS context and finds zero rows (`sqlalchemy.exc.InvalidRequestError: Could not refresh
instance`). In the browser this surfaced as an opaque CORS failure (a 500 response carries no CORS
headers here, and Chrome reports "blocked by CORS policy" for any cross-origin response missing
them, masking the real 500 until the server's own log was read directly). `app/api/milestones.py`'s
`update_milestone` already established the correct order (flush, refresh, *then* commit) for exactly
this reason — this endpoint just hadn't followed it. Fixed by matching that order.
**This session's own in-process `ASGITransport` test (`test_users_me.py`) never reproduced this bug
at all** — only a real e2e run against a real running server did, the same category of test-vs-real-
server divergence `backend/PROGRESS.md`'s own M10 notes already document for a different fixture
(`app_session` transaction scoping). Confirms the point of running real e2e verification rather than
trusting unit coverage alone. `uv run pytest`: 555 passing throughout.

### 2. High-contrast mode

`[data-contrast="high"]` slots into `app/globals.css`'s existing three-block cascade
(unqualified default / `@media (prefers-color-scheme: dark)` / explicit `[data-theme="dark"]`), each
block additionally qualified with `[data-contrast="high"]`, exactly as `frontend/DESIGN.md` already
named as the intended seam. Resolved server-side in `app/layout.tsx` (a real `GET /users/me` call,
gated on a real session) and painted directly into the SSR'd `<html>` attribute — no flash at all,
cleaner than the theme toggle's own `beforeInteractive`-script workaround, since this value never
depends on client-only storage. `components/app-shell/contrast-toggle.tsx` (TanStack Query, not the
zustand `ui-store` — this is server state now, per that store's own stated boundary), added to
`UserMenu` alongside `ThemeToggle`/`LocaleSwitcher`.

**Real WCAG contrast fixes, found by this session's own axe-core run** (§7 below), not eyeballed —
every value below is a genuinely different check from the "under 3:1 fill contrast by design"
tradeoff `frontend/DESIGN.md` already documented and explicitly told this session not to "fix" by
changing fills: that one was about a raw swatch as a *large solid fill*; this is small *pill text*
(`VerificationBadge`/`SeverityBadge`'s own shape), which WCAG 1.4.3 does not exempt regardless of an
adjacent icon:

| Token | Old (light) | New (light) | Old ratio (worst case) | New ratio (worst case) |
|---|---|---|---|---|
| `ink-muted` | `#7C8494` | `#5F6779` | 3.38–3.75:1 | 5.10–5.67:1 |
| `signal` | `#2A78D6` / `#3987E5` dark | `#1F68B8` / `#5A9AE8` dark | 3.99–4.42:1 | 4.84–6.29:1 |
| `good` | `#0CA30C` | `#067D06` | 2.96:1 (pill text) | 4.71–5.32:1 |
| `warning` | `#C97D00` | `#8F5800` | 2.82:1 (pill text) | 5.09–5.89:1 |
| `serious` | `#C1552C` | `#96401F` | 3.74:1 (pill text) | 5.64–6.89:1 |
| `critical` | `#D03B3B` | `#B3201F` | 3.88:1 (pill text) | 5.40–6.68:1 |

Ran the `dataviz` skill's own `validate_palette.js` against the new set first, per `DESIGN.md`'s
"Changing this later" rule — it correctly FAILed the categorical-adjacent-pair CVD check and named
the reason itself: that check is for series shown side-by-side in one chart, not independently-
labelled status pills never shown adjacent to each other as a decoded sequence. Its own error message
named the right tool instead ("for a lone status/text color check WCAG text contrast"), which is what
the table above is. `frontend/DESIGN.md` updated to match — its own stale "`warning`/`serious` sit
under 3:1... by design" claim no longer describes the re-stepped tokens, corrected in the same change
per that file's own "if the two ever disagree, the CSS is correct" rule.

High-contrast mode's own override values were re-stepped too, since several sat too close to the
*improved* base to still read as a real further step (e.g. `warning`'s old HC override, `#8A5700`,
was barely darker than the new base `#8F5800`) — re-picked to clear AAA (7:1+, several 8.4–10.7:1)
against the new base rather than the old one.

### 3–4. Localisation — `next-intl`, EN / 简体中文 / 繁體中文

`next-intl@4.13.6` (confirmed compatible: `next: ^16.0.0`, `react: ^19.0.0`, matching this app's
Next 16.3.0/React 19.2.8). Messages split one file per surface —
`messages/{en,zh-Hans,zh-Hant}/{common,nav,livingWip,twin,foresight,documents,ask,vendors,admin,
analytics}.json`, 30 files — not one giant per-locale file, specifically so this session's own large
mechanical conversion pass could run as five independent, conflict-free parallel edits instead of
one session serially touching ~106 component files. `i18n/request.ts` (server, cookie-driven
locale), `i18n/namespaces.ts` (the one list both that file and `lib/test-utils.tsx` read from),
`lib/i18n/set-locale.ts` (Server Action setting the cookie), `components/app-shell/locale-switcher.tsx`
(EN / 简体 / 繁體, native-script labels — a switcher naming its own options in English defeats the
point for a reader who can't read English yet). `messages/messages.test.ts`: key-parity across all
three locales for every namespace, plus an empty-string guard — a permanent regression test, not a
one-off check.

**Execution**: did the reference conversion myself first (`components/living-wip/verification-badge.tsx`,
`report-field.tsx`, `components/app-shell/*`) to establish the real pattern, then delegated the
remaining ~100 files to five parallel background agents, each owning a disjoint surface (and its own
namespace's 3 message files, never another surface's): living-wip (27 files), admin (15), foresight+
twin (21), ask+documents (20), vendors+analytics (14). Every agent was given the same explicit
do-not-touch list — components rendering vendor content inline with chrome
(`evidence-viewer.tsx`, `commitment-detail-panel.tsx`, `commitment-summary-row.tsx`, both
`deviation-row.tsx` copies, `sections/decision-log-section.tsx`, `supersession-candidate-row.tsx`,
`freeze-export-control.tsx`, `successor-brief-view.tsx`) — only chrome around the content gets
translated, never `deliverable_en`/`description_en`/`original_text`/`translation`/evidence quotes
themselves (P7). `lib/test-utils.tsx`'s `renderWithIntl` (real `en` bundles, not a hand-picked stub)
uses testing-library's own `wrapper` option rather than manually nesting the provider — a real bug
one agent found and fixed: a manually-nested provider is only present on the first render, so a
test's own `rerender()` call silently drops it and every `useTranslations()` call downstream throws.

Real, fluent Simplified **and** Traditional Chinese throughout, not a character-set conversion of
one from the other — distinct register/vocabulary in many places (保存/儲存, 导出/匯出, 计划/計畫,
已开票/已請款, etc.), each locale's own bundle authored independently. Deleted
`components/app-shell/surface-placeholder.tsx` as genuinely dead code found along the way (zero
import sites anywhere — every surface has had real content since F1–F8; not localised, since
localising unused code is pointless work).

**`lang` attribute audit**: `components/living-wip/evidence-viewer.tsx` was already correct
(`lang={displayingTranslation ? "en" : evidence.language}`), used as the reference pattern for the
rest. Fixed a real bug: `commitment-detail-panel.tsx`'s `deliverable_original` span hardcoded
`lang="zh"` regardless of the commitment's actual source language. New `contentLang()` helper
(`lib/format.ts`) resolves from the commitment's own linked evidence (`evidence[0]?.language`, real
bcp47, already `zh-Hans`/`zh-Hant`-capable) instead, falling back to `undefined` (no attribute) over
a wrong guess. Applied the same helper/pattern to the seven other content-mixing components in the
do-not-touch list above, all of which had no `lang` attribute on their vendor-content span at all.
3 new unit tests (`lib/format.test.ts`).

### 5. Non-colour-signal audit — confirmed clean, no code change

Audited every status/severity/verification colour usage across all 8 surfaces (an Explore agent's
thorough sweep, plus my own direct spot-check of the four shared primitives —
`StatusDot`/`VerificationBadge`/`SeverityBadge`/`RiskStatusBadge` — and 2–3 call sites per surface).
Every one already pairs colour with a text label, icon, or shape change, several with comments
explicitly citing PRD §12.1, with existing tests asserting on label text rather than colour class.
**No colour-only gap found** — the prompt's own worry that this would be "likely the largest single
chunk of real work" didn't hold; the shared primitives already enforce the discipline by
construction, and no surface had rolled its own status colour outside them. Recorded here as a real,
audited finding rather than manufactured busywork to look more thorough — an honest "audited, found
already compliant" is a legitimate outcome.

### 6. Raw-id / gap sweep

Three real Class A fixes, no Class B (missing-picker) gaps found anywhere:
- `components/admin/channel-identities-view.tsx` and `project-consent-view.tsx` both rendered
  `party_id` as a raw UUID despite already fetching the full `parties` list for their own picker
  right below — the resolver was sitting unused in the same file. Fixed with a small
  `resolvePartyName` helper in each.
- **Closed F2's own documented, still-open debt**: `MilestoneOut.type_term_id` had no resolver
  anywhere, so a milestone's type was never displayed at all (F2's notes: "this session works around
  it by simply never displaying a milestone's type"). `lib/twin/hooks.ts` gained its own
  `resolveTermLabel` copy (matching the per-surface-owns-its-copy convention `lib/foresight/hooks.ts`
  /`lib/documents/hooks.ts`/`lib/vendors/hooks.ts` already established), backed by the
  `milestone_type`-category terms `AddMilestoneForm`'s own picker was already fetching — threaded
  into `TimelineNodeRow` and `MilestoneDetailPanel` as a small type badge. Zero backend cost.

### 7. Loading-state honesty

**Ask**: already had a vague "Thinking — this can take a few seconds…" — tightened to name the real
budget (NFR-PRF-04: p50 ≤3s/p95 ≤8s): "usually a few seconds, can take up to 8s."
**Export**: the weakest of the two before this session — a bare `disabled` button with zero text/
visual change. Now shows "Exporting…" on the button itself plus a message naming the real budget
(NFR-PRF-05: "can take up to 30 seconds for a large project").

### 8. Real axe-core + Lighthouse run, and what they actually caught

`e2e/a11y.spec.ts`: `@axe-core/playwright` against all 8 surfaces (project-scoped: living-wip, twin,
foresight, documents, ask; org-scoped: admin, vendors, analytics), asserting zero critical/serious
violations — moderate/minor findings are recorded, not gated to zero (axe-core's own docs: "a real
subset of WCAG failures," not a full AA guarantee).

**Before fixes**: every one of the 8 surfaces failed with a real `color-contrast` (serious) violation
— the base-theme WCAG fixes in §2 above, found by this exact run, not invented ahead of time.
**After fixes**: 8/8 clean.

**Lighthouse**: `scripts/lighthouse-audit.mjs`, a standalone one-off script rather than baked into
the parallel Playwright suite — `playwright-lighthouse` needs a fixed `--remote-debugging-port`,
which fights this project's own multi-worker e2e run; kept separate the same "real but occasional,
not CI-gated" posture `backend/PROGRESS.md`'s own `loadtest/` (k6) already established for a
different NFR. Found and fixed a real methodological bug in the harness itself: a plain (non-
persistent) browser context shares no storage with the fresh page Lighthouse opens internally to
gather each audit, so every "authenticated" page audit was silently redirecting to `/login` and
scoring *that* page instead — caught by checking `lhr.finalDisplayedUrl` directly rather than trusting
the score (a re-audited `/login` coincidentally also scores 100 after the fix below, which would have
hidden the mismatch). Fixed per `playwright-lighthouse`'s own documented pattern
(`chromium.launchPersistentContext`, sharing storage with Lighthouse's own internal page).

That same debugging pass caught one more real, standalone bug: **`/login` had no `<main>` landmark at
all** — it sits outside `app/(shell)/layout.tsx`'s own `<main>` wrapper entirely (deliberately, per
F0's routing notes), and had never been given its own. Fixed (wrapped the page body in `<main>`).

**Final, real, verified scores** (persistent-context run, `lhr.finalDisplayedUrl` confirmed matching
the intended page for every row):

| Page | Accessibility | Performance | Best Practices | SEO |
|---|---|---|---|---|
| `/login` | 100 | 100 | 100 | 91 |
| Living WIP | 100 | 99 | 96 | 100 |
| Twin | 100 | 100 | 96 | 100 |
| Admin | 100 | 100 | 96 | 100 |

Accessibility 100/100 on every page audited, matching axe-core's own 0/8 violation count. SEO/
performance/best-practices are recorded honestly but were never this session's own NFR target (F9
owns NFR-ACC/the web-applicable NFR-PRF subset, not Lighthouse's SEO category); the SEO 91 on
`/login` and best-practices 96 on authenticated pages are real numbers, not investigated further —
out of this session's own scope.

### 9. Keyboard-only pass, one flow per named role

`e2e/hardening.spec.ts`'s own `tabTo()` helper: a real, bounded `Tab`-press walk from the current
focus position (never a `.focus()` shortcut) until the target receives focus — proves both keyboard
reachability *and* that nothing upstream traps or skips it, the two failure shapes axe/Lighthouse
cannot catch alone. Explicitly named as the honest substitute for a literal screen-reader session
this environment has no assistive-tech software installed to run — the same "genuine substitute, not
a claim of equivalence" posture this project already holds for FasterWhisper/Tesseract elsewhere.

**Two real, load-bearing bugs found this way, neither caught by the axe-core scan above** (both scan
runs happened as the seeded Administrator — neither bug's affected control ever renders for that
role):

1. **`DetailDrawer` (`components/living-wip/detail-drawer.tsx`) claimed `aria-modal="true"` with
   neither half of what that claim requires** (WAI-ARIA APG's dialog pattern): focus never moved
   into it on open, and `Tab` was never trapped inside it — a keyboard user opening any commitment/
   milestone detail panel could `Tab` straight past its own Confirm/Close buttons into the rest of
   the page behind it, an unreachable-in-practice modal despite being visibly on screen. Found when
   the PM keyboard-verify flow's own `tabTo()` call, walking for the "Confirm" button, ran out of its
   budget — the ARIA snapshot at failure showed the dialog open but focus still on background page
   content. Fixed: focus moves onto the dialog's own heading on mount (`tabIndex={-1}` +
   `.focus()`), `Tab`/`Shift+Tab` trapped within it while open, focus restored to the trigger element
   on close. Same bug, same fix, applied to `components/foresight/webhook-secret-dialog.tsx` (the
   only other `aria-modal="true"` surface in the app).
2. **The commitment detail panel's Payment status `<select>` had no programmatic label at all** — no
   `<label>`, no `htmlFor`, no `aria-label`/`aria-labelledby`, only a visually-adjacent `<h4>`
   heading. A screen-reader user tabbing to it would hear "combobox," nothing else. Found by the
   Finance-role keyboard flow specifically — `dialog.getByLabel("Payment status")` never resolved,
   hanging the test for its full budget rather than failing fast (Playwright's own `.evaluate()`
   waits for a matching element before either succeeding or timing out). Fixed: `aria-labelledby`
   pointing at the section heading's own new `id`. Swept the rest of the codebase for the same shape
   (33 `<select>` elements, checked via the 6 lines preceding each for `<label>`/`aria-label`/
   `aria-labelledby`/`htmlFor`) — confirmed isolated, every other `<select>` already wraps in a real
   `<label>`.

The four flows themselves, all passing keyboard-only end to end: a Project Manager opening and
verifying a commitment; a Producer triggering Freeze & Export; a Finance user changing payment
status (the flow that found bug #2 above); an Administrator provisioning a new project. Plus two more
hardening-specific keyboard/real-round-trip checks: high-contrast persisting across a reload via the
real `PATCH /users/me` (not localStorage — `page.waitForResponse` tied to the actual network call,
not raced against the UI's own `expect` poll), and switching locale to 简体 changing chrome while the
vendor's own English deliverable name and Chinese evidence quote both stay byte-identical.

**A real cross-spec-file race found and fixed, not just documented**: the PM keyboard-verify flow
originally targeted the same shared `pending_verification` commitment ("LED wall rental — main
stage") `e2e/living-wip.spec.ts`'s own first test asserts starts (and briefly stays) unverified.
Under `fullyParallel` + multiple workers — this project's own real CI concurrency, per F5's notes —
the two files' tests can interleave in either order; a real run showed `living-wip.spec.ts` losing
that race. Fixed the same way `e2e/vendors.spec.ts`'s own second seeded vendor already set the
precedent for: `scripts/seed_dev_data.py` gained a second, dedicated `pending_verification`
commitment ("Stage power distribution board") for `hardening.spec.ts`'s own exclusive use, not shared
with any other spec file's own assertions.

### Testing

`uv run pytest` (backend): 555 passing. `pnpm typecheck` / `pnpm lint` / `pnpm test` (122 passing,
24 files) / `pnpm build`: all clean.

**A real bug this session's own seed-script extension caused, caught by the actual pushed-commit CI
run — not by any local test run first.** `e2e/analytics.spec.ts` hardcoded an expected "6" (the
seed's own non-auto-verification-state commitment count) and read `projects[0]` from a live
`GET /projects` call rather than looking up the seeded project by name. This session's own second
`pending_verification` commitment (§9 above, added to give `hardening.spec.ts` a fixture the shared
`living-wip.spec.ts` race couldn't touch) genuinely moved that baseline from 6 to 7 — a real,
foreseeable consequence of the seed change this session's own local runs never caught, because
`e2e/hardening.spec.ts`'s own admin-provisioning test (which creates a real second project,
knocking "CUE Dev Project" out of `projects[0]`) happened not to interleave badly enough locally to
expose the ordering half of the bug on every run. **The first real pushed-commit CI run for this
session did expose it** — `analytics.spec.ts` failed there, `pnpm test:e2e` had been green locally
moments before. Root-caused from the real CI log (`gh run view --log-failed`), not guessed: fixed by
looking the seeded project up by its own known name ("CUE Dev Project") instead of trusting array
order, and updating the hardcoded counts (6→7 baseline, 7→8 after the test's own +1).

**That fix (commit `bacdd43`) still left CI red — on a second, different, real bug in the same
spec**: `costPanel.getByText("ollama")`, hardcoded since F8, never actually verified against a
genuinely green CI run — F8's own original push (`31453276435`) had already failed CI too,
undiscovered until this session went back and checked. Root cause: GitHub Actions runners cannot run
a real Ollama model, so this repo's own CI workflow sets `CUE_EMBED_PROVIDER=fake` for the whole e2e
job (a structural necessity, not a shortcut this session introduced) — meaning the seed script's own
`LLMUsageEvent` row (`run_embedding_sweep`, via `app/ask/embeddings.py`'s `get_embedding_client()`)
is genuinely recorded under `provider="fake"` in CI, never `"ollama"`. Fixed by asserting on
`process.env.CUE_EMBED_PROVIDER ?? "ollama"` — the actual configured provider — instead of a
hardcoded literal, correct under both real local Ollama (unset → `"ollama"`) and CI's fake provider
(`"fake"`). Verified locally against the real Ollama-backed stack only (2/2 passing) — deliberately
did not try to reproduce CI's fake-provider condition on the local dev backend, since that would mean
running this project's own local e2e testing against a mocked LLM, contrary to this file's own stated
dev-cost posture; CI's own run, which always and structurally runs under fake providers, is the
correct and sufficient place to verify that branch. Pushed as commit `1f30914`; CI run `31802756403`
genuinely green on both jobs (confirmed via `gh run watch --exit-status`), closing this milestone's CI
claim for real.

`pnpm test:e2e` (full suite, `--workers=2` matching CI's own concurrency), against real local Ollama,
after both fixes: 46 passed, 2 failed, 5 didn't run (cascading skips from `describe.serial` blocks
after their own file's one failure) — both remaining failures are the same pre-existing,
already-documented real-Ollama timing/local-state flakiness class `backend/PROGRESS.md`'s and this
file's own F7 notes already document at length (`e2e/ask.spec.ts`, `e2e/living-wip.spec.ts`'s
write-back-draft spec) — this session ran locally against real Ollama, per this project's own
dev-cost posture; CI's own `FakeClient` provider doesn't have this problem, confirmed by the real CI
run itself (`31802756403`) passing both jobs cleanly.

`e2e/hardening.spec.ts` (8 specs) and `e2e/a11y.spec.ts` (8 specs) — the 16 specs this session itself
added — all pass cleanly and reproducibly (re-run clean multiple times during debugging, not a
one-off green).

### Explicitly out of scope, as the prompt itself named

Mobile-specific NFRs (NFR-PRF-03, NFR-ACC-04's touch-target bar as a phone-sized audit, NFR-AVL-04's
offline queue) — the mobile plane doesn't exist in this project. A fourth locale or any language
beyond EN/简体/繁體 — CUE-PRD.md §3.2 names this explicitly out of v1 scope. A formal penetration
test or WCAG conformance audit by an external firm — this session's own axe/Lighthouse/manual pass is
the honest substitute available at this stage, not represented as equivalent to a real audit.

## Overall state — end of F9, the last milestone in this plan

F0–F9 all Done. Every surface CUE-PRD.md §12 names for the web plane (Living WIP, Production Twin,
Foresight, Documents, Ask/Successor Brief, Vendor Reliability Graph, Admin console, Analytics
dashboard) has real, tested content behind it — none is a stub or a fabricated-looking demo path —
and this milestone's own pass closed the accessibility/localisation/hardening gaps every prior
milestone's own prompt explicitly deferred to it (F0's reserved-but-unimplemented high-contrast CSS
seam, every surface's colour-only-signal risk, the single-locale UI chrome, the honest-loading-state
gap on Ask/Export). Real, current evidence: `uv run pytest` 555 passing (backend), `pnpm test` 122
passing across 24 files (frontend), `pnpm test:e2e` 46/53 passing with the 2 remaining failures a
pre-existing, named, real-Ollama-only flakiness class CI's own `FakeClient` provider doesn't hit
(confirmed by the real pushed-commit CI run itself — see this session's own "Testing" notes above for
the one real regression this session's own seed-script change *did* cause and the real CI log that
caught it, fixed before this milestone's own CI claim was made) — a real axe-
core scan (0/8 critical/serious violations, down from a real, found-and-fixed color-contrast failure
on every surface) and a real Lighthouse run (100/100 accessibility on every page audited, `finalDisplayedUrl`-verified as the real intended page each time), and two genuine keyboard-accessibility bugs
(an unmanaged focus trap on every detail drawer in the app, an unlabelled form control gated to a
role the automated scan never exercised) found by an actual role-based keyboard walkthrough and
fixed, not just documented.

What remains genuinely open, by design, not oversight:
- **The mobile plane doesn't exist in this project** — CUE-Tech-Stack.md §7's `apps/web`/
  `apps/mobile`/`packages/domain-types` monorepo layout is a documented mechanical move for whenever
  real mobile work starts, deliberately not done pre-emptively (this plan's own scope note, repeated
  every session it was relevant). NFR-PRF-03 (The Line's mobile load time), NFR-ACC-04 (Onsite Mode's
  touch-target bar), and NFR-AVL-04 (the mobile offline queue) are all mobile-owned NFRs this plan
  was never going to close.
- **F8's own honestly-blocked §13 metrics stay blocked** — coordination overhead, status meeting
  duration, report preparation time, active chats per PM per day, contingency drawn, commitment
  capture rate, and extraction accuracy by slice all still need either a telemetry pipeline that
  doesn't exist yet or a real Phase 0 discovery corpus this project has never had access to. Named
  again here rather than silently dropped from the record now that F8 itself is several milestones
  back.
- **Deployment/infrastructure NFRs remain backend/M10's own named gap**, unchanged by any frontend
  work: multi-region data planes, confirmed production volume + headroom, 99.5%/99.9% measured
  availability, RPO/RTO, and the annual penetration test / formal WCAG conformance audit this
  session's own axe/Lighthouse/manual pass is an honest substitute for, not an equivalent to.
- **The `e2e/ask.spec.ts` / `e2e/living-wip.spec.ts` write-back real-Ollama timing flakiness** (this
  file's own F7 notes first named it) is still unresolved for *local* runs specifically — CI itself
  is unaffected (real `FakeClient`, no Ollama in the loop there), so this has never blocked a real CI
  run, but a future session touching either surface locally should expect it and not mistake it for
  a regression of its own.

## Layer B Channel Picker (2026-08-17)

Closed the gap `Layer B Channel Picker — Implementation Prompt.txt` (project root) names: F7's own
"attach channel" form asked for a free-text "External reference," which for `type="whatsapp"` meant a
PM had to hand-type the raw WhatsApp group JID — an opaque id WhatsApp never shows a human anywhere in
its own UI. Confirmed against the real backend, not assumed: the free-text field is now WhatsApp-
specific-picker-shaped, backed by a real, live endpoint, not a hardcoded or cached list.

**What was built** (`components/admin/project-channels-view.tsx`, `lib/admin/channels-hooks.ts`):

- **`useWhatsAppConversationsQuery`** — a new hook over the backend's new
  `GET .../channels/whatsapp/conversations`, enabled only once `type="whatsapp"` is selected, no
  `staleTime` (the backend's own docstring is explicit this is a live Layer A lookup every call, not a
  static list — this hook doesn't paper over that with client-side caching either).
- For `type="whatsapp"` specifically, the attach form's free-text `external_ref` input is replaced
  entirely by a real, name-searchable picker: a search box filtering by name client-side, each result
  showing its resolved name, `group`/`contact` kind, and an "Already capturing" badge when Layer A's
  own `designated` flag is already `true` (e.g. an operator added it through Layer A's ops console
  first) — never the raw jid rendered anywhere. A `name: null` conversation (Layer A hasn't resolved
  one yet) falls back to a generic "Unnamed group/contact" label, still never the jid. Every other
  channel type keeps the original free-text field unchanged — no discovery mechanism exists for them
  (out of scope, named explicitly in the prompt).
- Attaching submits the picked jid as `external_ref` plus the picker's own resolved name as the new
  `display_name` field — one submit, matching the backend's "one transaction from the PM's point of
  view" design. A successful attach resets the whole form, `type` included, not just the picker's own
  selection — found necessary during this session's own real e2e run (see below): leaving `type=
  "whatsapp"` selected with the picker still populated re-showed the just-attached (now
  `designated: true`) conversation as pickable again, inviting an accidental duplicate attach and,
  concretely, making the attached-channels list and the picker's own list both contain an `<li>` for
  the same name at once.
- Detach errors now surface inline (`detachError`) — with the backend's new fail-closed Layer A revoke
  on detach, a detach can genuinely fail (Layer A unreachable) and leave the channel row in place; F7's
  original UI had no error path for detach at all since it could never previously fail this way.
- Fixed the misleading placeholder copy this whole investigation started from
  (`frontend/messages/*/admin.json`'s `channels.externalRefPlaceholder`, was "e.g. group name,
  mailbox" — a WhatsApp group *name* was never actually the right value even before this session,
  since the field always took the raw JID) — now "e.g. mailbox, drive id," scoped to what the field
  actually still does (non-WhatsApp channel types only). New `channels.picker.*` keys added to all
  three locale bundles (en/zh-Hans/zh-Hant) in the same change — `messages/messages.test.ts`'s own
  key-parity check passes.

**Tested, for real, three ways:**

1. `pnpm typecheck` / `pnpm lint` / `pnpm test` (122/122, including the message-parity test) — all
   clean.
2. `e2e/admin.spec.ts`'s existing channel-attach test switched from `type="whatsapp"` to `type=
   "wechat"` — it was never actually testing anything WhatsApp-specific, and with the new picker in
   place, `type="whatsapp"` no longer has a free-text `external_ref` field for that test to fill at
   all.
3. **A new `e2e/admin.spec.ts` test, run for real against the real linked WhatsApp account** (Layer A
   was genuinely running on this session's own machine): picks a real, currently-undesignated
   conversation from the live picker, attaches it through the actual UI (search box, click, submit —
   not an API shortcut), confirms the resulting channel row shows the resolved name and never the raw
   jid, confirms against Layer A directly that `designated` flipped to `true`, detaches through the
   UI, confirms it flips back. Skips cleanly if this environment's backend has no WhatsApp/Layer A
   configured (true for CI — no `CUE_WHATSAPP_*` in `frontend/.github/workflows/ci.yml`), fails for
   real if configured but unreachable. **This test caught the real "attach leaves the picker
   populated" bug above** — a first run failed on an ambiguous double-`<li>` match after detach, root-
   caused to the form not resetting `type`, fixed, re-run clean. Full `e2e/admin.spec.ts` (7/7) and the
   full Playwright suite (47/49 — the 2 failures are `ask.spec.ts`/`living-wip.spec.ts`'s own
   pre-existing, already-documented real-Ollama local-run flakiness from this file's own F7/F9 notes
   above, not a regression from this work) both run clean.

No frontend-side backend gap found this round (F7's own "gap audit" checklist: the picker's own
`display_name`/`designated`/`jid`/`kind` fields all resolve to real, renderable data from a real,
role-appropriate endpoint — no Class A or Class B gap to name).

## Capture debug console (2026-08-17)

Requested directly: a manual "pull now" trigger plus a real page to view a channel's raw captured
messages, gated the same way the rest of the admin console already is, meant to run in production
(not a throwaway dev tool). Backed by two new backend endpoints
(`GET .../channels/{id}/messages`, `POST .../channels/{id}/capture/pull-now` — see
`backend/PROGRESS.md`'s own entry for the same date, which also covers a real production
org-context concurrency bug this work's own live testing found and fixed along the way).

**What was built:**

- **`app/(shell)/admin/projects/[projectId]/channels/[channelId]/messages/page.tsx`** — a new nested
  route, `components/admin/channel-messages-view.tsx`. Reached via a new "View messages" link on
  each channel row in `project-channels-view.tsx`. Inherits the existing `admin/projects/[projectId]/
  layout.tsx`'s own membership gate; every actual read/write still independently enforces
  `ADMIN_ROLES` server-side regardless, same posture every other admin surface in this router
  already holds.
- Shows real `Message` rows — sender, timestamp, text (with `lang` set from the message's own
  `language` field, DESIGN.md's "never render evidence text without setting lang from the API's own
  value" rule applied here too, not just the Living WIP evidence viewer), and whether extraction has
  run yet. Independent of extraction succeeding or producing anything — a message shows up the
  moment capture durably writes it.
- "Pull now" enqueues the real arq job and returns immediately; there is no push mechanism to this
  UI, so a manual "Refresh" button (not a poll interval) is how new results actually appear — the
  same honest-about-no-live-socket posture health history already established, just without the
  `refetchInterval` this view doesn't want (a pull can take real minutes with real LLM extraction, an
  auto-refetch loop would just be wasted requests).

**Tested, for real, in the ways available to it:**

1. `pnpm typecheck` / `pnpm lint` / `pnpm test` (122/122) — clean. New `admin.channels.debug.*` keys
   added to all three locale bundles in the same change.
2. **A new `e2e/admin.spec.ts` test** — attaches a real channel, navigates to the debug page through
   the actual UI, confirms the honest empty state, clicks "Pull now," confirms a real `{queued: true}}`
   response reaches the UI. Deliberately does **not** assert a message appears afterward: that
   requires a real `arq` worker process consuming the queue (`backend/README.md`'s own "Run the
   worker locally" step), which neither this repo's CI job nor `e2e/global-setup.ts` starts — only
   the FastAPI server itself. Named here rather than silently asserted around: a genuine environment
   gap this feature's own full loop depends on, not something this session's own scope covers fixing
   (standing up a worker process in CI is a real infrastructure decision on its own).
3. **A real, manual, visual check against this session's own locally-running backend + a real `arq`
   worker** (not part of the committed test suite): attached a channel, hit "Pull now," polled
   "Refresh" until the real worker actually processed it, and confirmed a real captured message
   (Chinese text, correctly rendered via the CJK font routing, `lang` set) rendered in the page —
   screenshot taken and reviewed, not just trusted from the network response. Confirms the full loop
   genuinely works end to end in an environment that *does* run a worker (i.e., what a real
   deployment looks like), even though CI's own e2e job can't cover that last mile yet.

`pnpm test` 122/122, `pnpm exec playwright test e2e/admin.spec.ts` 8/8 (up from 7 — the new debug
console test), both clean.

## Capture debug console, part 2: real job status, not "refresh and hope" (2026-08-17)

Direct real-user feedback on the console shipped above, in the same session it shipped in: "this is
BAD UX — user does not know what is going on... is it dead? is it really pulling in the background?
what is the status? am I going to get anything? should I wait? should I exit?" A static "runs in the
background, refresh in a moment" message with zero real state genuinely doesn't answer any of that —
fixed by polling the backend's own new `GET .../capture/status` endpoint (real arq job state, see
`backend/PROGRESS.md`'s matching entry for the same date) instead of leaving the user to guess.

**What changed:**

- **`useChannelCaptureStatusQuery`** (`lib/admin/channels-hooks.ts`) — polls every 2s via TanStack
  Query's *function* form of `refetchInterval` (reads the previous response to decide whether to keep
  going), stopping itself the instant the job resolves (`complete` or `not_found`) rather than polling
  forever. Enabled unconditionally on page load, not only after a fresh "Pull now" click in the same
  session — a pull triggered by the scheduled worker, a different tab, or an earlier visit to this
  same page is exactly the "is something already happening?" question a debug console should answer
  honestly, not only for actions taken through this exact page instance.
- The status banner now renders one of five real, distinct states instead of one static line: queued
  (waiting for a worker), in progress, complete-with-real-counts, complete-but-nothing-captured (the
  job's own skip case), or failed-with-the-real-error. "Pull now" itself disables while a pull is
  already `queued`/`in_progress` for this channel, instead of silently letting a second click race the
  first.
- The messages list now **re-fetches itself automatically** the moment the status query's own
  transition into `complete, success=true` is detected (a `previousStatus` ref comparing consecutive
  poll results, so this fires once per completion, not on every subsequent poll tick while already
  complete) — the "Refresh" button is now a manual override for an impatient user, not the only way
  new results ever appear.

**Tested, for real:**

1. `pnpm typecheck`/`lint`/`test` (122/122) clean. `admin.channels.debug.pullQueued`/
   `pullAlreadyRunning` keys retired (the static messages they backed no longer exist); five new
   `statusQueued`/`statusInProgress`/`statusComplete`/`statusSkipped`/`statusFailed` keys added to all
   three locale bundles in the same change.
2. `e2e/admin.spec.ts`'s own debug-console test updated to assert on the new real status text instead
   of the retired static one — still deliberately CI-safe (no worker runs in CI, so it can only assert
   the job reaches a real `queued`/`in_progress` state, not a completion).
3. **A real, visual, manual verification caught a real bug before it shipped**: the first live check
   (this session's own locally-running `next dev` + a real `arq` worker) showed the literal
   untranslated key string (`admin.channels.debug.statusInProgress`) instead of real text — next-intl's
   own message bundle doesn't hot-reload new JSON keys added after the dev server process started,
   unlike component code's own Fast Refresh. Restarting the dev process fixed it; recorded here since
   it's a real, repeatable gotcha for whichever future session next adds a translation key mid-session
   and wonders why it renders as a raw key.
4. **That same live check then surfaced a second, real, previously-invisible bug**: a genuinely fresh
   pull (no cached duplicates to short-circuit it) failed with `MissingGreenlet` — arq's own 300s
   default job timeout killing the job mid-flight during real Ollama extraction. This was the exact
   gap `backend/PROGRESS.md`'s own prior entry had already named and deliberately deferred; the new
   status endpoint making it directly, immediately visible (as "Pull failed" in this exact page) rather
   than a silent, eventually-retried background failure is what made deferring it further not the
   right call — fixed backend-side (arq per-function timeout, 30 minutes) the same session, then
   re-verified live: a fresh channel's pull now genuinely reaches `complete` with real captured
   messages instead of failing partway through.

## CUE Blind Spots — frontend gap closure (2026-08-17)

`backend/PROGRESS.md`'s own "Blind Spots" round closed eight backend gaps (a producer genuinely
computed/recorded something, nothing read it back) — validating that round against the real product
surfaced a **Class A gap** in this frontend's own sense (`CLAUDE.md`'s gap-audit convention: "a value
is surfaced with no paired place to render it") on four of the eight fields, plus one stale piece of
copy describing a backend limitation that no longer exists. `pnpm run generate:api` regenerated
`lib/api/schema.gen.ts` against the now-running backend first — the four new fields didn't exist in
the TypeScript client at all until that ran.

**Stale copy fixed**: Admin → Export's own description used to read "Documents are not yet included
in this bundle, a real, currently-open gap on the backend side" — literally true when F7 wrote it,
false since the backend round above closed it. Reworded in all three locale bundles
(`messages/{en,zh-Hans,zh-Hant}/admin.json`'s `export.description`) to describe what the bundle
actually contains now, not what it used to lack.

**New shared component, `components/ui/confidence-badge.tsx`** (`ConfidenceBadge`,
`ManuallyVerifiedBadge`) — populates this project's previously-empty `components/ui/` with the one
piece of visual language genuinely reused across four different screens once this round finished:
Admin's Channel Identity review queue (pre-existing, refactored onto the shared component rather
than left as a fifth near-duplicate), a spec claim's own extraction confidence, voice-note evidence's
transcript confidence, and a captured message's identity-resolution confidence. Tone is value-driven
(<70% → `warning`, the same `max_confidence` threshold `GET /admin/channel-identities` already uses
server-side to mean "needs a look" — reused, not a second number invented here; ≥70% → quiet/neutral)
rather than the single fixed `warning` tone the original Channel Identity screen hard-coded, since
that screen only ever renders already-filtered low-confidence rows — a bare copy of its styling would
have mislabelled a spec claim's 95% or a fully-resolved message's 100% as "needs review."

**The four fields, one screen each:**

1. **`SpecClaim.confidence`** (`components/documents/spec-claims-panel.tsx`) — a `ConfidenceBadge`
   next to the attribute/value pills, omitted (not "0%") for a manually-entered claim with no model
   score.
2. **`Evidence.transcript_confidence`** (`components/living-wip/evidence-viewer.tsx`) — rendered
   directly under the audio player `media_ref` already adds, the two FR-VOI fields that travel
   together shown together, omitted for text-only evidence.
3. **`Message.identity_confidence` / `identity_manually_verified`** (`components/admin/
   channel-messages-view.tsx`) — added to the capture debug console's per-message row, next to the
   existing extraction-status pill. `MessageRow` extracted out to a standalone exported component in
   the same change (mirroring `NotificationRow`'s own exported-for-testing shape) — it was inline in
   a `.map()` before, untestable on its own.
4. **`AuditLog.detail`** (`components/living-wip/decision-log-row.tsx`) — the harder one, since
   `detail` has no one fixed shape across the ~6 backend call sites that write to it (a correction's
   `changes: {field: {before, after}}}`, a lifecycle transition's `trigger`, write-back's
   `outbound_message_id`, a deviation resolution's `resolution_date`/`resolution_owner`, ...). Wrote
   `formatDecisionDetail` (exported, pure, unit-tested independent of rendering) to special-case
   `changes` into a readable "field: before → after" line — the single highest-value case, what a PM
   actually corrected — and fall back to a plain "key: value" line for everything else, rather than
   inventing a schema the backend doesn't have or silently dropping the other shapes. `DecisionLogRow`
   is the one shared component F1/F5 already agreed to reuse (Living WIP's own Decision Log section,
   the Successor Brief, and Ask's decision-history/period-digest summaries all render through it) —
   one change here closes the gap on all four surfaces at once, not just Living WIP's.

**Explicitly not done, named rather than silently skipped**: no new screen for the deviation → Notification
dispatch (backend item 1) or the consent-record creation (backend item 2) — both already have real,
working screens (Foresight's Notifications panel; Admin → Consent) that read the data correctly today,
confirmed by walking both end to end against the real backend before starting this round. Nothing to
build there.

**Tested, for real:**

- `pnpm typecheck` / `pnpm lint` / `pnpm build` all clean.
- `pnpm test`: 141/141 (up from 122 — four new test files, `confidence-badge.test.tsx`,
  `spec-claims-panel.test.tsx`, `channel-messages-view.test.tsx`, `decision-log-row.test.tsx`, plus
  `evidence-viewer.test.tsx`'s pre-existing six-test suite extended with three more rather than
  replaced — first-draft mistake caught before it shipped: an early pass at this file overwrote
  it outright instead of extending it, silently deleting its original translation-toggle/audio-
  player/empty-state coverage; caught by `git diff` showing the file as *modified* rather than
  *new* before committing to it, restored from `git show HEAD` and merged properly), 19 net new test
  cases, including the message-bundle key-parity check across all three locales for the new
  `common.confidence`/`common.manuallyVerified` keys.
- `pnpm exec playwright test e2e/documents.spec.ts e2e/admin.spec.ts e2e/living-wip.spec.ts:36` — the
  real specs that exercise the four screens this round touched — 13/13 against the real backend.
- **Two pre-existing, unrelated e2e failures investigated, not silently ignored**:
  `ask.spec.ts`'s citation-opens-the-real-document test and `living-wip.spec.ts`'s
  verify-then-export test both failed before this round's changes too — confirmed by `git stash`-ing
  every change in this round and re-running both specs against the untouched code, same two failures,
  same error text, byte-for-byte. Neither touches anything this round changed (Ask's citation-link
  rendering, a Budget row's own verification badge) — a pre-existing local-environment/seed-data issue
  (this session's backend had already been manually poked at outside the e2e suite's own seeding, per
  the entries above), not a regression, and out of this round's own scope to chase further.

`pnpm test` 141/141, `pnpm build` clean, 13/13 relevant Playwright specs clean.

## Blind Spots item 3: a real document Activity view, not just a JSON download (2026-08-17)

Direct follow-up to the round just above: item 3's own validation steps required opening a
downloaded JSON file and searching it by hand for `document_audit_log`/`writeback_audit_log` — asked
the user directly whether that was the intended long-term UX or worth a real screen. Decided: yes,
worth it, scoped to a **document-scoped Activity view** (not a project-wide admin activity log —
smaller, and every other audit-shaped surface in this app, Consent/Budget history/Decision Log,
already lives at the resource it's about, not centralised) — `WritebackAuditLog` stays export-only
for now, since the write-back ceiling already has its own real "current value" surface at Admin →
Settings and didn't come up as a pain point the way document history did.

This needed a real backend endpoint first (`backend/PROGRESS.md`'s matching entry) —
`DocumentAuditLog` had no project-scoped read surface at all before this round, only the
whole-bundle export.

**What shipped:**

- **`DocumentActivityLog`** (`components/documents/document-activity-log.tsx`) — a new "Activity"
  section on the document detail page, alongside Tags and Versions. Each of the five real
  `DocumentAuditAction` values gets its own plain-language line (`describeAction`, exhaustively
  switched over the real backend enum, not a generic key:value fallback — `DocumentAuditLog.detail`
  has one fixed shape per action, unlike `AuditLog.detail`'s free-form shape `decision-log-row.tsx`'s
  `formatDecisionDetail` had to generalise over): "Document created," "New version uploaded (v2),"
  "Version approved and synced to SharePoint" / "— SharePoint sync failed," "Classification updated."
  Actor resolved to a real name via the same `resolveMemberLabel`/`useProjectMembersQuery` pair
  `version-history.tsx` already uses.
- **A second, real stale-copy fix, same shape as the Export page's** (previous round): `version-
  History.approvedBy` used to read "...its outcome isn't surfaced by this build" — true when F4
  wrote it, false now that Activity shows the real `sharepoint_write_back` outcome. Reworded to point
  at the new section instead, all three locales.
- New hook `useDocumentAuditLogQuery` (`lib/documents/hooks.ts`), invalidated by the same
  `invalidateDocument` helper every other document mutation already goes through — approving a
  version or saving tags refreshes the Activity list automatically, no manual refresh needed.

**A real, repeatable environment gotcha, caught and understood, not silently worked around**: the
first Playwright run of the new Activity test failed with the literal untranslated key strings
rendering (`documents.activityLog.tagged`, etc.) instead of real text — not a code bug. Playwright's
`webServer.reuseExistingServer` had reattached to a **production server process left running from an
earlier command in this same session**, built before the new translation keys existed; `next start`
serves whatever was baked in at `next build` time, so a stale server never picks up new message JSON
without a rebuild. This is the production-build sibling of `frontend/PROGRESS.md`'s own prior
"next-intl doesn't hot-reload new keys mid-session" gotcha (Capture debug console, part 2) — same
root cause (a running process older than the source it's serving), different mechanism (build-time
bundling vs. dev-server hot-reload). Fixed by killing the stale process and letting Playwright's own
`pnpm build && pnpm start` run fresh; all five documents specs passed clean afterward.

**Tested, for real:**

- `pnpm typecheck`/`lint`/`build` clean.
- `pnpm test`: 146/146 (5 new tests in `document-activity-log.test.tsx`, exercising all five real
  actions including the sync-succeeded/sync-failed distinction) — deliberately asserts the actor
  line with a regex (`/^Priya ·/`), not the exact `formatDateTime` output, since that's locale/
  timezone-dependent and no other test in this suite hardcodes it either.
- `pnpm exec playwright test e2e/documents.spec.ts` — a new, fully real test drives a document
  through upload → approve → tag and asserts all four resulting facts appear in plain language in
  the real Activity section, with no raw action code or JSON blob leaking through. 5/5, plus the
  full `documents.spec.ts` + `admin.spec.ts` + `living-wip.spec.ts:36` set (14/14) re-run clean
  against the corrected, fresh build.

`pnpm test` 146/146, `pnpm build` clean, 14/14 relevant Playwright specs clean (fresh server).

## Updating this file

When a milestone completes:
1. Flip its Status cell to `Done`, with the commit/date.
2. Note anything the next milestone's prompt should know that wasn't true when it was written (a
   design decision made mid-implementation, a scope adjustment, a discovered blocker) — own
   subsection below, same shape `backend/PROGRESS.md` uses per milestone.
3. Run the frontend's full check (typecheck + lint + unit tests + the Playwright suite against a
   real running `backend/` per `docker-compose.yml`, not a mocked API — see F0's own testing
   philosophy note) and confirm it's green before flipping the status.
