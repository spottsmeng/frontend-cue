@AGENTS.md

# CUE frontend — working instructions

This is the Next.js web app for CUE (`../CUE-PRD.md`, `../CUE-Tech-Stack.md`) — Living WIP, Ask,
Admin, and the other desktop-primary surfaces. `frontend/PROGRESS.md` tracks the build plan (`Prompt
F0` onward, in the project root); read it before starting any of those prompts.

## Design system — read before writing any UI code

**`frontend/DESIGN.md` is mandatory reading before touching a component, a class name, or
`app/globals.css` itself.** It's the approved, validated design system (palette, type, layout
concept) — not a suggestion one session made and a later one can quietly override. This applies
whether you're running a `Prompt FN` file or just fixing a bug in an existing page; there is no
UI task in this directory `DESIGN.md` doesn't govern.

**Every color, font, and radius comes from a named token** (`bg-signal`, `text-ink-muted`,
`border-critical`, `font-mono`, `rounded-md`, ...) — never a raw hex, never Tailwind's own default
palette (`bg-blue-500`, `text-gray-500`, and the like). This isn't a style preference to weigh
against convenience: `app/globals.css` wipes Tailwind's built-in color palette entirely
(`--color-*: initial` in the `@theme` block, keeping only `white`/`black`/`transparent`/`current` as
structural escape hatches). A class like `bg-blue-500` doesn't merely look wrong — it compiles to
*nothing*, so the element it's on renders with no background at all. That's deliberate: an unstyled
element is impossible to miss in dev; a plausible-but-off-brand blue is the kind of thing that ships.
If you need a color `DESIGN.md` doesn't have a token for, add the token there and in
`app/globals.css` first (primitive → `@theme` mapping → any base rule that needs it, all in the same
change) — don't reach for the default palette as a shortcut, and don't invent a new brand hue without
re-validating it the way `DESIGN.md` documents (the `dataviz` skill's `validate_palette.js`, not by
eye — the first attempt at a violet secondary failed the colorblind-safety check outright).

## Testing philosophy

No mocks of anything that matters — this project's backend has zero mocks of its own database, RLS,
or auth in 480+ tests, and the frontend holds the same line: a Playwright spec that claims a feature
works exercises the real backend (`docker-compose.yml`), not a hand-rolled double. See `Prompt F0 —
Frontend Foundations.txt`'s own "Testing philosophy" section for the full statement — it's referenced
by every later `Prompt FN`'s TESTING EXPECTATION rather than repeated in each one.

## Gap audit — run this before writing UI, and again before marking a milestone Done

This project already has a working pattern for catching real backend gaps a frontend session hits —
`backend/PROGRESS.md`'s "Frontend-enablement additions" rounds (`POST /auth/dev-login`, CORS, the
ontology-terms discovery endpoint, `GET .../members/me`, `EvidenceOut.media_ref`, and — closed during
F3 — `OntologyTermOut.id` and `GET /projects/{project_id}/members`). `Prompt F6`'s and `Prompt F8`'s
own READ FIRST sections show the same thing caught *pre-emptively*, before the session even started
(`GET /parties`, `GET /admin/cost-summary`, both added by "an earlier pass over this plan" rather than
discovered mid-build). The practice works. It just hasn't been a standing requirement every session
runs on itself — F3's own prompt was thorough about *behavioural* non-obviousness (race conditions,
role gates, nullability) but never asked, for every field its own UI would touch, "can this actually be
populated with real data by the person who's supposed to use it?" That's the one category every
`Prompt FN` should self-check, not just the ones lucky enough to have had a prior planning pass.

Two distinct failure shapes to check for, by name (both hit for real during F3, both fixed —
see `backend/PROGRESS.md`'s "round 3" notes and `frontend/PROGRESS.md`'s F3 notes for the full
writeup):

- **Class A — an id is surfaced with no paired way to resolve it to a label.** Any response field
  named `*_term_id`, `*_id`, or similar that a UI will *render* (not just carry through as an opaque
  key) needs a real endpoint, reachable by the role that will view it, that turns that id into
  something a human reads. Don't assume one exists — trace it. (`Deviation.class_term_id` had no
  resolver until F3 added `id` to `OntologyTermOut`; `MilestoneOut.type_term_id` still doesn't, per
  F2's own notes — same unfixed gap, not yet worth a second session closing it alone.)
- **Class B — a form needs to let someone pick an entity, but no endpoint exists at the access tier of
  the role actually gated to use that form.** Don't assume a higher-privileged endpoint (an org-admin
  read, say) covers an ordinary write-role user's need just because the data technically exists
  somewhere. Check the actual role gate on both the write endpoint your form calls *and* whatever read
  endpoint would back its picker — a mismatch between the two is the gap. (`DeviationResolveRequest.
  resolution_owner` needed a project-scoped, any-member-readable directory; the only thing that
  existed was org-admin-gated and didn't even carry a name.)

The check, concretely:

1. **Before writing UI**: for every field the prompt's WHAT TO BUILD asks you to render or let a user
   write, ask Class A and Class B above. If either gap exists, decide — small and clearly in scope
   (an additive field, a new read endpoint at the right tier) → close it now, same pattern as the
   existing rounds (schema/endpoint change + a real test against the real DB + a `backend/PROGRESS.md`
   "round N" entry); ambiguous or large → document precisely in `frontend/PROGRESS.md`'s own
   per-milestone notes, don't guess and don't fabricate a resolved value the API never actually gave
   you.
2. **Before marking the milestone Done**: re-check anything you deferred as "worth flagging" — did it
   ship as a raw id or a pasted-UUID input anywhere? If so, that's a real, live gap for whoever uses
   the feature next, not just a code comment; say so plainly in this milestone's own PROGRESS.md notes
   rather than letting a "Done" status imply it's fully resolved.
3. **Check for prior art first.** A gap this session finds may already be found and either fixed or
   named as a known limitation in an earlier milestone's own notes — read every prior `## FN notes`
   section in `frontend/PROGRESS.md` in full (not just the status table) before assuming a gap is new.
