import { X, Check, Circle, Clock, Calendar } from 'lucide-react'

const PerformanceModal = ({ isOpen, onClose, tabs, todayMinutes = 0, totalMinutes = 0 }) => {
    if (!isOpen) return null

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
                className="glass-panel rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div>
                        <h2 className="text-lg font-bold text-white">Performance</h2>
                        <p className="text-xs text-white/40 mt-0.5">{completedTopics}/{totalTopics} topics completed</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={18} className="text-white/50" />
                    </button>
                </div>

                {/* Stats Row */}
                <div className="p-5 grid grid-cols-3 gap-3 border-b border-white/5">
                    {/* Total Time (All Time) */}
                    <div className="bg-white/5 rounded-2xl p-4 text-center">
                        <Calendar size={18} className="text-accent mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{formatTime(totalMinutes)}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Total</p>
                    </div>

                    {/* Today */}
                    <div className="bg-white/5 rounded-2xl p-4 text-center">
                        <Clock size={18} className="text-accent mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{formatTime(todayMinutes)}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Today</p>
                    </div>

                    {/* Completion */}
                    <div className="bg-white/5 rounded-2xl p-4 text-center">
                        <div className="w-5 h-5 rounded-full bg-[var(--color-success)]/20 mx-auto mb-2 flex items-center justify-center">
                            <Check size={12} className="text-[var(--color-success)]" />
                        </div>
                        <p className="text-xl font-bold text-white">{overallPercent}%</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Done</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 py-3 border-b border-white/5">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${overallPercent}%` }}
                        />
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
                                        <span>{tab.emoji || '📚'}</span>
                                        {tab.title}
                                    </h3>
                                    <span className="text-xs text-white/40">{tabCompleted}/{tabTotal}</span>
                                </div>

                                {/* Topics */}
                                <div className="space-y-1">
                                    {tab.topics.map(topic => (
                                        <div
                                            key={topic.id}
                                            className={`flex items-center gap-3 py-2 px-3 rounded-lg ${topic.completed ? 'bg-[var(--color-success)]/10' : 'bg-white/5'
                                                }`}
                                        >
                                            {topic.completed ? (
                                                <div className="w-5 h-5 rounded-full bg-[var(--color-success)] flex items-center justify-center flex-shrink-0">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            ) : (
                                                <Circle size={20} className="text-white/20 flex-shrink-0" />
                                            )}
                                            <span className={`text-sm flex-1 ${topic.completed ? 'text-white/60 line-through' : 'text-white/80'
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
