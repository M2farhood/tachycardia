import { Flame } from 'lucide-react'

const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

const StatsCards = ({
    studyStreak = 0,
    todayMinutes = 0,
    totalMinutes = 0
}) => {
    const timeDisplay = formatDuration(todayMinutes)
    const totalDisplay = formatDuration(totalMinutes)

    return (
        <div className="px-6 pb-4 no-print">
            {/* Inline metric strip — no card backgrounds, no icon chips */}
            <div className="flex items-start gap-0 border-t border-[var(--border-subtle)]">
                {/* Streak */}
                <div className="flex-1 pt-4 pb-3 pr-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] mb-1 flex items-center gap-1.5">
                        <Flame size={12} className="text-[var(--color-accent)]" />
                        Streak
                    </p>
                    <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums leading-none">
                        {studyStreak}
                        <span className="text-[13px] font-medium text-[var(--text-tertiary)] ml-1.5">days</span>
                    </p>
                </div>

                {/* Vertical hairline */}
                <div className="w-px self-stretch mt-4 bg-[var(--border-subtle)]" />

                {/* Today */}
                <div className="flex-1 pt-4 pb-3 px-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                        Today
                    </p>
                    <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums leading-none">
                        {timeDisplay}
                    </p>
                </div>

                {/* Vertical hairline */}
                <div className="w-px self-stretch mt-4 bg-[var(--border-subtle)]" />

                {/* Total */}
                <div className="flex-1 pt-4 pb-3 pl-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                        Total
                    </p>
                    <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums leading-none">
                        {totalDisplay}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default StatsCards
