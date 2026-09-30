import { Play, Pause, X } from 'lucide-react'

// Animated ring drawn around the play/pause button
const ProgressRing = ({ progress, isRunning }) => {
    const r = 27
    const circumference = 2 * Math.PI * r
    const offset = circumference * (1 - Math.min(Math.max(progress, 0), 1))

    return (
        <svg
            width="58" height="58"
            viewBox="0 0 58 58"
            className="absolute inset-0 -m-[5px] pointer-events-none"
            style={{ transform: 'rotate(-90deg)' }}
        >
            {/* Track */}
            <circle cx="29" cy="29" r={r} fill="none" strokeWidth="2.5"
                stroke="currentColor" className="text-[var(--border)]" />
            {/* Progress arc */}
            <circle
                cx="29" cy="29" r={r} fill="none" strokeWidth="2.5"
                stroke="currentColor"
                className={isRunning ? 'text-accent' : 'text-[var(--text-tertiary)]'}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, color 0.3s ease' }}
            />
        </svg>
    )
}

const FloatingTimer = ({
    isActive,
    isRunning,
    formattedTime,
    currentTopicName,
    timeProgress = 0,
    onPauseResume,
    onReset,
    onStart,
    onExpand
}) => {
    if (!isActive) {
        return (
            <div className="fixed bottom-6 left-6 z-40 no-print">
                <button
                    onClick={onStart}
                    className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
                    title="Start Study Session"
                >
                    <Play size={20} className="text-on-accent ml-0.5" />
                </button>
            </div>
        )
    }

    return (
        <div className="fixed bottom-6 left-4 right-4 z-40 no-print" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="floating-bar rounded-2xl overflow-hidden animate-slide-up max-w-lg mx-auto">
                {/* Thin top progress track */}
                <div
                    className="absolute top-0 left-0 h-[2px] bg-accent transition-all duration-1000 ease-out rounded-full"
                    style={{ width: `${Math.max(timeProgress * 100, 1)}%` }}
                />

                <div className="relative z-10 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4">
                    {/* Left: reset + topic name. Tapping the name area reopens the full-screen session. */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <button
                            onClick={onReset}
                            aria-label="End session"
                            className="p-2 rounded-full hover:bg-[var(--surface-2)] transition-colors flex-shrink-0"
                        >
                            <X size={18} className="text-[var(--text-tertiary)]" />
                        </button>
                        <div
                            className={`min-w-0 ${onExpand ? 'cursor-pointer' : ''}`}
                            onClick={onExpand}
                            role={onExpand ? 'button' : undefined}
                            aria-label={onExpand ? 'Open full-screen session' : undefined}
                            tabIndex={onExpand ? 0 : undefined}
                            onKeyDown={onExpand ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand() } } : undefined}
                        >
                            <p className="text-[var(--text-tertiary)] text-[11px] uppercase tracking-wide">
                                {isRunning ? 'Studying' : 'Paused'}
                            </p>
                            <p className="text-[var(--text-primary)] font-semibold text-[15px] sm:text-lg tracking-tight truncate">
                                {currentTopicName || 'Study Session'}
                            </p>
                        </div>
                    </div>

                    {/* Right: time + animated play/pause button */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                        <span
                            className={`text-[var(--text-primary)] font-bold text-xl sm:text-2xl tabular-nums ${onExpand ? 'cursor-pointer' : ''}`}
                            onClick={onExpand}
                        >
                            {formattedTime}
                        </span>

                        {/* Button wrapped with the progress ring */}
                        <div className="relative w-12 h-12 flex-shrink-0">
                            <button
                                onClick={onPauseResume}
                                aria-label={isRunning ? 'Pause' : 'Resume'}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all liquid-press ${
                                    isRunning
                                        ? 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]'
                                        : 'bg-accent hover:opacity-90'
                                }`}
                            >
                                {isRunning
                                    ? <Pause size={20} className="text-[var(--text-primary)]" />
                                    : <Play  size={20} className="text-on-accent ml-0.5" />
                                }
                            </button>
                            <ProgressRing progress={timeProgress} isRunning={isRunning} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FloatingTimer
