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

## Updating this file

When a milestone completes:
1. Flip its Status cell to `Done`, with the commit/date.
2. Note anything the next milestone's prompt should know that wasn't true when it was written (a
   design decision made mid-implementation, a scope adjustment, a discovered blocker) — own
   subsection below, same shape `backend/PROGRESS.md` uses per milestone.
3. Run the frontend's full check (typecheck + lint + unit tests + the Playwright suite against a
   real running `backend/` per `docker-compose.yml`, not a mocked API — see F0's own testing
   philosophy note) and confirm it's green before flipping the status.
