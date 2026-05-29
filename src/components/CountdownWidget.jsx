import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

const CountdownWidget = ({ targetDate, title = 'Exam', isEnabled }) => {
    const [timeLeft, setTimeLeft] = useState(null)

    useEffect(() => {
        if (!isEnabled || !targetDate) {
            setTimeLeft(null)
            return
        }

        const calculateTimeLeft = () => {
            const difference = +new Date(targetDate) - +new Date()

            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                }
            }
            return null // Time passed
        }

        // Initial calculation
        setTimeLeft(calculateTimeLeft())

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000) // Update every second

        return () => clearInterval(timer)
    }, [targetDate, isEnabled])

    if (!isEnabled || !timeLeft) return null

    return (
        <div className="relative overflow-hidden animate-fade-in group border-t border-[var(--border-subtle)]">
            <div className="px-0 py-2.5 flex items-center gap-3 relative z-10">
                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-[11px] font-medium uppercase tracking-wider">
                    <Clock size={13} className="text-[var(--color-accent)]" />
                    <span className="group-hover:text-[var(--color-accent)] transition-colors">{title}</span>
                </div>

                <div className="h-4 w-px bg-[var(--border-subtle)]" />

                <div className="flex items-baseline gap-3">
                    <div className="flex flex-col items-center leading-none">
                        <span className="text-[15px] font-bold text-[var(--text-primary)] tabular-nums">{timeLeft.days}</span>
                        <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">Days</span>
                    </div>
                    <div className="w-px h-5 bg-[var(--border-subtle)]" />
                    <div className="flex flex-col items-center leading-none">
                        <span className="text-[15px] font-bold text-[var(--text-primary)] tabular-nums">{timeLeft.hours}</span>
                        <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">Hrs</span>
                    </div>
                    <div className="w-px h-5 bg-[var(--border-subtle)]" />
                    <div className="flex flex-col items-center leading-none">
                        <span className="text-[15px] font-bold text-[var(--text-primary)] tabular-nums">{timeLeft.minutes}</span>
                        <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">Mins</span>
                    </div>
                    <div className="w-px h-5 bg-[var(--border-subtle)]" />
                    <div className="flex flex-col items-center leading-none">
                        <span className="text-[15px] font-bold text-accent tabular-nums min-w-[20px] text-center">
                            {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">Secs</span>
                    </div>
                </div>
            </div>

            {/* Static accent bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-accent opacity-20" />
        </div>
    )
}

export default CountdownWidget
