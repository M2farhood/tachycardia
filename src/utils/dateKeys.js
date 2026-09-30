/**
 * Local-calendar date keys ('YYYY-MM-DD') — the key format of data.calendar,
 * data.blocks, studyDates and timeLog.
 *
 * Never build a key with `toISOString()`: it converts to UTC first, so in
 * Iraq (UTC+3) local midnight becomes the PREVIOUS day and the web filed
 * everything one day early — while the phone app (components/calendar/
 * dateUtils.js there) already used local fields. Both apps must agree.
 */

const pad2 = (n) => String(n).padStart(2, '0')

export const localDateKey = (date = new Date()) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

/** Parse a key as LOCAL midnight (a bare 'YYYY-MM-DD' would parse as UTC). */
export const parseLocalDateKey = (key) => new Date(`${key}T00:00:00`)

export const addDays = (date, n) => {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d
}
