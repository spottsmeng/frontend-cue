# CUE frontend — design system

Approved 2026-08-09. This is the durable record of the design review — read this before touching
`app/globals.css` or adding a color/font/radius anywhere in the frontend. **Every component reads a
token by role (`bg-signal`, `text-ink-muted`, `border-critical`); no raw hex, no one-off `text-gray-500`,
anywhere outside `app/globals.css` itself.** That file is the single source of truth this document
describes — if the two ever disagree, the CSS is correct and this file is stale; fix whichever is wrong,
don't let them drift apart silently.

Review artifact (palette + type + a full Living WIP mockup, light/dark toggle):
`https://claude.ai/code/artifact/7d0e9863-9e16-4294-8e4e-96593dc12a0e`

## Why this exists

Every `Prompt FN` file in this plan is written for a brand-new Claude Code session with no memory of
this conversation. Without a decided, written-down visual foundation, F1 through F9 would each invent
one independently — the same drift problem `PROGRESS.md` exists to prevent for implementation
decisions, applied here to design ones. Read this once; every later prompt assumes you have.

## Color

Three layers — see `app/globals.css`'s own top-of-file comment for the mechanics (theme-able
primitives → `@theme inline` mapping → base element defaults). Conceptually:

**Neutrals — "Slate".** Cool, blue-biased graphite (hue ≈ 225°), not a default gray — chosen the way
`artifact-design`'s own fundamentals ask: `bg` / `surface` / `surface-sunk` / `border` /
`border-strong` / `ink` / `ink-secondary` / `ink-muted`, both themes.

**Brand triad — Signal / Dusk / Bloom.**

| Token | Role | Light | Dark |
|---|---|---|---|
| `signal` | Primary — actions, links, focus ring | `#1F68B8` | `#5A9AE8` |
| `dusk` | Secondary — selection, emphasis | `#4A3AA7` | `#9184E8` |
| `bloom` | Tertiary — sparse accents only, never a CTA | `#C43D78` | `#EB9CC0` |

Deliberately clear of red/amber/green — CUE-PRD.md §12.1: "semantic colour is distinct from brand
colour and never the sole carrier of meaning." Not eyeballed: validated with the `dataviz` skill's own
`validate_palette.js` (lightness band, chroma floor, CVD separation under simulated protan/deutan/
tritan vision, a normal-vision floor, contrast vs. surface). The first attempt at a violet secondary
failed the dark-mode CVD check outright — blue and violet collapse into each other under deuteranopia
at those lightness steps, worst adjacent ΔE 1.9 (deutan) / 9.8 (normal vision), both well under the
8/15 gates. The shipped `dusk` (`#9184E8` dark) was re-stepped until it cleared: worst adjacent ΔE 12.6
(deutan) / 16.6 (normal vision), full `--pairs all` pass in both themes. Each has a `-soft` tint
(`signal-soft`, `dusk-soft`, `bloom-soft`) for chip/badge backgrounds. `signal` itself was re-stepped
again by F9's real axe-core run (frontend/PROGRESS.md's F9 notes): the original `#2A78D6`/`#3987E5`
measured 4.41:1 (light, on white) / 3.99:1 (dark, on `signal-soft`) — a genuine WCAG 1.4.3 text-
contrast fail axe flagged as "serious," not a rounding artefact. One darken/lighten step each clears
>=4.5:1 everywhere it's used as text (5.6–6.3:1 measured) with no existing pairing regressing.

**Status quad — fixed, reserved, never touches brand.**

| Token | Meaning | Hex (light) | Hex (dark) |
|---|---|---|---|
| `good` | on-plan | `#067D06` | `#37C837` |
| `warning` | watch | `#8F5800` | `#F0A93B` |
| `serious` | escalating | `#96401F` | `#F0916A` |
| `critical` | risk | `#B3201F` | `#F06B6B` |

Always paired with an icon + label (§12.1) — colour is never the sole carrier of meaning, regardless
of contrast. The light-mode values above were re-stepped by F9's real axe-core run
(frontend/PROGRESS.md's F9 notes): the originals (`#0CA30C`/`#C97D00`/`#C1552C`/`#D03B3B`) measured
2.96–3.88:1 as **pill text** on their own `-soft` background (`VerificationBadge`/`SeverityBadge`'s
actual rendered shape) — a real WCAG 1.4.3 fail distinct from the fill-contrast question below, which
icon+label pairing does not exempt. Re-stepped to clear >=4.5:1 on `-soft` (8.4–9.3:1 measured) and
comfortably exceed 3:1 as a large fill too (5.3–6.9:1 on white) — the *previous* version of this file
noted `warning`/`serious` sitting under 3:1 as a large solid fill "by design"; that specific tradeoff
no longer describes these re-stepped tokens (verify against `app/globals.css`'s own comments if this
ever needs re-checking, per this file's own "if the two disagree, the CSS is correct" rule). Maps onto
two real taxonomies in the backend: the commitment/milestone 3-state stripe (on-plan/watch/risk →
good/warning/critical, skipping `serious`) and Foresight's own 4-state `RiskSeverityLiteral`
(low/medium/high/critical → warning-lite/warning/serious/critical).

**Verification chips — a second, independent status axis.** `CommitmentOut.verification_state` /
`ReportField.verification_state` / `DeviationOut`'s equivalent (auto / pending_verification /
human_verified / human_corrected) is extraction *trust*, not delivery *risk* — a genuinely different
question from the severity stripe above. Built from **brand** hues, not status hues, and rendered as
**pills**, never **stripes** — form difference plus hue difference means the two systems can't be
mistaken for one another even at a glance, not just in theory:

| Token | State | Hue borrowed from |
|---|---|---|
| `verify-auto` | `auto` | `ink-muted` (quiet, no action needed) |
| `verify-pending` | `pending_verification` | `warning` (the one deliberate status borrow — pending genuinely does mean "watch this") |
| `verify-verified` | `human_verified` | `signal` (trust signal, not delivery status) |
| `verify-corrected` | `human_corrected` | `dusk` |

## Charting

**One technique, one shared component layer, for every chart in the app: `components/charts/`,
built on visx.** `ThemedLineChart` (`components/charts/themed-line-chart.tsx`) is the single
primitive every chart in this codebase renders through — F8's multi-series analytics trends and
F6's single-series vendor metric history alike — themed entirely against these tokens, never a
pre-styled kit fighting them. A single-series caller just passes a one-element `series` array;
`ChartLegend` itself renders nothing below two items, so a lone series needs no extra handling.
Don't reach for a second technique for a future chart, no matter how small — extend this layer
instead of hand-rolling a new `<svg>`.

(History, since a future session may find the reasoning referenced elsewhere: F8 originally
introduced visx for its own genuinely multi-series charts only, deliberately leaving F6's original
dependency-free `<svg>`/`<polyline>` sparkline — and Twin's timeline, which was never SVG at all,
just a plain `<ol>` — untouched, citing `CUE-Tech-Stack.md §4`'s "twenty lines of code, not a
library" reasoning at F6's original, genuinely small scale. F6's sparkline was retrofitted to
`ThemedLineChart` in a later pass, once literal single-technique uniformity became the explicit,
stated goal — see `frontend/PROGRESS.md`'s F8 notes for the full account of both decisions. Twin's
timeline was never in scope for this policy either way — it's a chronological list, not a chart.)

Theming idiom for visx marks: Tailwind utility classes on SVG elements (`stroke-chart-2`,
`fill-chart-2`), never a raw `var(--color-*)` inline style — except where visx needs a literal JS
color value (a `scaleOrdinal` range array), where `getComputedStyle` reads the resolved custom
property at runtime rather than a hand-copied hex.

**Categorical chart palette.** The brand triad is deliberately *not* a categorical palette (three
hues, and two of the three — `signal`/`dusk` — already double as verification-chip colors) and the
status quad is reserved. A real multi-series chart needs its own set, validated the same way `dusk`
itself was re-stepped after failing its first CVD check:

| Token | Hue family | Light | Dark |
|---|---|---|---|
| `chart-1` | orange | `#EB6834` | `#D95926` |
| `chart-2` | aqua | `#1BAF7A` | `#199E70` |
| `chart-3` | yellow | `#EDA100` | `#C98500` |
| `chart-4` | green | `#008300` | `#008300` |
| `chart-5` | red | `#E34948` | `#E66767` |

Assigned in this fixed order, never cycled or reassigned when a filter changes which projects are
shown (`dataviz` skill: "color follows the entity, never its rank"). Validated against this file's
own surfaces (`#FFFFFF` light / `#12151B` dark) with `validate_palette.js`, `--pairs adjacent` (the
correct test for a line chart — lines are compared as legend-order neighbours, not scattered marks
freely adjacent to one another): worst adjacent CVD ΔE 7.2 light / 6.9 dark (protan) — the 6–8 floor
band, legal only with secondary encoding, which every chart in the app ships unconditionally
(chart + legend + an exact-numbers table/list, never the chart alone) — and worst adjacent
normal-vision ΔE 22.9 light / 19.8 dark, both clear of the 15 floor. `chart-2`/`chart-3` sit under
3:1 contrast on the light surface by design (WARN, same relief rule as `warning`/`serious` above);
the mandatory legend + table is the relief, not an afterthought. `chart-4`/`chart-5` share a hue
family with `good`/`critical` — deliberately validated as distinct steps for a genuinely different
axis (project identity, not delivery status), never rendered in the same view as a status chip, so
the two can't be read as the same signal. Five slots, not eight: past five simultaneous series, fold
into "Other" or facet rather than stretching the palette further — re-stepping past this point risks
the normal-vision floor the same way the reference default's own fourth slot does (`dataviz` skill's
`palette.md`).

## Type

- **UI + headings: Geist Sans**, one disciplined family across weights — not a second display face.
  A dashboard is scanned and operated, not read top-to-bottom (`artifact-design`'s own framing); one
  family with a clear weight/size scale serves that better than a decorative heading face fighting a
  body face. Already self-hosted via `next/font/google` in `app/layout.tsx` — this predates the
  design review, kept because it fits.
- **Evidence, timestamps, amounts, IDs: Geist Mono**, `font-variant-numeric: tabular-nums`. Pairs
  natively with Geist Sans. Using monospace for exactly the data classes CUE's own evidence-grounding
  thesis cares about (an exact quoted span, a precise timestamp, an amount) is a content-driven
  choice, not decoration — it visually marks "this is precise and sourced" every time it appears.
- **CJK — Noto Sans SC (Simplified) and Noto Sans TC (Traditional), two separate families, never
  merged.** CUE-Tech-Stack.md §6: "Singapore and mainland vendors write 简体; Hong Kong and Taiwan
  write 繁體... the same word misses across the boundary" — the same reasoning applies to typeface
  choice, not just search tokenisation. Both are self-hosted via `next/font/google` in
  `app/layout.tsx`, routed by `:lang(zh-Hans)` / `:lang(zh-Hant)` in `app/globals.css` (`:lang(zh)`
  alone falls back to Simplified). **Verified for real, not assumed**: `pnpm build`'s output was
  inspected directly — the generated `@font-face` rules carry real CJK codepoints in their
  `unicode-range` (U+4E00 一, U+4E2D 中, U+65E5 日, U+7684 的, etc.), confirming actual glyph coverage
  rather than a silent latin-only subset. Every `original_text`/evidence span in Chinese needs its
  container tagged `lang="zh-Hans"` or `lang="zh-Hant"` (per `Evidence.language`'s own bcp47 field) for
  this routing to fire — a missing `lang` attribute silently falls through to Geist Sans, which has no
  CJK glyphs at all and will show tofu. F1 onward: never render evidence text without setting `lang`
  from the API's own value.

## Layout

Single-column "stable document" reading width for Living WIP (§12.2's own spec: "single scrolling
document at a stable per-project URL"), a slim sticky sub-header carrying the currency indicator
("last ledger change... never a refresh button") and Freeze & Export, sections as bounded panels with
real vertical rhythm. Radii are deliberately tight (`radius-sm` 4px / `md` 6px / `lg` 8px / `xl` 10px,
overriding Tailwind's own defaults in `app/globals.css`'s `@theme inline` block) — a precision-
instrument feel, not the soft `rounded-2xl` look `artifact-design`'s own anti-pattern list flags as
an AI-design tell.

## What's implemented vs. what's still F0's job

**Done (this session, pre-F0):** the full token architecture in `app/globals.css`, Geist Sans/Mono +
Noto Sans SC/TC wired in `app/layout.tsx`, `pnpm build` and `pnpm lint` both verified clean, and
`app/page.tsx` replaced (the default `create-next-app` boilerplate is gone — it referenced tokens
that no longer exist).

**Still F0's job:** the actual theme toggle (the CSS contract — `prefers-color-scheme` plus
`[data-theme]` override — is ready for one; nothing sets `data-theme` yet, so every viewer currently
sees their OS theme with no in-app override), the app shell/nav, and every surface's real content.
`Prompt F0 — Frontend Foundations.txt`'s own design-tokens task has been marked done in
`frontend/PROGRESS.md` accordingly — don't redo it, extend it (a toggle component, not new tokens).

## Changing this later

Same discipline as `backend/`'s prompt files: change one thing, re-run `pnpm build` and `pnpm lint`,
and re-validate any color change with the `dataviz` skill's `validate_palette.js` before committing
to it — don't nudge a hex by eye because it "looks a little off." If a genuinely new token is needed
(a fourth brand hue, a new status), add it to `app/globals.css`'s three layers together (primitive →
`@theme` mapping → any base rule that needs it) and update the tables above in the same change, not
as a follow-up.
