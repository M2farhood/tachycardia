/**
 * Defaults for the optional settings (Settings → Advanced).
 * --------------------------------------------------------------------------
 * TWIN FILE. Web `src/utils/settingsDefaults.js` ⇄ mobile
 * `src/data/settingsDefaults.js`, byte-identical (DATA-CONTRACT.md).
 *
 * None of these are written into a fresh document and none needs a migration:
 * `settings` is merged as one object (syncMerge), so a key one app doesn't
 * know simply rides along untouched. The rule that keeps that safe: every
 * reader goes through `getSetting`, so a missing key means "the default",
 * never `undefined`.
 */

export const SETTINGS_DEFAULTS = {
    // Already in the schema — listed so getSetting covers them too.
    timerDuration: 25,
    isMuted: false,
    spacedRepetition: false,

    // Advanced options (added 2026-09-30).
    dailyGoalMinutes: 0, // 0 = off
    breakMinutes: 5, // 0 = no break screen after a session
    keepAwake: true,
    hideCompleted: false,
    carryOverTasks: true, // show unfinished past calendar items on today (display only)
    weekStart: 'sat', // 'sat' | 'sun' | 'mon'
    aiEnabled: true,
    bodyDouble: false, // Focus-mode check-ins
    reduceMotion: false,
    sessionSound: 'chime', // 'chime' | 'soft' | 'silent'
    listSuggestions: ['Work', 'Study', 'Personal', 'Home'], // quick names on "Start your first list" (added 2026-09-30)
}

export const MAX_LIST_SUGGESTIONS = 8

export const WEEK_START_OFFSETS = { sat: 6, sun: 0, mon: 1 } // JS getDay() of the first column

export function getSetting(settings, key) {
    const value = settings?.[key]
    return value === undefined || value === null ? SETTINGS_DEFAULTS[key] : value
}

/** The owner's quick list names — trimmed, de-duplicated, capped. Never throws on odd stored values. */
export function getListSuggestions(settings) {
    const raw = getSetting(settings, 'listSuggestions')
    const seen = new Set()
    return (Array.isArray(raw) ? raw : [])
        .map((s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 40))
        .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
        .slice(0, MAX_LIST_SUGGESTIONS)
}
