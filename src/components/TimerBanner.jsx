import { Clock, Pause, Play, X } from 'lucide-react'

const TimerBanner = ({
    isRunning,
    formattedTime,
    currentTopicName,
    currentTabTitle,
    onPauseResume,
    onReset
}) => {
    if (!isRunning && formattedTime === '0:00') return null

    return (
        <div
            className={`
        sticky top-0 z-20 no-print
        bg-[var(--surface-1)] border-b ${isRunning ? 'border-[var(--color-accent)]' : 'border-[var(--border)]'}
      `}
        >
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-2 rounded-lg ${isRunning ? 'bg-[var(--color-accent-dim)] text-accent' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>
                        <Clock size={20} className={isRunning ? 'animate-pulse-soft' : ''} />
                    </div>

                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-medium">
                            {isRunning ? 'Currently Studying' : 'Timer Paused'}
                        </p>
                        <p className="font-semibold text-[var(--text-primary)] truncate text-lg">
                            {currentTopicName}
                        </p>
                        <p className="text-sm text-[var(--text-tertiary)] truncate">
                            {currentTabTitle}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`
            text-3xl md:text-4xl font-mono font-bold tabular-nums
            ${isRunning ? 'text-accent' : 'text-[var(--text-secondary)]'}
          `}>
                        {formattedTime}
                    </span>

                    <button
                        onClick={onPauseResume}
                        className={`
              p-2.5 rounded-lg transition-all touch-target
              bg-accent hover:opacity-90 text-on-accent
            `}
                        title={isRunning ? 'Pause' : 'Resume'}
                    >
                        {isRunning ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    <button
                        onClick={onReset}
                        className="p-2.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] rounded-lg transition-colors touch-target"
                        title="Cancel Timer"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TimerBanner
