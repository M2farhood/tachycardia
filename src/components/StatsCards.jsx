import { Flame, Clock } from 'lucide-react'

const StatsCards = ({
    studyStreak = 0,
    todayMinutes = 0
}) => {
    // Format minutes into hours and minutes
    const hours = Math.floor(todayMinutes / 60)
    const mins = todayMinutes % 60
    const timeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

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
                    <Clock size={20} className="text-blue-400" />
                </div>
                <p className="text-sm font-medium uppercase tracking-wider text-white/40 mb-1">
                    Today
                </p>
                <p className="text-3xl font-bold text-white">
                    {timeDisplay}
                </p>
            </div>
        </div>
    )
}

export default StatsCards
