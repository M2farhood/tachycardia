import { Play, Pause, X } from 'lucide-react'

const FloatingTimer = ({
    isActive,
    isRunning,
    formattedTime,
    currentTopicName,
    timeProgress = 0, // 0 to 1
    onPauseResume,
    onReset,
    onStart
}) => {
    if (!isActive) {
        return (
            <div className="fixed bottom-6 left-6 z-40 no-print">
                <button
                    onClick={onStart}
                    className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
                    title="Start Study Session"
                >
                    <Play size={20} className="text-white ml-0.5" />
                </button>
            </div>
        )
    }

    return (
        <div className="fixed bottom-6 left-4 right-4 z-40 no-print" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="floating-bar rounded-2xl overflow-hidden animate-slide-up max-w-lg mx-auto">
                {/* Progress track — replaces water fill */}
                <div
                    className="absolute top-0 left-0 h-[2px] bg-accent transition-all duration-1000 ease-out rounded-full"
                    style={{ width: `${Math.max(timeProgress * 100, 1)}%` }}
                />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <button
                            onClick={onReset}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                        >
                            <X size={18} className="text-white/50" />
                        </button>
                        <div className="min-w-0">
                            <p className="text-white/60 text-xs">
                                {isRunning ? 'Studying' : 'Paused'}
                            </p>
                            <p className="text-white font-semibold text-base sm:text-lg tracking-tight truncate">
                                {currentTopicName || 'Study Session'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                        <span className="text-white font-bold text-xl sm:text-2xl tabular-nums">
                            {formattedTime}
                        </span>
                        <button
                            onClick={onPauseResume}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all liquid-press ${isRunning
                                ? 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]'
                                : 'bg-accent hover:opacity-90'
                                }`}
                        >
                            {isRunning ? (
                                <Pause size={20} className="text-white" />
                            ) : (
                                <Play size={20} className="text-white ml-0.5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FloatingTimer
