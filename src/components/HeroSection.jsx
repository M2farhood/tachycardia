const HeroSection = ({
    title,
    emoji,
    subtitle,
    completedCount,
    totalCount,
    onTitleEdit,
    onSubtitleEdit
}) => {
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const circumference = 2 * Math.PI * 45 // radius = 45
    const offset = circumference - (circumference * percentage) / 100

    return (
        <div className="px-6 py-6 flex items-center justify-between no-print">
            {/* Left side - Title */}
            <div className="flex-1 min-w-0">
                <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">
                    {emoji && <span className="mr-2">{emoji}</span>}
                    <span className="inline-editable">{title}</span>
                </h2>
                <p className="text-white/40 text-sm mt-1">
                    <span className="inline-editable">{subtitle}</span>
                </p>
            </div>

            {/* Right side - Progress Ring */}
            <div className="relative flex-shrink-0 ml-4">
                <svg width="100" height="100" className="progress-ring">
                    {/* Background ring */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        strokeWidth="6"
                        className="progress-ring-bg"
                    />
                    {/* Progress ring */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        strokeWidth="6"
                        className="progress-ring-fill"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                {/* Percentage text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{percentage}%</span>
                </div>
            </div>
        </div>
    )
}

export default HeroSection
