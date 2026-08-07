import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

const MAX_DAYS = 120

// Urgency color based on days remaining
const urgencyColor = (days) =>
    days <= 7  ? 'var(--color-danger)' :
    days <= 30 ? '#f59e0b'             :
                 'var(--color-accent)'

// One time unit: number with roll animation + thin live bar beneath
function Unit({ value, max, label, color, barTransition }) {
    const pct = Math.min(value / max, 1) * 100

    return (
        <div className="flex flex-col items-center gap-1 min-w-[32px]">
            {/* Digit — remounts on change → triggers roll animation */}
            <span
                key={value}
                className="animate-count-roll text-[15px] font-bold text-[var(--text-primary)] tabular-nums leading-none"
            >
                {String(value).padStart(label === 'Days' ? 1 : 2, '0')}
            </span>

            {/* Thin live bar */}
            <div className="w-full h-[3px] rounded-full bg-[var(--surface-3)] overflow-hidden">
                <div
                    className="h-full rounded-full"
                    style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        transition: barTransition,
                    }}
                />
            </div>

            <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide leading-none">
                {label}
            </span>
        </div>
    )
}

const CountdownWidget = ({ targetDate, title = 'Exam', isEnabled }) => {
    const [timeLeft, setTimeLeft] = useState(null)

    useEffect(() => {
        if (!isEnabled || !targetDate) { setTimeLeft(null); return }

        const calc = () => {
            const diff = +new Date(targetDate) - +new Date()
            if (diff <= 0) return null
            return {
                days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((diff / 1000 / 60) % 60),
                seconds: Math.floor((diff / 1000) % 60),
            }
        }

        setTimeLeft(calc())
        const id = setInterval(() => setTimeLeft(calc()), 1000)
        return () => clearInterval(id)
    }, [targetDate, isEnabled])

    if (!isEnabled || !timeLeft) return null

    const accent = urgencyColor(timeLeft.days)
    const urgent = timeLeft.days <= 7

    return (
        <div className="relative animate-fade-in group border-t border-[var(--border-subtle)]">
            <div className="px-0 py-3 flex items-center gap-4">

                {/* Label + clock icon */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Clock size={12} style={{ color: accent }}
                        className={urgent ? 'animate-pulse' : ''} />
                    <span
                        className={`text-[11px] font-medium uppercase tracking-wider transition-colors
                            ${urgent ? '' : 'text-[var(--text-tertiary)] group-hover:text-[var(--color-accent)]'}`}
                        style={{ color: urgent ? accent : undefined }}
                    >
                        {title}
                    </span>
                </div>

                <div className="h-6 w-px bg-[var(--border-subtle)]" />

                {/* Four live units */}
                <div className="flex items-start gap-3">
                    <Unit value={timeLeft.days}    max={MAX_DAYS} label="Days" color={accent}                   barTransition="width 1s ease, background-color 1s ease" />
                    <Unit value={timeLeft.hours}   max={24}       label="Hrs"  color="var(--color-accent)"       barTransition="width 1s ease" />
                    <Unit value={timeLeft.minutes} max={60}       label="Mins" color="var(--color-accent)"       barTransition="width 1s ease" />
                    <Unit value={timeLeft.seconds} max={60}       label="Secs" color="var(--color-accent)"       barTransition="width 0.95s linear" />
                </div>
            </div>

            {/* Bottom urgency line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] rounded-full transition-colors duration-1000"
                style={{ backgroundColor: accent, opacity: 0.25 }} />
        </div>
    )
}

export default CountdownWidget
