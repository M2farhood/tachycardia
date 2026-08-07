import { useState, useEffect } from 'react'
import { getInitialState } from '@study/core'

const TemplateModal = ({ onSelect, onClose }) => {
    const [phase, setPhase] = useState(0) // 0=icon, 1=title, 2=tagline, 3=button

    useEffect(() => {
        const timings = [300, 700, 1100]
        const timers = timings.map((delay, i) =>
            setTimeout(() => setPhase(i + 1), delay)
        )
        return () => timers.forEach(clearTimeout)
    }, [])

    const handleStart = () => {
        const initialState = getInitialState('blank')
        onSelect(initialState)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop animate-fade-in">
            <div className="flex flex-col items-center gap-7 text-center px-8">

                {/* Icon */}
                <div
                    style={{
                        animation: 'scale-in 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
                        fontSize: '3.5rem',
                        lineHeight: 1,
                    }}
                >
                    📚
                </div>

                {/* App name */}
                <div
                    style={{
                        animation: phase >= 1
                            ? 'intro-fade 0.5s ease-out both'
                            : 'none',
                        opacity: phase >= 1 ? undefined : 0,
                    }}
                >
                    <h1 className="text-[2rem] font-bold tracking-tight text-[var(--text-primary)] leading-none">
                        Study Tracker
                    </h1>
                </div>

                {/* Tagline */}
                <div
                    style={{
                        animation: phase >= 2
                            ? 'intro-fade 0.5s ease-out both'
                            : 'none',
                        opacity: phase >= 2 ? undefined : 0,
                    }}
                >
                    <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed max-w-[22ch]">
                        Track your progress,<br />one topic at a time.
                    </p>
                </div>

                {/* Get Started button */}
                <div
                    style={{
                        animation: phase >= 3
                            ? 'intro-fade 0.45s ease-out both'
                            : 'none',
                        opacity: phase >= 3 ? undefined : 0,
                        pointerEvents: phase >= 3 ? 'auto' : 'none',
                    }}
                >
                    <button
                        onClick={handleStart}
                        className="mt-1 px-8 py-3 rounded-full bg-accent text-white font-semibold text-[15px] tracking-wide hover:opacity-90 active:scale-95 transition-all liquid-press"
                    >
                        Get Started
                    </button>
                </div>

            </div>
        </div>
    )
}

export default TemplateModal
