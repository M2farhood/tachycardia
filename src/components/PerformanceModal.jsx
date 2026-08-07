import { X, Check, Circle, Clock, Calendar } from 'lucide-react'

const buildHeatMap = (studyDates) => {
    const studied = new Set(studyDates)
    const today = new Date()
    const todayKey = today.toISOString().split('T')[0]

    // Start from the Sunday 11 full weeks ago
    const start = new Date(today)
    start.setDate(start.getDate() - start.getDay() - 77)

    const weeks = []
    let week = []
    const d = new Date(start)

    for (let i = 0; i < 84; i++) {
        const key = d.toISOString().split('T')[0]
        week.push({ key, studied: studied.has(key), isToday: key === todayKey, isFuture: d > today })
        if (week.length === 7) { weeks.push(week); week = [] }
        d.setDate(d.getDate() + 1)
    }
    if (week.length) weeks.push(week)
    return weeks
}

const PerformanceModal = ({ isOpen, onClose, tabs, todayMinutes = 0, totalMinutes = 0, studyDates = [] }) => {
    if (!isOpen) return null

    const heatMap = buildHeatMap(studyDates)
    const studiedTotal = studyDates.length

    // Calculate stats
    let totalTopics = 0
    let completedTopics = 0

    tabs.forEach(tab => {
        totalTopics += tab.topics.length
        completedTopics += tab.topics.filter(t => t.completed).length
    })

    const overallPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

    // Format time
    const formatTime = (mins) => {
        const hours = Math.floor(mins / 60)
        const m = mins % 60
        if (hours > 0) return `${hours}h ${m}m`
        return `${m} min`
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onClick={onClose}
        >
            <div
                className="surface rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Performance</h2>
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{completedTopics}/{totalTopics} topics completed</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--surface-2)] rounded-full transition-colors"
                    >
                        <X size={18} className="text-[var(--text-tertiary)]" />
                    </button>
                </div>

                {/* Stats Row */}
                <div className="p-5 grid grid-cols-3 gap-3 border-b border-[var(--border-subtle)]">
                    {/* Total Time (All Time) */}
                    <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center">
                        <Calendar size={18} className="text-accent mx-auto mb-2" />
                        <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{formatTime(totalMinutes)}</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider mt-1">Total</p>
                    </div>

                    {/* Today */}
                    <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center">
                        <Clock size={18} className="text-accent mx-auto mb-2" />
                        <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{formatTime(todayMinutes)}</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider mt-1">Today</p>
                    </div>

                    {/* Completion */}
                    <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center">
                        <div className="w-5 h-5 rounded-full bg-[var(--color-success)]/20 mx-auto mb-2 flex items-center justify-center">
                            <Check size={12} className="text-[var(--color-success)]" />
                        </div>
                        <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{overallPercent}%</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider mt-1">Done</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 py-3 border-b border-[var(--border-subtle)]">
                    <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${overallPercent}%` }}
                        />
                    </div>
                </div>

                {/* Study Heat Map */}
                <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Study Activity</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{studiedTotal} days studied</span>
                    </div>
                    <div className="flex gap-[3px]">
                        {heatMap.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-[3px]">
                                {week.map((day) => (
                                    <div
                                        key={day.key}
                                        title={day.key}
                                        className="w-[11px] h-[11px] rounded-[2px] transition-colors"
                                        style={{
                                            backgroundColor: day.isFuture
                                                ? 'transparent'
                                                : day.studied
                                                    ? 'var(--color-accent)'
                                                    : 'var(--surface-3)',
                                            opacity: day.isFuture ? 0 : 1,
                                            outline: day.isToday ? '1.5px solid var(--color-accent)' : 'none',
                                            outlineOffset: '1px',
                                        }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* All Topics List */}
                <div className="p-5 overflow-y-auto max-h-[40vh]">
                    {tabs.map(tab => {
                        const tabCompleted = tab.topics.filter(t => t.completed).length
                        const tabTotal = tab.topics.length

                        return (
                            <div key={tab.id} className="mb-5 last:mb-0">
                                {/* Section Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                        {tab.title}
                                    </h3>
                                    <span className="text-[11px] text-[var(--text-tertiary)]">{tabCompleted}/{tabTotal}</span>
                                </div>

                                {/* Topics */}
                                <div className="space-y-1">
                                    {tab.topics.map(topic => (
                                        <div
                                            key={topic.id}
                                            className={`flex items-center gap-3 py-2 px-3 rounded-lg ${topic.completed ? 'bg-[var(--color-success)]/10' : 'bg-[var(--surface-1)]'
                                                }`}
                                        >
                                            {topic.completed ? (
                                                <div className="w-5 h-5 rounded-full bg-[var(--color-success)] flex items-center justify-center flex-shrink-0">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            ) : (
                                                <Circle size={20} className="text-[var(--text-tertiary)] flex-shrink-0" />
                                            )}
                                            <span className={`text-[13px] flex-1 ${topic.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'
                                                }`}>
                                                {topic.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default PerformanceModal
