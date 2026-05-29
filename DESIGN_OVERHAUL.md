# Design Overhaul Plan — Study Tracker

---

## Agent Discipline Protocol

**Read this entire section before opening a single source file.**

This document is a contract. Every instruction in it was written after a full audit of the codebase and a deep read of the design reference repositories. Your job is execution — not interpretation, not improvement, not creative detours.

### Mandatory Pre-Work

Before writing a single line of code, read all of these files in full. They are the authority for every design decision in this plan. If a decision in this plan seems wrong to you, the answer is in one of these files — not your training data.

```
repositories for design/repositories collection/impeccable/.agents/skills/impeccable/reference/distill.md
repositories for design/repositories collection/impeccable/.agents/skills/impeccable/reference/quieter.md
repositories for design/repositories collection/impeccable/.agents/skills/impeccable/reference/color-and-contrast.md
repositories for design/repositories collection/impeccable/.agents/skills/impeccable/reference/typography.md
repositories for design/repositories collection/impeccable/.agents/skills/impeccable/reference/layout.md
repositories for design/repositories collection/impeccable/.agents/skills/impeccable/reference/polish.md
repositories for design/repositories collection/impeccable/.agents/skills/impeccable/reference/cognitive-load.md
repositories for design/repositories collection/impeccable/.agents/skills/impeccable/reference/interaction-design.md
repositories for design/repositories collection/design-motion-principles/skills/design-motion-principles/references/motion-cookbook.md
```

Also read the full codebase report before touching anything:
```
.claude/projects/-Users-farhood-Desktop-codes-study-tracker/memory/codebase_report.md
```

### Working Rules

**One file at a time.** Complete a file fully, run `npm run dev`, open the browser, and verify it looks correct before moving to the next file. Never batch multiple files in one pass and verify at the end — regressions compound silently.

**Follow the execution order.** The 11 files are numbered for a reason. `index.css` must come first because every other file depends on its tokens. Do not reorder.

**No improvisation.** If something in the plan says "replace X with Y," do exactly that. Do not substitute a different Y because you think it looks better. The plan was derived from the design references — trust it. If you genuinely believe the plan has an error, stop and flag it rather than silently diverging.

**No scope creep.** You are not here to refactor components, fix bugs, add features, improve accessibility beyond what the plan specifies, or clean up code you happen to notice. Every change you make must trace back to a line in this plan. Anything else is out of scope.

**No logic changes.** If a file has both visual and logical code, touch only the visual parts (className strings, inline styles, JSX structure for purely decorative elements). Leave all event handlers, state, hooks, effects, and data flow untouched.

**The dev server is your ground truth.** After each file, look at the actual app in a browser. Screenshots are acceptable if a browser is not available. Do not trust that a change is correct just because the code looks right — CSS and Tailwind have many ways to silently fail.

### Quality Bar

Every change you ship must pass the **squint test**: blur your metaphorical eyes at the screen. Can you still identify the most important element, the secondary elements, and the clear groupings? If everything still blurs together, hierarchy has not been achieved — keep working.

Apply the **cognitive load checklist** from `cognitive-load.md` to each screen after changes:
- Single focus: can the user complete their task without distraction?
- Visual hierarchy: is it immediately clear what matters most?
- Minimal choices: are there ≤4 visible actions at any decision point?
- Visual noise floor: do elements have clear weight differences?

A screen that passes functional verification but fails 2+ cognitive load items is not done.

### When to Stop and Ask

Stop and ask the user if you encounter any of the following — do not guess or proceed:

- A component that is not covered by the plan but clearly needs updating to match the new token system
- A case where following the plan literally would break a functional behavior
- A Tailwind class that does not have an obvious equivalent in the new token system
- Any change that would require modifying hook logic, state, or service files

### Anti-Patterns to Refuse

These are things the design references explicitly call out as wrong. If you find yourself about to do any of these — stop:

- Adding `backdrop-filter: blur()` to any element that is not the floating timer bar
- Using `rgba()` for surface backgrounds (use explicit OKLCH tokens instead)
- Introducing a new accent color that is not terracotta (the only exception: green for success states, red for destructive actions)
- Nesting a card inside a card
- Adding decorative animations (motion must serve a UX purpose — entrance, state change, or feedback)
- Hard-coding spacing values outside Tailwind's scale
- Using `blue-500`, `pink-`, `rose-`, or `purple-` color classes anywhere (these are being removed from the system)
- Removing focus-visible indicators (accessibility is not negotiable)
- Setting `animation-duration` to `0` without a `prefers-reduced-motion` guard

### Definition of Done

The overhaul is complete when:

1. Every file in the execution order has been processed
2. `npm run build` exits with zero errors
3. The browser verification checklist at the bottom of this document passes fully
4. No `rgba()` surface colors remain in any component file
5. No `blue-500` / `pink-` / `rose-` / `purple-` color classes remain (except Google sign-in button)
6. The floating timer shows a progress track, not water fill waves
7. The Tachycardia tab matches the terracotta system, not pink/rose
8. Every interactive element still works: timer, AI chat, calendar, drag-drop, Firebase sync, subtasks, weights, plan importer, print, export/import

---

## Goal & Direction

**Goal:** Keep all functionality exactly as-is. Reduce visual noise, unify the color system, and make the app feel like a refined dark tool rather than a loud glassmorphism showcase.

**Direction:** "Refined Dark Tool" — Linear meets medical focus app. One accent color (terracotta), three surface levels, motion only where it earns its place.

**Do NOT change:** Any logic, hooks, services, Firebase, AI integration, PWA config, or data model. This is purely a visual/CSS/JSX-template overhaul.

---

## Repositories for Reference

All design principles are in:
```
repositories for design/repositories collection/
  impeccable/             — distill, quieter, layout, typography, color, motion, interaction, polish
  design-motion-principles/ — motion cookbook, easing, animation recipes
  anthropic-frontend-design/ — frontend design skill
```

Key files to read before starting:
- `impeccable/.agents/skills/impeccable/reference/distill.md`
- `impeccable/.agents/skills/impeccable/reference/quieter.md`
- `impeccable/.agents/skills/impeccable/reference/color-and-contrast.md`
- `impeccable/.agents/skills/impeccable/reference/typography.md`
- `impeccable/.agents/skills/impeccable/reference/layout.md`
- `design-motion-principles/skills/design-motion-principles/references/motion-cookbook.md`

---

## The Core Problems Being Fixed

1. **Alpha is a design smell.** The entire visual system is `rgba()` transparency soup. Replace with explicit OKLCH surface tokens.
2. **Six competing accent colors.** Terracotta, blue, orange, pink, purple, green all fight for attention. Unify to one accent (terracotta) + semantic-only colors (green for success, red for danger only).
3. **Glassmorphism on everything.** `backdrop-filter: blur(20px)` on every panel kills hierarchy. Reserve it only for the one element that truly floats over content (the floating timer bar).
4. **Decorative animations taxing attention.** Water fill waves, burn bar, pulse-glow, pulse-slow, flame-flicker don't serve UX. Remove them.
5. **Typography has no system.** Ten font sizes with no mathematical relationship. Reduce to five.
6. **Blue inconsistency.** FloatingTimer inactive state, settings active buttons, and several modal CTAs use `blue-500`. The accent is terracotta. Unify.

---

## New Design Token Foundation

Replace the entire token block in `src/index.css` `:root` with:

```css
:root {
  /* Surfaces — OKLCH warm-tinted dark scale */
  --surface-bg:   oklch(13% 0.012 25);   /* page background */
  --surface-1:    oklch(17% 0.010 25);   /* panels, cards */
  --surface-2:    oklch(21% 0.008 25);   /* inputs, hover states */
  --surface-3:    oklch(27% 0.006 25);   /* active, pressed, dropdowns */
  --border:       oklch(27% 0.006 25);   /* single border token */
  --border-subtle: oklch(21% 0.008 25);  /* very subtle dividers */

  /* Text */
  --text-primary:   oklch(94% 0.004 25);
  --text-secondary: oklch(62% 0.006 25);
  --text-tertiary:  oklch(42% 0.005 25);

  /* Accent — terracotta, kept as-is */
  --color-accent:     oklch(62% 0.12 35);   /* ≈ #D96B4E */
  --color-accent-dim: oklch(62% 0.06 35);   /* muted for backgrounds */
  --color-accent-glow: oklch(62% 0.12 35 / 0.25);

  /* Semantic — only used for their specific meaning */
  --color-success: oklch(60% 0.14 150);  /* green — completed states only */
  --color-danger:  oklch(58% 0.18 25);   /* red — destructive actions only */

  /* Legacy aliases — keep these so no component breaks */
  --color-bg-start: var(--surface-bg);
  --color-bg-mid:   var(--surface-bg);
  --color-bg-end:   var(--surface-bg);
  --color-glass:        var(--surface-1);
  --color-glass-border: var(--border);
  --color-glass-hover:  var(--surface-2);
  --color-text-primary:   var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary:  var(--text-tertiary);
  --color-divider: var(--border-subtle);
}
```

---

## File-by-File Changes

### 1. `src/index.css` — Foundation (do this first)

**Surfaces & tokens:**
- Apply the new token block above.
- Body `background` → `var(--surface-bg)` (solid, no gradient). The gradient was hiding the surface system problem.
- `.app-container` stays at `max-width: 720px`.

**`.glass-panel`:**
```css
.glass-panel {
  background: var(--surface-1);
  border: 1px solid var(--border);
  box-shadow: 0 1px 3px oklch(0% 0 0 / 0.3);
  /* REMOVE: backdrop-filter, -webkit-backdrop-filter, inset highlight */
}
.glass-panel-subtle {
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  /* REMOVE: backdrop-filter */
}
```

**`.floating-bar` — keep backdrop-filter here only:**
```css
.floating-bar {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: oklch(17% 0.010 25 / 0.92);
  border: 1px solid var(--border);
  box-shadow: 0 -2px 20px oklch(0% 0 0 / 0.4);
}
```

**Typography scale — replace all arbitrary sizes with this system:**
| Token | Size | Use |
|---|---|---|
| `text-[11px]` | 11px | Metadata, caps labels |
| `text-xs` (13px) | 13px | Secondary UI, badges |
| `text-sm` (15px) | 15px | Body, inputs |
| `text-xl` (20px) | 20px | Subheadings |
| `text-3xl` (28px) | 28px | Page headings |

Remove these font sizes from the CSS: `10px`, `12px`, `14px`, `16px`, `18px`. If Tailwind utilities use them, remap to the nearest scale value.

Add globally:
```css
h1, h2, h3 { text-wrap: balance; }
.tabular-nums { font-variant-numeric: tabular-nums; }
```

**Animations — REMOVE these keyframes entirely:**
- `burn` — the countdown bar animation
- `pulse-glow` — the timer button glow
- `pulse-slow` — the Focus Mode ambient background
- `flame-flicker` — unused decorative
- `reveal-width` — unused decorative

**Animations — KEEP these (they serve UX):**
- `fade-in` — element entry
- `slide-up` — modal/panel entry
- `slide-up-panel` — bottom sheet entry
- `wave` — simplify (keep for FloatingTimer if the progress track still uses a subtle animation)

**Add reduced motion wrapper around all remaining animations:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**`.custom-checkbox`:**
```css
.custom-checkbox.checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-glow);
  /* REMOVE: 0 0 12px glow — too intense */
}
```

**`.progress-ring-fill`:**
```css
.progress-ring-fill {
  stroke: var(--color-accent);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
  /* REMOVE: filter: drop-shadow glow */
}
```

**`.stats-card::before` — REMOVE the pseudo-element blob entirely:**
```css
/* Delete this entire rule */
.stats-card::before { ... }
```

**`.segment-btn.active`:**
```css
.segment-btn.active {
  background: var(--surface-3);
  color: var(--text-primary);
  /* REMOVE: hard-coded #2c2c35 */
}
```

**`.topic-item.completed .topic-name`:**
```css
.topic-item.completed .topic-name {
  color: var(--text-tertiary);
  text-decoration: line-through;
  text-decoration-color: var(--border);
  /* REMOVE: text-decoration-color: var(--color-accent-glow) — too loud */
}
```

**Calendar styles** — replace `var(--color-bg-start), var(--color-bg-mid)` references in `.calendar-header` background with `var(--surface-bg)`.

---

### 2. `src/components/FloatingTimer.jsx` — Remove water fill

**Remove entirely:**
- The `water-fill-bg` div
- The `wave-container` div with `.wave.wave1` and `.wave.wave2`
- The `water-fill-bg` and `wave-container` CSS classes (in index.css)
- The `wave` keyframe animation (in index.css)

**Replace with a simple progress track along the top of the bar:**
```jsx
{/* Progress track — replaces water fill */}
<div
  className="absolute top-0 left-0 h-[2px] bg-accent transition-all duration-1000 ease-out rounded-full"
  style={{ width: `${Math.max(timeProgress * 100, 1)}%` }}
/>
```

**Inactive state button — change from blue gradient to accent:**
```jsx
// BEFORE:
className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 ..."
// AFTER:
className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
```

**Pause/Resume button — change from `bg-blue-500` to accent:**
```jsx
// BEFORE (resume state):
className={`... ${isRunning ? 'bg-white/20' : 'bg-blue-500 glow-blue hover:bg-blue-600'}`}
// AFTER:
className={`... ${isRunning ? 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]' : 'bg-accent hover:opacity-90'}`}
```

---

### 3. `src/components/StatsCards.jsx`

**Remove the `::before` blob** — this is done in `index.css` (delete the `.stats-card::before` rule). No JSX change needed.

**Tighten the card padding and text:**
- The `text-3xl font-bold` on the stat number stays — it earns its size.
- Change `text-sm font-medium uppercase tracking-wider text-white/40` labels to use `text-[11px]` (the new scale minimum).
- The `totalMinutes` prop is accepted but never rendered. Either render it as a third card or remove the prop to reduce dead code. Recommended: add a third "Total" card using `totalMinutes` — the data exists and is useful.

---

### 4. `src/components/TachycardiaTab.jsx` — Unify to terracotta

The pink/rose palette (`from-pink-500 to-rose-500`, `text-pink-400`, `border-pink-500/20`, etc.) is completely disconnected from the rest of the app. Replace with the terracotta accent system.

**Mapping:**
| Old | New |
|---|---|
| `from-pink-500/10 to-rose-500/10` | `bg-[var(--color-accent-dim)]` |
| `border-pink-500/20` | `border-[var(--color-accent-glow)]` |
| `text-pink-400` | `text-accent` |
| `from-pink-500 to-rose-600` (avatar bg) | `bg-accent` |
| `bg-gradient-to-r from-pink-500 to-rose-500 text-white` (active button) | `bg-accent text-white` |
| Pulse blur glow div around avatar | remove — it's decorative noise |

The Tachycardia name, Heart icon, and copy stay identical — personality comes from those, not from a pink gradient system.

---

### 5. `src/components/SegmentControl.jsx`

**Calendar button active state** — currently uses `bg-[var(--color-accent)]` ✓ already correct.

**Tachycardia button** — after the color unification above, the active state becomes:
```jsx
// Active state
className="bg-accent text-white"
// Inactive state  
className="bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-3)]"
```

Remove the `absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 opacity-0 hover:opacity-20 blur-lg` glow span — pure decorative noise.

---

### 6. `src/components/SettingsModal.jsx` — Unify blue → accent

Replace all `blue-500` / `from-blue-500` / `to-blue-500` with accent equivalents:

| Location | Old | New |
|---|---|---|
| Google sign-in button | `from-blue-500/20 via-red-500/20 to-yellow-500/20` | Keep the Google colors here — it's the actual Google brand button |
| Theme toggle active | `bg-blue-500 text-white` | `bg-accent text-white` |
| Timer duration active | `bg-blue-500 text-white` | `bg-accent text-white` |
| Countdown toggle active | `bg-blue-500` (toggle pill) | `bg-accent` |
| Performance button | `from-blue-500/20 to-cyan-500/20` | `bg-[var(--surface-2)] border border-[var(--border)]` |
| Date input focus | `focus:border-blue-500` | `focus:border-[var(--color-accent)]` |

---

### 7. `src/components/CountdownWidget.jsx` — Remove `burn` animation

**Replace:**
```jsx
// REMOVE this animated div:
<div className="absolute bottom-0 ... animate-[burn_3s_ease-in-out_infinite] ..." />
<div className="absolute bottom-0 ... animate-pulse" />

// REPLACE with a static accent bar:
<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent opacity-30 rounded-full" />
```

The countdown numbers are already urgent enough. The animated fire bar is decoration competing with data.

---

### 8. `src/components/FocusMode.jsx` — Quiet the ambient effects

**Remove:**
- The `animate-pulse-slow` class from the ambient background div — a static radial gradient reads as atmosphere without motion cost.

**Simplify:**
```jsx
// BEFORE:
<div className="absolute inset-0 bg-gradient-radial from-[var(--color-accent-glow)] to-transparent opacity-30 animate-pulse-slow pointer-events-none" />

// AFTER:
<div className="absolute inset-0 bg-gradient-radial from-[var(--color-accent-glow)] to-transparent opacity-20 pointer-events-none" />
```

The rain noise, carousel, AI subtask panel, and all interactions stay unchanged.

---

### 9. `src/components/TopicList.jsx` — Minor token alignment

- **Weight badge** — replace `text-purple-300 bg-purple-500/20 border-purple-500/20` with `text-accent bg-[var(--color-accent-dim)] border-[var(--color-accent-glow)]`.
- **Subtask checkbox completed** — replace `bg-green-500 border-green-500` with `bg-[var(--color-success)] border-[var(--color-success)]` (semantic success token).
- **Drag handle** — replace `text-white/40` with `text-[var(--text-tertiary)]`.
- **Timer active button** — remove `animate-pulse-glow` class (the keyframe is being deleted). Replace the glow with a simple `ring-2 ring-accent ring-opacity-50`.

---

### 10. `src/components/HeroSection.jsx` — Minor

- Remove the `glow-blue` class reference (this utility uses the wrong color name; it actually uses `--color-accent-glow` already per index.css — verify and rename to `glow-accent` for clarity).
- The progress ring stays unchanged — it's functional and distinctive.

---

### 11. `src/components/Header.jsx` — Minor

- `glow-avatar` uses `rgba(217, 107, 78, 0.3)` — replace with `var(--color-accent-glow)` token.
- The Focus Mode button active state (`bg-accent`) is already correct.

---

## Light Theme

The light theme (`.light-theme`) overrides should follow the same pattern — replace `rgba()` values with explicit `oklch()` tokens. The paper aesthetic is good; just apply the same token discipline.

Specific light theme fixes:
- `.light-theme .glass-panel` → use `oklch(98% 0.004 25)` surface instead of `rgba(250,249,246,0.9)`
- `.light-theme .segment-btn.active` → `background: white; box-shadow: 0 1px 3px oklch(0% 0 0 / 0.12)`
- `.light-theme .floating-bar` → `background: oklch(98% 0.004 25 / 0.95)`

---

## Execution Order

Work through files in this order so each step is independently testable:

1. `src/index.css` — tokens, remove decorative keyframes, update glass-panel, stats-card, checkbox, progress ring, segment-btn
2. `src/components/FloatingTimer.jsx` — remove water fill, fix button colors
3. `src/components/SettingsModal.jsx` — unify blue → accent
4. `src/components/TachycardiaTab.jsx` — pink → terracotta
5. `src/components/SegmentControl.jsx` — remove Tachycardia glow span, fix inactive state
6. `src/components/CountdownWidget.jsx` — remove burn animation
7. `src/components/FocusMode.jsx` — remove pulse-slow
8. `src/components/TopicList.jsx` — weight badge + subtask colors
9. `src/components/StatsCards.jsx` — optionally add total time card, token cleanup
10. `src/components/Header.jsx` — minor token cleanup
11. `src/components/HeroSection.jsx` — minor cleanup

---

## Verification Checklist

After completing each file, verify in the browser (`npm run dev`):

- [ ] No `rgba()` color values remaining outside of semantic one-off cases
- [ ] No `blue-500` / `from-blue-500` remaining (except Google sign-in button)
- [ ] No `pink-` / `rose-` color classes remaining
- [ ] No `purple-` color classes remaining (weight badges now use accent-dim)
- [ ] Floating timer shows a progress track, not water fill
- [ ] Stats cards have no blob decoration
- [ ] Countdown has no animated burn bar
- [ ] Focus Mode ambient background is static
- [ ] Active timer button has a ring indicator, not a pulse-glow
- [ ] All modals open and close correctly
- [ ] Drag and drop still works
- [ ] Timer starts, pauses, resets correctly
- [ ] Tachycardia chat opens and sends messages
- [ ] Calendar renders and accepts tasks
- [ ] Light theme toggle still works
- [ ] `npm run build` produces no errors

---

## What Must NOT Change

- All hook logic (`useLocalStorage`, `useTimer`, `useAuth`, `useAIChat`, `useCalendarStorage`)
- All service files (`aiService.js`, `authService.js`, `syncService.js`)
- Firebase configuration
- PWA configuration (`vite.config.js`)
- Data model / localStorage schema
- All functional behavior — timers, AI, sync, drag-drop, subtasks, weights, calendar
- The `liquid-press` micro-interaction (scale 0.95 on active — keep it)
- The progress ring SVG in HeroSection
- The Focus Mode rain noise generator
- The plan importer flow
