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
| `signal` | Primary — actions, links, focus ring | `#2A78D6` | `#3987E5` |
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
(`signal-soft`, `dusk-soft`, `bloom-soft`) for chip/badge backgrounds — the swatch itself is for
solid fills (buttons, rings), not body text on a light surface (it sits under 3:1 there by design;
pair with white/dark text on the fill, or the `-soft` tint under regular ink, never the raw swatch as
small text).

**Status quad — fixed, reserved, never touches brand.**

| Token | Meaning | Hex (both themes' light value; dark re-steps for the dark surface) |
|---|---|---|
| `good` | on-plan | `#0CA30C` / `#37C837` dark |
| `warning` | watch | `#C97D00` / `#F0A93B` dark |
| `serious` | escalating | `#C1552C` / `#F0916A` dark |
| `critical` | risk | `#D03B3B` / `#F06B6B` dark |

Always paired with an icon + label (§12.1) — on light surfaces `warning`/`serious` sit under 3:1 fill
contrast on purpose; the label carries the meaning, the fill never does alone. Maps onto two real
taxonomies in the backend: the commitment/milestone 3-state stripe (on-plan/watch/risk → good/warning/
critical, skipping `serious`) and Foresight's own 4-state `RiskSeverityLiteral`
(low/medium/high/critical → warning-lite/warning/serious/critical). Confirm this mapping still holds
when F3 (Foresight) actually wires severity badges — it's a reasonable default, not tested against
every real value yet.

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
