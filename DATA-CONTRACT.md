# Data contract — the rules that keep two apps from destroying one document

This app and the web PWA (`../study tracker`, GitHub `M2farhood/tachycardia`)
sign in as the same Firebase user and read/write the **same Firestore
document**: `study_tracker_users/{uid}`. Local key (localStorage on web,
AsyncStorage here): `study_tracker_data`. `CURRENT_SCHEMA_VERSION = 7`.

Because the repos are separate (a settled decision), the data logic exists as
**two copies**, and copies drift. This file is the contract that keeps drift
survivable. A copy of this file belongs in the web repo too (added during
Phase 0).

---

## Twin files — byte-identical across both repos

| This repo (`src/data/`, created in Phase 1) | Source of truth (web repo) |
|---|---|
| `src/data/syncMerge.js` | `../study tracker/src/utils/syncMerge.js` (pure, 175 lines — copies as-is) |
| `src/data/migrations.js` | `../study tracker/src/utils/migrations.js` |
| `src/data/schema.js` | the data-shape part of `../study tracker/src/utils/templates.js` (`getInitialState` + entity constructors) |
| `src/data/mutations.js` | the pure mutation helpers for calendar/blocks/templates, extracted from `../study tracker/src/hooks/useLocalStorage.js` (468 lines — **extract** during Phase 0/1, don't reimplement) |
| `src/data/aiActions.js` | `../study tracker/src/utils/aiActions.js` — applies Tachycardia's proposed tool calls as ordinary stamped edits (byte-identical; added 2026-09-30) |
| `src/data/settingsDefaults.js` | `../study tracker/src/utils/settingsDefaults.js` — defaults for the optional Advanced settings (byte-identical; added 2026-09-30) |

Both repos also carry **the same invariant test file** (seeded from the
monorepo branch's `packages/core/test/schema.test.js`, 134 lines): the full
migration ladder from v0 with field-set comparison, merge symmetry,
tombstones, `timerSession` never synced, fresh-state completeness.

## The four rules

1. **Schema changes may only ever ADD.** Never rename a field, never remove
   one, never reshape one. A web deploy reaches users in seconds; an App
   Store release takes days — during that window both versions write the same
   document, and a rename destroys data written by the older one.
   (Known corollary: `CalendarTask` uses `text` while `Topic` uses `name`.
   It looks like cleanup bait. **Leave it.** The merge code never reads
   either field — it compares `updatedAt` and copies whole objects.)
2. **Change twin files in both repos in the same sitting**, then run both
   test suites plus `npm run check-twins`.
3. **Deploy web first, then mobile.** Always. The web app updates in
   seconds; the phone app takes days through review. Rule 4 makes an
   outdated phone degrade gracefully in the meantime.
4. **Future schema = read-only.** If a client sees
   `schemaVersion > CURRENT_SCHEMA_VERSION`, `migrate()` throws, the app
   shows the data read-only with an "Update the app to keep syncing" banner,
   and never writes. The Firestore rules also reject any write that lowers
   `schemaVersion`.

## The drift alarm: `check-twins`

`scripts/check-twins.sh` (wired into `npm test`): for each twin file, `diff`
this repo's copy against the web-repo path in the table above — the web path
contains a space, so it must always be quoted — and exit non-zero on any
difference.

**Honest residual risk:** the alarm only works on this machine, where both
folders sit side by side; there is no cross-repo CI. If a twin file is edited
in one repo elsewhere, drift lives until the next `check-twins` run. Rule 4
is the backstop that turns undetected drift into "sync pauses" instead of
data corruption.

## Entity shapes (v7) — the truth, do not invent fields

```js
{ version: '1.0.0', schemaVersion: 7, updatedAt: ISO,
  deleted: { id -> ISO },              // tombstones
  calendar: { 'YYYY-MM-DD': CalendarTask[] },
  blocks:   { 'YYYY-MM-DD': Block[] },
  blockTemplates: [], studyDates: ['YYYY-MM-DD'],
  timeLog:  { 'YYYY-MM-DD': seconds }, // v7 — study time; total = sum of values
  settings: {...}, tabs: [Tab], timerSession: null }
```

- `Tab`: `{id, title, emoji, subtitle, topics[], notes, updatedAt}`
- `Topic`: `{id, name, category, completed, completedAt, reviewStage,
  difficulty, weight, timeEstimate, notes, subtasks[], updatedAt}` —
  subtask field is **`name`**
- `CalendarTask`: `{id, text, completed, subtasks[], updatedAt}` — field is
  **`text`**, not `name`
- `Block`: `{id, startTime: 'HH:MM', endTime: 'HH:MM', taskIds: [topicId],
  updatedAt}`
- `timerSession`: `{tabId, topicId, startTime: Date.now(), totalSeconds,
  isRunning}` — **device-local, deliberately never synced**
- `timeLog`: `{ 'YYYY-MM-DD': seconds }` (added by migration 7). All-time total
  is the sum of the values. Merge rule: **per day, the larger value wins** —
  never summed (every synced device already holds the shared total for a day,
  so summing would double-count on every merge) and never last-write-wins (the
  device that studied less would erase the other's minutes). A day's recorded
  time can therefore only ever go up, and both devices converge.

## Optional settings (added 2026-09-30, no schema change)

`settings` is merged as one object (`syncMerge.js`), so new keys ride along
untouched on an app that doesn't know them. Every reader goes through
`getSetting(settings, key)` in `settingsDefaults.js`, so a missing key means
the default — never `undefined`. They are NOT written into a fresh document
(`getInitialState` is unchanged), so no migration and no version bump.

## Date keys are LOCAL

`calendar`, `blocks`, `studyDates` and `timeLog` are keyed by the device's
LOCAL date. Never build a key with `toISOString()` (UTC): until 2026-09-30 the
web app did, which filed items one day early east of UTC (Iraq, UTC+3). Web:
`src/utils/dateKeys.js`; phone: `components/calendar/dateUtils.js`.

## Never synced (deliberate — don't "fix")

- `timerSession` — a running timer belongs to one device
  (`syncMerge.js:168`).
- `tachycardia_chat_history` — AI chat is web-only until v1.1.
- The legacy `study_tracker_daily_time` / `study_tracker_total_time`
  localStorage keys stay device-local on web; study time syncs through the
  **additive** `timeLog: { 'YYYY-MM-DD': seconds }` field added in Phase 0.5.
