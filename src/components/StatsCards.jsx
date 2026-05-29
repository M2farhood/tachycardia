import { Flame, Clock, Hourglass } from 'lucide-react'

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
        <div className="px-6 pb-6 grid grid-cols-2 gap-4 no-print">
            {/* Streak Card */}
            <div className="stats-card glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 mb-3">
                    <Flame size={20} className="text-orange-400" />
                </div>
                <p className="text-sm font-medium uppercase tracking-wider text-white/40 mb-1">
                    Streak
                </p>
                <p className="text-3xl font-bold text-white">
                    {studyStreak} <span className="text-xl font-medium text-white/50">Days</span>
                </p>
            </div>

            {/* Today's Study Time Card */}
            <div className="stats-card glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 mb-3">
                    <Clock size={20} className="text-accent" />
                </div>
                <p className="text-sm font-medium uppercase tracking-wider text-white/40 mb-1">
                    Today
                </p>
                <p className="text-3xl font-bold text-white">
                    {timeDisplay}
                </p>
            </div>

            {/* All-time Study Time Card (spans full width) */}
            <div className="stats-card glass-panel rounded-2xl p-5 col-span-2 flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 shrink-0">
                    <Hourglass size={20} className="text-white/60" />
                </div>
                <div className="flex items-baseline justify-between flex-1">
                    <p className="text-sm font-medium uppercase tracking-wider text-white/40">
                        Total Studied
                    </p>
                    <p className="text-2xl font-bold text-white">
                        {totalDisplay}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default StatsCards
