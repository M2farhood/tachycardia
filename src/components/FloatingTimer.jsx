import { useState, useRef } from 'react'
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
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 no-print">
                <button
                    onClick={onStart}
                    className="floating-bar px-8 py-4 rounded-full liquid-press flex items-center gap-3 animate-fade-in"
                >
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center glow-blue">
                        <Play size={18} className="text-white ml-0.5" />
                    </div>
                    <span className="text-white font-medium">Start Study Session</span>
                </button>
            </div>
        )
    }

    return (
        <div className="fixed bottom-6 left-4 right-4 z-40 no-print">
            <div className="floating-bar rounded-2xl overflow-hidden animate-slide-up max-w-lg mx-auto">
                {/* Water fill background */}
                <div
                    className="absolute inset-0 water-fill-bg transition-all duration-1000 ease-out"
                    style={{
                        height: `${Math.max(timeProgress * 100, 5)}%`,
                        bottom: 0,
                        top: 'auto'
                    }}
                />

                {/* Wave animation overlay */}
                <div
                    className="absolute left-0 right-0 wave-container"
                    style={{
                        bottom: `${Math.max(timeProgress * 100 - 5, 0)}%`
                    }}
                >
                    <div className="wave wave1"></div>
                    <div className="wave wave2"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onReset}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={18} className="text-white/50" />
                        </button>
                        <div>
                            <p className="text-white/60 text-xs">
                                {isRunning ? 'Studying' : 'Paused'}
                            </p>
                            <p className="text-white font-semibold text-lg tracking-tight">
                                {currentTopicName || 'Study Session'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-white font-bold text-2xl tabular-nums">
                            {formattedTime}
                        </span>
                        <button
                            onClick={onPauseResume}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all liquid-press ${isRunning
                                    ? 'bg-white/20 hover:bg-white/30'
                                    : 'bg-blue-500 glow-blue hover:bg-blue-600'
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
