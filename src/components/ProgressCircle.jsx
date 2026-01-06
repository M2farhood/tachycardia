const ProgressCircle = ({ completed, total, size = 64 }) => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (circumference * percentage) / 100

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
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
                        className="text-slate-200"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-indigo-500 progress-circle"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute text-sm font-black text-slate-700">
                    {percentage}%
                </span>
            </div>

            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Progress
                </p>
                <p className="text-sm font-semibold text-slate-600">
                    {completed} / {total} completed
                </p>
            </div>
        </div>
    )
}

export default ProgressCircle
