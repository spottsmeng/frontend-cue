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
