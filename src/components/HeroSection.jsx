import { useState } from 'react'
import { Globe, BookOpen } from 'lucide-react'

const HeroSection = ({
    title,
    emoji,
    subtitle,
    completedCount,
    totalCount,
    globalCompletedCount,
    globalTotalCount,
    onTitleEdit,
    onSubtitleEdit
}) => {
    const [showGlobal, setShowGlobal] = useState(false)

    // Determine which stats to show
    const activeCompleted = showGlobal ? globalCompletedCount : completedCount
    const activeTotal = showGlobal ? globalTotalCount : totalCount

    const percentage = activeTotal > 0 ? Math.round((activeCompleted / activeTotal) * 100) : 0
    const circumference = 2 * Math.PI * 45 // radius = 45
    const offset = circumference - (circumference * percentage) / 100

    return (
        <div className="px-6 pt-5 pb-4 sm:pt-6 sm:pb-5 flex items-center justify-between no-print">
            {/* Left side - Title */}
            <div className="flex-1 min-w-0">
                <h2 className="text-3xl sm:text-[28px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                    {emoji && <span className="mr-2">{emoji}</span>}
                    <span className="inline-editable">{title}</span>
                </h2>
                <p className="text-[var(--text-tertiary)] text-[13px] mt-1">
                    <span className="inline-editable">{subtitle}</span>
                </p>
            </div>

            {/* Right side - Progress Ring */}
            <div
                className="relative flex-shrink-0 ml-4 cursor-pointer group"
                onClick={() => setShowGlobal(!showGlobal)}
                title={showGlobal ? "Showing Total Progress" : "Showing Section Progress"}
            >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {showGlobal ? 'Total' : 'Section'}
                </div>

                <svg width="80" height="80" className="sm:hidden progress-ring transform transition-transform group-hover:scale-105">
                    <circle cx="40" cy="40" r="34" fill="none" strokeWidth="5" className="progress-ring-bg" />
                    <circle cx="40" cy="40" r="34" fill="none" strokeWidth="5"
                        className={`transition-all duration-700 ease-out ${showGlobal ? 'stroke-accent' : 'progress-ring-fill'}`}
                        strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 - (2 * Math.PI * 34 * percentage) / 100}
                        strokeLinecap="round"
                    />
                </svg>
                <svg width="100" height="100" className="hidden sm:block progress-ring transform transition-transform group-hover:scale-105">
                    {/* Background ring */}
                    <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="progress-ring-bg" />
                    {/* Progress ring */}
                    <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6"
                        className={`transition-all duration-700 ease-out ${showGlobal ? 'stroke-accent' : 'progress-ring-fill'}`}
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Percentage text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-white tabular-nums">
                        {percentage}%
                    </span>
                    {showGlobal && (
                        <div className="absolute bottom-4 sm:bottom-6">
                            <Globe size={10} className="text-accent" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default HeroSection
