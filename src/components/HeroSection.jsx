import { useState } from 'react'

const R = 16
const CIRC = 2 * Math.PI * R

const HeroSection = ({
    completedCount = 0,
    totalCount = 0,
    globalCompletedCount = 0,
    globalTotalCount = 0
}) => {
    const [showGlobal, setShowGlobal] = useState(false)

    const done = showGlobal ? globalCompletedCount : completedCount
    const total = showGlobal ? globalTotalCount : totalCount
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0
    const offset = CIRC - (CIRC * percentage) / 100

    return (
        <div className="px-6 pt-4 pb-3 no-print">
            <button
                onClick={() => setShowGlobal(v => !v)}
                className="flex items-center gap-3 text-left min-h-[44px]"
                title={showGlobal ? 'Showing all sections. Tap for this section' : 'Showing this section. Tap for all sections'}
                aria-label={`${done} of ${total} done, ${showGlobal ? 'all sections' : 'this section'}. Tap to switch.`}
            >
                <span className="relative w-10 h-10 flex-shrink-0">
                    <svg width="40" height="40" viewBox="0 0 40 40" className="progress-ring">
                        <circle cx="20" cy="20" r={R} fill="none" strokeWidth="3" className="progress-ring-bg" />
                        <circle
                            cx="20" cy="20" r={R} fill="none" strokeWidth="3"
                            className={`transition-all duration-700 ease-out ${showGlobal ? 'stroke-accent' : 'progress-ring-fill'}`}
                            strokeDasharray={CIRC} strokeDashoffset={offset}
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[var(--text-primary)] tabular-nums">
                        {percentage}%
                    </span>
                </span>
                <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-[var(--text-primary)] tabular-nums">
                        {done} of {total} done
                    </span>
                    <span className="block text-[10px] font-medium uppercase tracking-widest text-[var(--text-tertiary)]">
                        {showGlobal ? 'All sections' : 'This section'}
                    </span>
                </span>
            </button>
        </div>
    )
}

export default HeroSection
