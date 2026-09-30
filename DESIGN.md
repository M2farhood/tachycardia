# Study Tracker — design

**The idea (chosen by the owner 2026-09-30): one wide working sheet.** One section (one project / part of
life) at a time, and it owns the whole width. Top to bottom: the section band → the task line → To do | Done.
Nothing floats in empty space and nothing sits in a side column.

## The one bold thing — the section band
- A full-width band carrying the section name. It **fills left→right as tasks get done**; the fill is a soft
  accent tint with a solid 3 px accent leading edge (`.section-band-fill` in `src/index.css`).
- The percentage sits large on the right of the band; "N of M done" under the name. Tap = this list ↔ all lists.
- This is the progress measure. Don't add a second one (ring, sidebar, stat tiles) on the dashboard.

## Layout rules
- Task line directly under the band: full width, borderless, underline turns accent on focus, "Add" button only
  appears when there is text.
- Wide screens (≥1024 px): To do (3/5) | Done (2/5) side by side. Phones: stacked, To do first.
- Column headings are sentence case with a count ("To do 2") — no tracked-out caps eyebrows.
- Streak / Today / Total live in Settings → Your progress, not on the dashboard.
- Views (Blocks, Calendar, Tachycardia, Focus) are the small header circles; sections are the tab row.

## Tokens
Colours are the OKLCH tokens at the top of `src/index.css` (slate-blue hue 255, one accent). Text on any
accent/success/danger fill uses `--on-accent`. Light theme is the owner's daily theme — check it first.
Fonts: Inter (dark), Newsreader (light theme), as already set. Radius: 16 px for the band, 12 px controls.

## Never do (rejected by the owner)
- A right-hand column/rail holding a big progress ring — "cut the page in half just to put a measurement".
- A tiny progress ring next to a small label.
- The task input floating in the middle of an empty page.
- Stats strip (Streak / Today / Total) on the dashboard.
- A second nav row of big Blocks / Calendar / Tachycardia buttons.
- Big section title + "Module 1 of N" subtitle repeating the tab name.
- Hard-coded dark hex backgrounds (light theme turns their text dark → dark-on-dark).
