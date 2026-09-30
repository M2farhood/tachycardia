import { useState } from 'react'

/**
 * The section band — the progress measure lives IN the section's title.
 *
 * A full-width band carrying the section name; it fills left-to-right as
 * tasks get done (DESIGN.md: "the one bold thing"). Tap it to switch between
 * this section and all sections. It replaced both the small ring and the
 * right-hand ring column, which the owner rejected for wasting half the screen.
 */
const HeroSection = ({
    title = '',
    completedCount = 0,
    totalCount = 0,
    globalCompletedCount = 0,
    globalTotalCount = 0,
}) => {
    const [showGlobal, setShowGlobal] = useState(false)

    const done = showGlobal ? globalCompletedCount : completedCount
    const total = showGlobal ? globalTotalCount : totalCount
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0
    const name = showGlobal ? 'All lists' : title

    return (
        <div className="px-6 pt-4 pb-5 no-print">
            <button
                onClick={() => setShowGlobal(v => !v)}
                title={showGlobal ? 'Showing all lists. Tap for this list' : 'Showing this list. Tap for all lists'}
                aria-label={`${name}: ${done} of ${total} done, ${percentage} percent. Tap to switch.`}
                className="section-band relative w-full overflow-hidden rounded-2xl bg-[var(--surface-2)] text-left"
            >
                {/* The fill — soft tint with a solid leading edge */}
                <span
                    aria-hidden="true"
                    className="section-band-fill absolute inset-y-0 left-0"
                    style={{ width: `${percentage}%` }}
                />
                <span className="relative flex items-center justify-between gap-4 px-5 sm:px-7 py-5 sm:py-6">
                    <span className="min-w-0">
                        <span className="block truncate text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                            {name}
                        </span>
                        <span className="block mt-1 text-[13px] sm:text-[14px] text-[var(--text-secondary)] tabular-nums">
                            {total === 0 ? 'No tasks yet' : `${done} of ${total} done`}
                        </span>
                    </span>
                    <span className="flex-shrink-0 text-4xl sm:text-5xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                        {percentage}%
                    </span>
                </span>
            </button>
        </div>
    )
}

export default HeroSection
