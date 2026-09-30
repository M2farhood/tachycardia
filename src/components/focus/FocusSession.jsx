import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Pause, Play, Square, Minimize2, Maximize, CloudRain, VolumeX, Feather,
    LifeBuoy, Check, ArrowRight, Loader2, Coffee, Heart,
} from 'lucide-react'
import { getSetting } from '../../utils/settingsDefaults'
import { useRainNoise } from './useRainNoise'

const fmt = (seconds) => {
    const s = Math.max(0, Math.round(seconds))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const stuckMessage = (err) => {
    switch (err?.code) {
        case 'AUTH_REQUIRED': return 'Sign in to ask Tachycardia for a tiny first step.'
        case 'USER_LIMIT':
        case 'BUDGET': return "Tachycardia has reached today's limit. Try again tomorrow."
        case 'NETWORK': return "Can't reach Tachycardia. Check your connection."
        default: return 'Could not get a step just now. Try again in a moment.'
    }
}

const ANSWERS = {
    yes: 'You did it. That is worth being proud of.',
    partly: 'Partly is real progress. Starting is the hard part, and you did that.',
    no: 'Starting is the hard part — those minutes count.',
}

const ghostBtn =
    'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] text-[14px] transition-colors'
const primaryBtn =
    'inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-[var(--color-accent)] text-on-accent font-semibold text-[15px] hover:opacity-90 transition-opacity'

/**
 * The full-screen session. Presentational: the app owns the timer and passes
 * the clock in. Everything shown here is scripted — the only AI call is the
 * optional "Stuck?" one, made through `onStuck`.
 */
const FocusSession = ({
    label,
    steps: initialSteps = null,
    timeLeft,
    totalSeconds,
    isRunning,
    phase = 'running',
    settings,
    onPauseResume,
    onStop,
    onMinimize,
    onParkThought,
    onStuck,
    onFinish,
    nextUp = null,
}) => {
    const reduceMotion = getSetting(settings, 'reduceMotion')
    const keepAwake = getSetting(settings, 'keepAwake')
    const bodyDouble = getSetting(settings, 'bodyDouble')
    const breakMinutes = Number(getSetting(settings, 'breakMinutes')) || 0

    const rain = useRainNoise()

    // The clock the app passes can shrink `totalSeconds` when paused, so keep the
    // largest value seen as the "full" length for the drain and the minutes count.
    const seen = Math.max(totalSeconds || 0, timeLeft || 0, 1)
    const [full, setFull] = useState(seen)
    if (seen > full) setFull(seen)
    const minutesCounted = Math.max(1, Math.round(full / 60))
    const remaining = phase === 'done' ? 0 : Math.max(0, timeLeft || 0)
    const fraction = Math.min(1, remaining / Math.max(full, seen))

    // ---- steps ----
    const [steps, setSteps] = useState(initialSteps && initialSteps.length ? initialSteps : null)
    const [stepIdx, setStepIdx] = useState(0)
    const currentStep = steps ? steps[stepIdx] : null
    const allStepsDone = steps && stepIdx >= steps.length

    // ---- stuck ----
    const [stuckBusy, setStuckBusy] = useState(false)
    const [stuckError, setStuckError] = useState('')
    const handleStuck = async () => {
        if (!onStuck || stuckBusy) return
        setStuckBusy(true)
        setStuckError('')
        try {
            const next = await onStuck()
            if (Array.isArray(next) && next.length) {
                setSteps(next)
                setStepIdx(0)
            } else {
                setStuckError('No new step this time. Try again in a moment.')
            }
        } catch (err) {
            setStuckError(stuckMessage(err))
        } finally {
            setStuckBusy(false)
        }
    }

    // ---- park a thought ----
    const [parkOpen, setParkOpen] = useState(false)
    const [parkText, setParkText] = useState('')
    const [parked, setParked] = useState(false)
    const parkTimer = useRef(null)
    useEffect(() => () => clearTimeout(parkTimer.current), [])
    const submitPark = (e) => {
        e.preventDefault()
        const text = parkText.trim()
        if (!text) return
        onParkThought?.(text)
        setParkText('')
        setParkOpen(false)
        setParked(true)
        clearTimeout(parkTimer.current)
        parkTimer.current = setTimeout(() => setParked(false), 2500)
    }

    // ---- stop (inline confirm) ----
    const [confirmStop, setConfirmStop] = useState(false)

    // ---- body double ----
    const [goalStage, setGoalStage] = useState(bodyDouble ? 'ask' : 'off') // 'ask' | 'set' | 'off'
    const [goal, setGoal] = useState('')
    const [halfDismissed, setHalfDismissed] = useState(false)
    const [answer, setAnswer] = useState(null) // 'yes' | 'partly' | 'no'
    const goalText = goal.trim() || label || 'this'
    const showHalfway =
        bodyDouble && goalStage !== 'ask' && phase === 'running' && !halfDismissed &&
        remaining > 0 && remaining <= full / 2 && remaining < full

    // ---- wake lock ----
    const wakeRef = useRef(null)
    const releaseWake = useCallback(() => {
        try { wakeRef.current?.release?.() } catch { /* already released */ }
        wakeRef.current = null
    }, [])
    useEffect(() => {
        if (!keepAwake || !isRunning || phase !== 'running' || !('wakeLock' in navigator)) return undefined
        let cancelled = false
        const acquire = async () => {
            try {
                const lock = await navigator.wakeLock.request('screen')
                if (cancelled) { lock.release?.(); return }
                wakeRef.current = lock
            } catch { /* not allowed (low battery, background) — fine */ }
        }
        acquire()
        const onVis = () => { if (document.visibilityState === 'visible' && !wakeRef.current) acquire() }
        document.addEventListener('visibilitychange', onVis)
        return () => {
            cancelled = true
            document.removeEventListener('visibilitychange', onVis)
            releaseWake()
        }
    }, [keepAwake, isRunning, phase, releaseWake])

    // ---- fullscreen ----
    const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled
    const [isFull, setIsFull] = useState(false)
    useEffect(() => {
        const onChange = () => setIsFull(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', onChange)
        return () => {
            document.removeEventListener('fullscreenchange', onChange)
            if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
        }
    }, [])
    const toggleFullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
        else document.documentElement.requestFullscreen?.().catch(() => {})
    }

    // ---- break (local, not recorded) ----
    const [breakEndsAt, setBreakEndsAt] = useState(null)
    const [breakLeft, setBreakLeft] = useState(0)
    useEffect(() => {
        if (phase !== 'done' || breakMinutes <= 0) return undefined
        const end = Date.now() + breakMinutes * 60000
        setBreakEndsAt(end)
        setBreakLeft(breakMinutes * 60)
        const id = setInterval(() => {
            const left = Math.max(0, Math.ceil((end - Date.now()) / 1000))
            setBreakLeft(left)
            if (left <= 0) clearInterval(id)
        }, 1000)
        return () => clearInterval(id)
    }, [phase, breakMinutes])
    const breakOver = breakEndsAt !== null && breakLeft <= 0

    const drainStyle = {
        height: `${fraction * 100}%`,
        transition: reduceMotion ? 'none' : 'height 1s linear',
    }

    return (
        <div
            className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[var(--surface-bg)] text-[var(--text-primary)]"
            role="dialog"
            aria-label="Focus session"
        >
            {/* Draining tint */}
            {phase === 'running' && (
                <div
                    className="absolute inset-x-0 bottom-0 bg-[var(--color-accent-glow)] pointer-events-none"
                    style={drainStyle}
                    aria-hidden="true"
                />
            )}

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between gap-2 px-3 pt-3 sm:px-6 sm:pt-5">
                <button
                    type="button"
                    onClick={rain.toggle}
                    className={`${ghostBtn} !px-3`}
                    aria-pressed={rain.isPlaying}
                    aria-label="Rain sound"
                    title="Rain sound"
                >
                    {rain.isPlaying ? <CloudRain size={18} className="text-accent" /> : <VolumeX size={18} />}
                </button>
                <div className="flex items-center gap-2">
                    {canFullscreen && (
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className={`${ghostBtn} !px-3`}
                            aria-label={isFull ? 'Leave full screen' : 'Enter full screen'}
                            title={isFull ? 'Leave full screen' : 'Enter full screen'}
                        >
                            <Maximize size={18} />
                        </button>
                    )}
                    {phase === 'running' && (
                        <button
                            type="button"
                            onClick={onMinimize}
                            className={ghostBtn}
                            aria-label="Minimise to the small timer"
                        >
                            <Minimize2 size={18} />
                            <span className="hidden sm:inline">Minimise</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="relative z-10 flex-1 overflow-y-auto">
                <div className="min-h-full flex flex-col items-center justify-center gap-6 px-5 py-6 max-w-2xl mx-auto w-full text-center">
                    {phase === 'running' && goalStage === 'ask' && (
                        <GoalAsk
                            onSubmit={(text) => { setGoal(text); setGoalStage('set') }}
                            onSkip={() => setGoalStage('set')}
                        />
                    )}

                    {phase === 'running' && goalStage !== 'ask' && (
                        <>
                            {label && (
                                <p className="text-[15px] sm:text-lg text-[var(--text-secondary)] break-words max-w-full">
                                    {label}
                                </p>
                            )}

                            <div
                                className="font-bold tabular-nums leading-none tracking-tight"
                                style={{ fontSize: 'clamp(4.5rem, min(27vw, 26vh), 13rem)' }}
                                aria-live="off"
                            >
                                {fmt(remaining)}
                            </div>

                            {!isRunning && (
                                <p className="text-[13px] uppercase tracking-widest text-[var(--text-tertiary)]">Paused</p>
                            )}

                            {showHalfway && (
                                <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[14px] text-[var(--text-secondary)] text-left">
                                    <p>
                                        Halfway. Still on “{goalText}”? Keep going — or park what’s pulling you away.
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <button type="button" className={ghostBtn} onClick={() => setHalfDismissed(true)}>
                                            Keep going
                                        </button>
                                        <button
                                            type="button"
                                            className={ghostBtn}
                                            onClick={() => { setHalfDismissed(true); setParkOpen(true) }}
                                        >
                                            Park a thought
                                        </button>
                                    </div>
                                </div>
                            )}

                            {steps && (
                                <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-5">
                                    {allStepsDone ? (
                                        <p className="text-lg font-medium">All steps done. Keep the momentum going.</p>
                                    ) : (
                                        <>
                                            <p className="text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
                                                Right now{steps.length > 1 ? ` · step ${stepIdx + 1} of ${steps.length}` : ''}
                                            </p>
                                            <p className="text-xl sm:text-2xl font-semibold leading-snug break-words">
                                                {currentStep}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setStepIdx((i) => i + 1)}
                                                className={`${primaryBtn} mt-4`}
                                            >
                                                {stepIdx + 1 < steps.length ? 'Done — next step' : 'Done'}
                                                <ArrowRight size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Controls */}
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={onPauseResume}
                                    className={primaryBtn}
                                    aria-label={isRunning ? 'Pause' : 'Resume'}
                                >
                                    {isRunning ? <Pause size={20} /> : <Play size={20} />}
                                    {isRunning ? 'Pause' : 'Resume'}
                                </button>
                                {!confirmStop && (
                                    <button type="button" onClick={() => setConfirmStop(true)} className={ghostBtn}>
                                        <Square size={16} />
                                        Stop
                                    </button>
                                )}
                            </div>

                            {confirmStop && (
                                <div className="flex flex-wrap items-center justify-center gap-2 text-[14px]" role="alert">
                                    <span className="text-[var(--text-secondary)]">End this session?</span>
                                    <button
                                        type="button"
                                        onClick={onStop}
                                        className="min-h-11 px-4 rounded-xl bg-[var(--color-danger)] text-on-accent font-medium"
                                    >
                                        End it
                                    </button>
                                    <button type="button" onClick={() => setConfirmStop(false)} className={ghostBtn}>
                                        Keep going
                                    </button>
                                </div>
                            )}

                            {/* Park + stuck */}
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {!parkOpen && (
                                    <button type="button" onClick={() => setParkOpen(true)} className={ghostBtn}>
                                        <Feather size={16} />
                                        Park a thought
                                    </button>
                                )}
                                {onStuck && (
                                    <button type="button" onClick={handleStuck} disabled={stuckBusy} className={`${ghostBtn} disabled:opacity-60`}>
                                        {stuckBusy ? <Loader2 size={16} className="animate-spin" /> : <LifeBuoy size={16} />}
                                        Stuck?
                                    </button>
                                )}
                            </div>

                            {parkOpen && (
                                <form onSubmit={submitPark} className="flex w-full gap-2">
                                    <input
                                        autoFocus
                                        value={parkText}
                                        onChange={(e) => setParkText(e.target.value)}
                                        placeholder="What’s on your mind? One line."
                                        maxLength={200}
                                        className="flex-1 min-w-0 min-h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                                    />
                                    <button type="submit" disabled={!parkText.trim()} className={`${primaryBtn} !px-4 disabled:opacity-40`}>
                                        Park
                                    </button>
                                </form>
                            )}
                            {parked && (
                                <p className="text-[13px] text-[var(--text-tertiary)]" role="status">Parked for later.</p>
                            )}
                            {stuckError && (
                                <p className="text-[13px] text-[var(--color-danger)]" role="alert">{stuckError}</p>
                            )}
                        </>
                    )}

                    {phase === 'done' && (
                        <>
                            <div className="w-14 h-14 rounded-full bg-[var(--color-success)] text-on-accent flex items-center justify-center">
                                <Check size={28} />
                            </div>
                            <div>
                                <h2 className="text-3xl sm:text-4xl font-bold">Nice work.</h2>
                                <p className="mt-2 text-[var(--text-secondary)]">
                                    {minutesCounted} minute{minutesCounted === 1 ? '' : 's'} counted{label ? ` on “${label}”` : ''}.
                                </p>
                            </div>

                            {bodyDouble && (
                                <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4">
                                    {answer ? (
                                        <p className="text-[15px] text-[var(--text-primary)] flex items-start gap-2 justify-center">
                                            <Heart size={16} className="text-accent mt-1 shrink-0" />
                                            <span>{ANSWERS[answer]}</span>
                                        </p>
                                    ) : (
                                        <>
                                            <p className="text-[15px] mb-3">Did you get there?</p>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                <button type="button" className={ghostBtn} onClick={() => setAnswer('yes')}>Yes</button>
                                                <button type="button" className={ghostBtn} onClick={() => setAnswer('partly')}>Partly</button>
                                                <button type="button" className={ghostBtn} onClick={() => setAnswer('no')}>Not really</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {breakMinutes > 0 && breakEndsAt !== null && (
                                <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-5">
                                    <p className="text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1 flex items-center justify-center gap-1.5">
                                        <Coffee size={14} />
                                        {breakOver ? 'Break is over' : 'Break'}
                                    </p>
                                    <p className="text-5xl font-bold tabular-nums">{fmt(breakLeft)}</p>
                                    <p className="mt-2 text-[13px] text-[var(--text-tertiary)]">
                                        Stand up, drink some water, look away from the screen.
                                    </p>
                                </div>
                            )}

                            {nextUp && (
                                <p className="text-[14px] text-[var(--text-secondary)] break-words max-w-full">
                                    Next up: <span className="text-[var(--text-primary)] font-medium">{nextUp}</span>
                                </p>
                            )}

                            <button type="button" onClick={onFinish} className={primaryBtn}>
                                {breakMinutes > 0 && !breakOver ? 'Skip the break' : nextUp ? 'Continue' : 'Done'}
                                <ArrowRight size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

const GoalAsk = ({ onSubmit, onSkip }) => {
    const [text, setText] = useState('')
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); onSubmit(text) }}
            className="w-full flex flex-col gap-4 items-stretch"
        >
            <h2 className="text-2xl sm:text-3xl font-bold">What does done look like for this session?</h2>
            <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={160}
                placeholder="Optional — one line"
                className="min-h-12 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <div className="flex justify-center gap-3">
                <button type="submit" className={primaryBtn}>Start</button>
                <button type="button" onClick={onSkip} className={ghostBtn}>Skip</button>
            </div>
        </form>
    )
}

export default FocusSession
