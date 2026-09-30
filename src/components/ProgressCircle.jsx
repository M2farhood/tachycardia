const ProgressCircle = ({ completed, total, size = 64 }) => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (circumference * percentage) / 100

    return (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg className="w-full h-full transform -rotate-90">
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-[var(--surface-3)]"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-accent progress-circle"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute text-base font-bold text-[var(--text-primary)]">
                    {percentage}%
                </span>
            </div>

            <div>
                <p className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    Progress
                </p>
                <p className="text-base font-semibold text-[var(--text-secondary)]">
                    {completed} / {total} completed
                </p>
            </div>
        </div>
    )
}

export default ProgressCircle
