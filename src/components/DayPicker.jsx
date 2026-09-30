import { localDateKey, addDays } from '../utils/dateKeys'

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Seven small day circles — today and the six days after it. Picking one
 * gives the new task a day (Topic.dueDate), which also puts it on that day in
 * the calendar. Tap the chosen day again to clear it.
 */
const DayPicker = ({ value = null, onChange, days = 7 }) => {
    const today = new Date()
    const items = Array.from({ length: days }, (_, i) => {
        const d = addDays(today, i)
        return { key: localDateKey(d), short: SHORT[d.getDay()], num: d.getDate(), isToday: i === 0 }
    })

    return (
        <div className="flex items-start justify-between sm:justify-start gap-1 sm:gap-2 py-3 overflow-x-auto" role="radiogroup" aria-label="Plan it for a day (optional)" style={{ scrollbarWidth: 'none' }}>
            {items.map(({ key, short, num, isToday }) => {
                const on = value === key
                return (
                    <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={`${isToday ? 'Today, ' : ''}${short} ${num}`}
                        onClick={() => onChange(on ? null : key)}
                        className="flex flex-col items-center gap-1 flex-shrink-0 group"
                    >
                        <span
                            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-[11px] sm:text-[13px] font-semibold transition-colors ${on
                                ? 'bg-[var(--color-accent)] text-[var(--on-accent)]'
                                : isToday
                                    ? 'bg-[var(--surface-2)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                        >
                            {short}
                        </span>
                        <span className={`text-[11px] tabular-nums ${on ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--text-tertiary)]'}`}>
                            {isToday ? 'Today' : num}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

export default DayPicker
