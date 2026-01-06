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
        ${isRunning
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-300'
                    : 'bg-slate-100 border-b border-slate-200'
                }
      `}
        >
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-2 rounded-lg ${isRunning ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                        <Clock size={20} className={isRunning ? 'animate-pulse-soft' : ''} />
                    </div>

                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                            {isRunning ? 'Currently Studying' : 'Timer Paused'}
                        </p>
                        <p className="font-semibold text-slate-800 truncate text-lg">
                            {currentTopicName}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                            {currentTabTitle}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`
            text-3xl md:text-4xl font-mono font-bold tabular-nums
            ${isRunning ? 'text-amber-700' : 'text-slate-600'}
          `}>
                        {formattedTime}
                    </span>

                    <button
                        onClick={onPauseResume}
                        className={`
              p-2.5 rounded-lg transition-all touch-target
              ${isRunning
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200'
                                : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            }
            `}
                        title={isRunning ? 'Pause' : 'Resume'}
                    >
                        {isRunning ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    <button
                        onClick={onReset}
                        className="p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors touch-target"
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
