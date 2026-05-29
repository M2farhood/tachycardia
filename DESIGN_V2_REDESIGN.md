# Design v2 — Structural Redesign Brief

## Why v2 exists

v1 recolored the app (OKLCH tokens, terracotta unification) but **kept the exact same
structure**: every region is still a rounded glassy card, and secondary text is still
low-contrast white-alpha. The owner's verdict: "you just changed the CSS, you committed
to the same structure." v2 fixes the *structure* and the *contrast*, not the hue.

**Thesis:** Go genuinely minimalist. Strip card chrome, rebuild hierarchy with space +
type + hairlines, and raise every text/icon to a contrast that passes WCAG AA. The result
should feel like a quiet, sharp tool (Linear/Things), not a glassmorphism showcase.

This is a VISUAL + STRUCTURE pass. **No logic, hooks, services, data model, routing, or
feature changes.** className / inline-style / JSX *layout* structure / CSS only. Every
event handler, hook, effect, and import stays byte-identical.

Keep **terracotta** (`--color-accent`) as the single accent. Do NOT introduce a new hue.

---

## The design references are the authority

Read these before deciding anything (they live in the repo):
`repositories for design/repositories collection/impeccable/.agents/skills/impeccable/reference/`
→ `distill.md`, `quieter.md`, `layout.md`, `typography.md`, `color-and-contrast.md`, `cognitive-load.md`, `polish.md`

The four principles that drive this pass:
- **distill / layout:** "Cards aren't needed for basic layout; use spacing and alignment.
  Never nest cards in cards. Remove unnecessary containers." This app boxes everything — undo that.
- **quieter:** quiet ≠ grayscale. Keep ONE warm anchor per view; let neutrals carry the rest.
- **color-and-contrast:** body text ≥ 4.5:1, UI/large text ≥ 3:1. White-alpha (`text-white/40`)
  fails this — replace with real tokens at passing lightness.
- **typography:** 5 sizes, strong contrast between them. Kill the muddy 14/15/16 cluster.

---

## 1. `src/index.css` — do this first

### 1a. Fix contrast (raise the text ramp)
The current secondary/tertiary tokens are too dark on the near-black bg. Raise them:
```css
--text-primary:   oklch(96% 0.004 25);   /* was 94% */
--text-secondary: oklch(74% 0.006 25);   /* was 62% — now ~4.5:1 on surface-bg */
--text-tertiary:  oklch(60% 0.005 25);   /* was 42% — now ~3:1, usable for labels/icons */
```
Light theme: keep primary dark; nudge secondary/tertiary so both pass 4.5:1 / 3:1 on the paper bg.

### 1b. Flatten the surface system
- Reduce global radius: anywhere `rounded-2xl` (16px) is used as a *panel/card* container,
  step it to `rounded-xl` (12px). Keep pills/avatars round. Consistency over variety.
- `.glass-panel`: this should stop reading as a "card." Make it nearly invisible —
  `background: transparent; border: none;` and rely on spacing + a single hairline
  divider where grouping is genuinely needed. Where a surface IS needed (modals, the
  floating bar, dropdowns), keep `--surface-1` + `--border`. Add a `.surface` utility class
  for those few real surfaces so intent is explicit.
- `.glass-panel-subtle`: → transparent, no border.
- Add a hairline divider utility: `.divider { border-top: 1px solid var(--border-subtle); }`

### 1c. Typography scale (enforce, don't half-apply)
Lock to: `text-[11px]` (caps labels) · `text-[13px]` (secondary) · `text-[15px]` (body) ·
`text-xl` 20px (section/subhead) · `text-3xl` 28px (page/hero). Remap stray `text-base`
(16) / `text-sm` body to `text-[15px]`, stray `text-xs` UI to `text-[13px]`. Headings get
more weight/size contrast vs body — that's where hierarchy now comes from, since cards are gone.

---

## 2. Dashboard de-carding (highest priority — first screen)

### `src/components/StatsCards.jsx`
Today: three boxed glass cards with icon-chips. **Replace with ONE airy inline metric strip,
no card backgrounds, no icon chips.** Three metrics (Streak / Today / Total) laid out in a
row, separated by generous space or thin vertical hairlines. Each metric = big tabular number
(`text-3xl font-bold text-[var(--text-primary)] tabular-nums`) above a small caps label
(`text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]`). Drop the `w-10 h-10
rounded-full bg-white/5` icon circles entirely; if an icon stays, it sits inline at
`text-[var(--text-tertiary)]` — EXCEPT keep ONE accent anchor: the Streak flame in
`text-accent` (the single warm point quieter.md asks for). No `stats-card`/`glass-panel`
classes on the wrapper.

### `src/components/TopicList.jsx`
- Rows should not look boxed. Separate topics with a hairline divider (`border-b
  border-[var(--border-subtle)]`), not a filled card each. Tighten vertical padding for a
  denser, list-like feel.
- Keep the checkbox, name, weight badge, timer, delete affordances and ALL their handlers.
  Just reduce the chrome: lighter row backgrounds (transparent default, `--surface-1` only
  on hover), smaller radius.
- Replace any remaining `text-white/40|50|30` with `--text-tertiary`/`--text-secondary`.

### `src/components/HeroSection.jsx`
- Keep the progress ring (functional, distinctive). Let the section title carry real weight
  now (`text-3xl`). Remove any card background around it — it should sit directly on the page.
- Ensure the title and ring are the clear primary focus of the screen (squint test).

### `src/components/NotesSection.jsx`
- De-card: transparent textarea on the page with a hairline top divider and a quiet label,
  not a filled panel.

### `src/components/Header.jsx` & `src/components/SegmentControl.jsx`
- Header: flatten; greeting is secondary, keep it quiet. Avatar/buttons stay.
- SegmentControl: the pill bar can stay (it's a real control), but reduce its fill weight and
  match the new radius. Active tab uses `--surface-2`/`--surface-3`, not a heavy fill.

### `src/components/CountdownWidget.jsx`
- De-card to a quiet inline strip with the static accent bar. Numbers `tabular-nums`.

---

## 3. Propagate tokens everywhere (contrast sweep)

Across ALL component files, replace low-contrast white-alpha text with tokens:
- `text-white/30` → `text-[var(--text-tertiary)]`
- `text-white/40`, `text-white/50` → `text-[var(--text-secondary)]`
- `text-white/60`, `/70` → `text-[var(--text-secondary)]` (or primary if it's body text)
Leave `bg-white/5`, `border-white/10` as surface alpha for now UNLESS removing the card
entirely (then drop them). Do NOT touch the Google sign-in button gradient in SettingsModal.

Keep all modals (Settings, Performance, PlanImporter, Print, Template, Confirm) as real
`.surface` panels — they SHOULD be contained. Just apply the new radius, contrast tokens,
and typography scale to them. Don't de-card modals.

---

## What must NOT change
- Any hook/handler/effect/import/state/service/Firebase/PWA/data code.
- The progress ring SVG, the rain-noise generator, the timer logic, drag-and-drop, subtasks,
  weights, the plan importer flow, sync.
- Terracotta as the only accent. Green = success only, red = danger only.
- The `liquid-press` micro-interaction.

## Definition of done
1. `npm run build` exits clean.
2. Dashboard no longer reads as a stack of boxes — StatsCards is an inline strip, topic rows
   are divider-separated, hero sits on the page. Squint test: title + ring are clearly primary.
3. No body or label text below WCAG AA (4.5:1 body, 3:1 large/UI). Spot-check the new
   `--text-secondary`/`--text-tertiary` against `--surface-bg`.
4. One terracotta anchor remains visible per main view; the rest is calm neutral (not grayscale-dead).
5. No logic touched (diff shows only className / style / JSX-layout / CSS).
