import { useState } from 'react'

/**
 * Progress for the current section (tap to switch to all sections).
 *
 * Two layouts, one component:
 *  - `row`  (phones/tablets): "3 of 10 done" on the left, a LARGE ring on the
 *    right — the owner asked for the big ring back after it was shrunk.
 *  - `rail` (desktop right column): a very large centred ring with the count
 *    under it, so wide screens aren't left empty.
 */
const Ring = ({ size, stroke, percentage, showGlobal }) => {
    const r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    const offset = circ - (circ * percentage) / 100
    return (
        <span className="relative inline-block flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="progress-ring-bg" />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
                    className={`transition-all duration-700 ease-out ${showGlobal ? 'stroke-accent' : 'progress-ring-fill'}`}
                    strokeDasharray={circ} strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <span
                className="absolute inset-0 flex items-center justify-center font-bold text-[var(--text-primary)] tabular-nums"
                style={{ fontSize: Math.round(size * 0.22) }}
            >
                {percentage}%
            </span>
        </span>
    )
}

const HeroSection = ({
    completedCount = 0,
    totalCount = 0,
    globalCompletedCount = 0,
    globalTotalCount = 0,
    layout = 'row'
}) => {
    const [showGlobal, setShowGlobal] = useState(false)

    const done = showGlobal ? globalCompletedCount : completedCount
    const total = showGlobal ? globalTotalCount : totalCount
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0
    const scope = showGlobal ? 'All sections' : 'This section'
    const common = {
        onClick: () => setShowGlobal(v => !v),
        title: showGlobal ? 'Showing all sections. Tap for this section' : 'Showing this section. Tap for all sections',
        'aria-label': `${done} of ${total} done, ${scope.toLowerCase()}. Tap to switch.`,
    }

    if (layout === 'rail') {
        return (
            <button {...common} className="w-full flex flex-col items-center gap-4 py-2 group no-print">
                <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--text-tertiary)]">{scope}</span>
                <span className="transition-transform group-hover:scale-[1.02]">
                    <Ring size={208} stroke={12} percentage={percentage} showGlobal={showGlobal} />
                </span>
                <span className="text-[17px] font-medium text-[var(--text-primary)] tabular-nums">
                    {done} of {total} done
                </span>
            </button>
        )
    }

    return (
        <div className="px-6 pt-4 pb-3 no-print">
            <button {...common} className="w-full flex items-center justify-between gap-4 text-left">
                <span className="min-w-0">
                    <span className="block text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                        {done} of {total} done
                    </span>
                    <span className="block mt-1 text-[11px] font-medium uppercase tracking-widest text-[var(--text-tertiary)]">
                        {scope} · tap to switch
                    </span>
                </span>
                <Ring size={88} stroke={7} percentage={percentage} showGlobal={showGlobal} />
            </button>
        </div>
    )
}

export default HeroSection
