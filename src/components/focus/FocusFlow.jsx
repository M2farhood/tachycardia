import { useState, useRef, useEffect, useMemo } from 'react'
import { useAIConsent } from '../../hooks/useAIConsent'
import AIConsentCard from '../AIConsentCard'
import { X, Send, Heart, ArrowRight, Check, RefreshCw, Loader2, Plus } from 'lucide-react'
import { sendFocus, splitOptions, isAIAvailable } from '../../services/aiService'
import { normalizeCall } from '../../utils/aiActions'
import { localDateKey, addDays, parseLocalDateKey } from '../../utils/dateKeys'

const STARTERS = [
    { id: 'deadline', label: "I'm worried about a deadline" },
    { id: 'move', label: 'I just need to get moving' },
    { id: 'know', label: 'I know what to do' },
]
const MINUTE_CHOICES = [10, 15, 25]

const primaryBtn =
    'inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-[var(--color-accent)] text-on-accent font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-40'
const ghostBtn =
    'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] text-[14px] transition-colors'
const chipBtn =
    'min-h-11 px-4 py-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] text-[14px] text-left hover:border-[var(--color-accent)] transition-colors disabled:opacity-50'

const errorText = (err) => {
    switch (err?.code) {
        case 'USER_LIMIT':
        case 'BUDGET': return "Tachycardia has reached today's limit. You can still pick a task yourself."
        case 'NETWORK': return "Can't reach Tachycardia. Check your connection, or pick a task yourself."
        default: return 'Tachycardia could not answer just now. Try again, or pick a task yourself.'
    }
}

const clampMinutes = (n, fallback) => {
    const v = Math.round(Number(n))
    return Number.isFinite(v) && v > 0 ? Math.min(v, 180) : fallback
}

const dayLabel = (key, todayKey, tomorrowKey) => {
    if (key === todayKey) return 'Today'
    if (key === tomorrowKey) return 'Tomorrow'
    return parseLocalDateKey(key).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

const toApiCall = (c) => ({
    id: c.id,
    type: 'function',
    function: {
        name: c.name,
        arguments: typeof c.arguments === 'string' ? c.arguments : JSON.stringify(c.arguments ?? {}),
    },
})

/**
 * Focus mode, rebuilt around getting started: one thing on screen at a time,
 * a tiny first step, a visible plan, a time-box. Talks to Tachycardia when it
 * can; otherwise (or on request) it is a plain pick-a-task-and-go screen.
 */
const FocusFlow = ({
    data,
    currentTabId,
    settings,
    onExit,
    onStartSession,
    onApplyActions,
    onSignIn,
    isSignedIn = false,
}) => {
    const aiOn = isAIAvailable(settings)
    const [authLost, setAuthLost] = useState(false)
    const aiConsented = useAIConsent()
    // Talking to the coach sends data to the AI → one-time consent first.
    const needsConsent = aiOn && isSignedIn && !authLost && !aiConsented
    const canTalk = aiOn && isSignedIn && !authLost && aiConsented
    const [mode, setMode] = useState(canTalk ? 'talk' : 'manual')

    // ---- conversation ----
    const [apiMessages, setApiMessages] = useState([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [draft, setDraft] = useState('')
    const [card, setCard] = useState(null) // { call } — the tool call being shown
    const [pendingCalls, setPendingCalls] = useState([]) // ids still owed a tool result
    const resultsRef = useRef({}) // id -> 'applied' | 'skipped' | 'shown to the user'
    const scrollRef = useRef(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    }, [apiMessages, busy, card])

    const shown = useMemo(
        () => apiMessages.filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content)),
        [apiMessages]
    )
    const lastAssistant = shown.length && shown[shown.length - 1].role === 'assistant' ? shown[shown.length - 1] : null
    const lastOptions = lastAssistant && !card ? splitOptions(lastAssistant.content).options : []

    const run = async (messages) => {
        setBusy(true)
        setError('')
        try {
            const res = await sendFocus(messages, data)
            const calls = Array.isArray(res.toolCalls) ? res.toolCalls : []
            const assistant = { role: 'assistant', content: res.reply || '' }
            if (calls.length) assistant.tool_calls = calls.map(toApiCall)
            setApiMessages([...messages, assistant])
            if (calls.length) {
                const norm = calls.map(normalizeCall)
                const first = norm.find((c) => ['show_plan', 'give_steps', 'start_focus_session'].includes(c.name))
                calls.forEach((c) => { resultsRef.current[c.id] = first && first.id === c.id ? 'shown to the user' : 'skipped' })
                setPendingCalls(calls.map((c) => c.id))
                setCard(first ? { call: first } : null)
            }
        } catch (err) {
            if (err?.code === 'AUTH_REQUIRED') setAuthLost(true)
            setError(errorText(err))
            setApiMessages(messages)
        } finally {
            setBusy(false)
        }
    }

    const send = (text) => {
        const t = String(text || '').trim()
        if (!t || busy) return
        // Every earlier tool call must be answered before the next request.
        const toolMsgs = pendingCalls.map((id) => ({
            role: 'tool',
            tool_call_id: id,
            content: resultsRef.current[id] || 'shown to the user',
        }))
        setPendingCalls([])
        setCard(null)
        setDraft('')
        run([...apiMessages, ...toolMsgs, { role: 'user', content: t }])
    }

    const pickStarter = (s) => {
        if (s.id === 'know') { setMode('manual'); return }
        send(s.label)
    }

    const markResult = (call, text) => { resultsRef.current[call.id] = text }

    // ---- starting a session ----
    const startSession = (payload) => onStartSession?.(payload)

    // ---- manual path ----
    const tasks = useMemo(() => {
        const tabs = data?.tabs || []
        const ordered = [...tabs].sort((a, b) => (a.id === currentTabId ? -1 : b.id === currentTabId ? 1 : 0))
        return ordered.flatMap((tab) =>
            (tab.topics || []).filter((t) => !t.completed).map((t) => ({ tabId: tab.id, topicId: t.id, name: t.name, section: tab.title }))
        )
    }, [data, currentTabId])

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--surface-bg)] text-[var(--text-primary)]" role="dialog" aria-label="Focus mode">
            <div className="flex items-center justify-between gap-2 px-3 pt-3 sm:px-6 sm:pt-5">
                <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
                    <Heart size={16} className="text-accent" fill="currentColor" />
                    Focus
                </div>
                <button type="button" onClick={onExit} className={ghostBtn} aria-label="Leave focus mode">
                    <X size={18} />
                    <span className="hidden sm:inline">Leave</span>
                </button>
            </div>

            {mode === 'talk' ? (
                <div className="flex-1 min-h-0 flex flex-col max-w-2xl w-full mx-auto">
                    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-6 flex flex-col gap-4">
                        {shown.length === 0 && (
                            <div className="my-auto text-center">
                                <h1 className="text-3xl sm:text-4xl font-bold mb-2">What’s on your mind?</h1>
                                <p className="text-[var(--text-secondary)] mb-6">No pressure. We’ll find one small thing to start with.</p>
                                <div className="flex flex-col gap-2 items-stretch">
                                    {STARTERS.map((s) => (
                                        <button key={s.id} type="button" className={chipBtn} onClick={() => pickStarter(s)} disabled={busy}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {shown.map((m, i) => {
                            const isUser = m.role === 'user'
                            const text = isUser ? m.content : splitOptions(m.content).text
                            if (!text) return null
                            return (
                                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                                            isUser
                                                ? 'bg-[var(--color-accent)] text-on-accent'
                                                : 'bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)]'
                                        }`}
                                    >
                                        {text}
                                    </div>
                                </div>
                            )
                        })}

                        {busy && (
                            <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-[14px]">
                                <Loader2 size={16} className="animate-spin" /> Thinking…
                            </div>
                        )}

                        {card && !busy && (
                            <ResultCard
                                card={card}
                                data={data}
                                onApplyActions={onApplyActions}
                                markResult={markResult}
                                startSession={startSession}
                                onTalkMore={() => setCard(null)}
                            />
                        )}

                        {error && (
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[14px]" role="alert">
                                <p className="text-[var(--color-danger)]">{error}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {!authLost && (
                                        <button type="button" className={ghostBtn} onClick={() => run(apiMessages)}>
                                            <RefreshCw size={16} /> Try again
                                        </button>
                                    )}
                                    <button type="button" className={ghostBtn} onClick={() => setMode('manual')}>Pick a task myself</button>
                                </div>
                            </div>
                        )}

                        {lastOptions.length > 0 && !busy && (
                            <div className="flex flex-wrap gap-2">
                                {lastOptions.map((o) => (
                                    <button key={o} type="button" className={chipBtn} onClick={() => send(o)}>{o}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="px-4 pb-4 pt-2 sm:px-5" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                        <form onSubmit={(e) => { e.preventDefault(); send(draft) }} className="flex gap-2">
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder="Type what’s going on…"
                                disabled={busy}
                                className="flex-1 min-w-0 min-h-12 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-60"
                            />
                            <button type="submit" disabled={!draft.trim() || busy} className={`${primaryBtn} !px-4`} aria-label="Send">
                                <Send size={18} />
                            </button>
                        </form>
                        <button type="button" onClick={() => setMode('manual')} className="mt-3 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline underline-offset-2">
                            I know what to do
                        </button>
                    </div>
                </div>
            ) : (
                <ManualStart
                    tasks={tasks}
                    canTalk={canTalk}
                    needsConsent={needsConsent}
                    aiOn={aiOn}
                    signedIn={isSignedIn}
                    onSignIn={onSignIn}
                    onTalk={() => setMode('talk')}
                    onStart={startSession}
                />
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Tool-call result cards                                              */
/* ------------------------------------------------------------------ */

const SavedNote = ({ state }) => {
    if (state.status === 'saved') {
        return <p className="text-[13px] text-[var(--color-success)] flex items-center gap-1"><Check size={14} /> Saved</p>
    }
    if (state.status === 'error') return <p className="text-[13px] text-[var(--color-danger)]" role="alert">{state.error}</p>
    return null
}

const useSaver = (onApplyActions, markResult, call) => {
    const [state, setState] = useState({ status: 'idle', error: '' })
    const save = async (calls) => {
        if (!onApplyActions) return
        setState({ status: 'saving', error: '' })
        try {
            const res = await onApplyActions(calls)
            if (res?.ok === false) {
                setState({ status: 'error', error: res.error || 'Could not save that.' })
            } else {
                markResult(call, 'applied')
                setState({ status: 'saved', error: '' })
            }
        } catch (e) {
            setState({ status: 'error', error: e?.message || 'Could not save that.' })
        }
    }
    return [state, save]
}

const ResultCard = ({ card, data, onApplyActions, markResult, startSession, onTalkMore }) => {
    // The coach's words are already on screen as a bubble — the card only shows the action.
    const { call } = card
    const [state, save] = useSaver(onApplyActions, markResult, call)
    const args = call.args || {}
    const todayKey = localDateKey()
    const tomorrowKey = localDateKey(addDays(new Date(), 1))

    const wrap = (children) => (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-5 flex flex-col gap-4">
            {children}
            <button type="button" onClick={onTalkMore} className="self-start text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline underline-offset-2">
                Not quite — keep talking
            </button>
        </div>
    )

    if (call.name === 'show_plan') {
        const items = (Array.isArray(args.items) ? args.items : []).filter((it) => it && it.text && /^\d{4}-\d{2}-\d{2}$/.test(String(it.date)))
        const groups = {}
        items.forEach((it) => { (groups[it.date] ||= []).push(it) })
        const dates = Object.keys(groups).sort()
        const first = items.find((it) => it.date === todayKey) || items[0]
        const saveAll = () =>
            save(items.map((it, i) => ({
                id: `plan-${Date.now()}-${i}`,
                name: 'schedule_day_task',
                arguments: JSON.stringify({ date: it.date, text: it.text }),
            })))
        return wrap(
            <>
                <h2 className="text-2xl sm:text-3xl font-bold leading-snug break-words">{args.headline || 'Here’s a plan'}</h2>
                <div className="flex flex-col gap-4">
                    {dates.map((d) => (
                        <div key={d}>
                            <p className="text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1">{dayLabel(d, todayKey, tomorrowKey)}</p>
                            <ul className="flex flex-col gap-1.5 border-l-2 border-[var(--border)] pl-3">
                                {groups[d].map((it, i) => (
                                    <li key={i} className="text-[15px] break-words">
                                        {it.text}
                                        {it.minutes ? <span className="text-[var(--text-tertiary)]"> · {it.minutes} min</span> : null}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    {first && (
                        <button
                            type="button"
                            className={primaryBtn}
                            onClick={() => {
                                markResult(call, state.status === 'saved' ? 'applied' : 'shown to the user')
                                startSession({ tabId: null, topicId: null, minutes: clampMinutes(first.minutes, 15), label: first.text, steps: null })
                            }}
                        >
                            {first.date === todayKey ? 'Start today’s first part' : 'Start the first part'} <ArrowRight size={18} />
                        </button>
                    )}
                    {items.length > 0 && state.status !== 'saved' && (
                        <button type="button" className={ghostBtn} onClick={saveAll} disabled={state.status === 'saving'}>
                            {state.status === 'saving' ? <Loader2 size={16} className="animate-spin" /> : null}
                            Save this plan to my calendar
                        </button>
                    )}
                </div>
                <SavedNote state={state} />
            </>
        )
    }

    if (call.name === 'give_steps') {
        const steps = (Array.isArray(args.steps) ? args.steps : []).map((s) => String(s).trim()).filter(Boolean)
        const tab = (data?.tabs || []).find((t) => t.id === args.sectionId)
        const topic = tab?.topics?.find((t) => t.id === args.taskId)
        const minutes = clampMinutes(args.sprintMinutes, 10)
        return wrap(
            <>
                <p className="text-[15px] text-[var(--text-secondary)] break-words">{args.taskName || topic?.name}</p>
                <div>
                    <p className="text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1">First, just this</p>
                    <p className="text-2xl sm:text-3xl font-bold leading-snug break-words">{steps[0]}</p>
                </div>
                <button
                    type="button"
                    className={primaryBtn}
                    onClick={() => {
                        markResult(call, state.status === 'saved' ? 'applied' : 'shown to the user')
                        startSession({
                            tabId: topic ? tab.id : null,
                            topicId: topic ? topic.id : null,
                            minutes,
                            label: args.taskName || topic?.name || 'Focus session',
                            steps,
                        })
                    }}
                >
                    Start a {minutes}-minute sprint — do as much as you can <ArrowRight size={18} />
                </button>
                {topic && steps.length > 0 && state.status !== 'saved' && (
                    <button
                        type="button"
                        className="self-start text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2 min-h-8"
                        disabled={state.status === 'saving'}
                        onClick={() => save([{ id: `steps-${Date.now()}`, name: 'add_subtasks', arguments: JSON.stringify({ sectionId: tab.id, taskId: topic.id, steps }) }])}
                    >
                        Also save these steps to the task
                    </button>
                )}
                <SavedNote state={state} />
            </>
        )
    }

    // start_focus_session
    const tab = (data?.tabs || []).find((t) => t.id === args.sectionId)
    const topic = tab?.topics?.find((t) => t.id === args.taskId)
    const minutes = clampMinutes(args.minutes, 25)
    const name = topic?.name || 'this'
    return wrap(
        <>
            <h2 className="text-2xl sm:text-3xl font-bold leading-snug break-words">Start {minutes} minutes on “{name}”</h2>
            {args.firstStep && (
                <div>
                    <p className="text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1">First step</p>
                    <p className="text-lg break-words">{args.firstStep}</p>
                </div>
            )}
            <button
                type="button"
                className={primaryBtn}
                onClick={() => {
                    markResult(call, 'applied')
                    startSession({
                        tabId: topic ? tab.id : null,
                        topicId: topic ? topic.id : null,
                        minutes,
                        label: topic?.name || 'Focus session',
                        steps: args.firstStep ? [args.firstStep] : null,
                    })
                }}
            >
                Start <ArrowRight size={18} />
            </button>
        </>
    )
}

/* ------------------------------------------------------------------ */
/* Manual path: one task, one time-box                                 */
/* ------------------------------------------------------------------ */

const ManualStart = ({ tasks, canTalk, needsConsent, aiOn, signedIn, onSignIn, onTalk, onStart }) => {
    const [idx, setIdx] = useState(0)
    const [freeText, setFreeText] = useState(tasks.length === 0)
    const [typed, setTyped] = useState('')
    const [minutes, setMinutes] = useState(25)
    const [custom, setCustom] = useState('')
    const [customOn, setCustomOn] = useState(false)
    const [stepsText, setStepsText] = useState('')
    const [stepsOpen, setStepsOpen] = useState(false)

    const task = tasks.length ? tasks[idx % tasks.length] : null
    const label = freeText ? typed.trim() : task?.name || ''
    const mins = customOn ? clampMinutes(custom, 0) : minutes
    const steps = stepsText.split('\n').map((s) => s.trim()).filter(Boolean)

    const start = () => {
        if (!label || !mins) return
        onStart({
            tabId: freeText ? null : task.tabId,
            topicId: freeText ? null : task.topicId,
            minutes: mins,
            label,
            steps: steps.length ? steps : null,
        })
    }

    return (
        <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="min-h-full max-w-xl w-full mx-auto px-5 py-6 flex flex-col justify-center gap-6">
                {!canTalk && aiOn && !signedIn && (
                    <div className="flex flex-wrap items-center gap-2 text-[14px] text-[var(--text-secondary)]">
                        <span>Sign in to let Tachycardia help you plan.</span>
                        {onSignIn && <button type="button" className={ghostBtn} onClick={onSignIn}>Sign in</button>}
                    </div>
                )}
                {needsConsent && <AIConsentCard compact />}
                {canTalk && (
                    <button type="button" onClick={onTalk} className="self-start text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2">
                        Talk it through with Tachycardia instead
                    </button>
                )}

                <div>
                    <p className="text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Just one thing</p>
                    {freeText ? (
                        <input
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder="What will you work on?"
                            autoFocus
                            className="w-full min-h-14 px-4 text-xl rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                        />
                    ) : (
                        <>
                            <h1 className="text-3xl sm:text-4xl font-bold leading-tight break-words">{task.name}</h1>
                            <p className="mt-1 text-[13px] text-[var(--text-tertiary)] break-words">{task.section}</p>
                        </>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                        {!freeText && tasks.length > 1 && (
                            <button type="button" className={ghostBtn} onClick={() => setIdx((i) => i + 1)}>
                                <RefreshCw size={16} /> Not this one
                            </button>
                        )}
                        {tasks.length > 0 && (
                            <button type="button" className={ghostBtn} onClick={() => setFreeText((v) => !v)}>
                                {freeText ? 'Pick from my tasks' : 'Something else'}
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <p className="text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
                        How long? Do as much as you can.
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                        {MINUTE_CHOICES.map((m) => {
                            const on = !customOn && minutes === m
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => { setCustomOn(false); setMinutes(m) }}
                                    aria-pressed={on}
                                    className={`min-h-11 px-5 rounded-xl border text-[15px] font-medium transition-colors ${
                                        on
                                            ? 'bg-[var(--color-accent)] text-on-accent border-transparent'
                                            : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)]'
                                    }`}
                                >
                                    {m} min
                                </button>
                            )
                        })}
                        {customOn ? (
                            <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="180"
                                autoFocus
                                value={custom}
                                onChange={(e) => setCustom(e.target.value)}
                                placeholder="min"
                                aria-label="Custom minutes"
                                className="w-24 min-h-11 px-3 rounded-xl border border-[var(--color-accent)] bg-[var(--surface-1)] text-[var(--text-primary)] focus:outline-none"
                            />
                        ) : (
                            <button type="button" className={ghostBtn} onClick={() => setCustomOn(true)}>Custom</button>
                        )}
                    </div>
                </div>

                <div>
                    {stepsOpen ? (
                        <textarea
                            value={stepsText}
                            onChange={(e) => setStepsText(e.target.value)}
                            rows={4}
                            placeholder={'Tiny steps, one per line. The first should take under 2 minutes.'}
                            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                        />
                    ) : (
                        <button type="button" className={ghostBtn} onClick={() => setStepsOpen(true)}>
                            <Plus size={16} /> Add tiny steps (optional)
                        </button>
                    )}
                </div>

                <button type="button" className={primaryBtn} onClick={start} disabled={!label || !mins}>
                    Start {mins ? `${mins} minutes` : ''} <ArrowRight size={18} />
                </button>
            </div>
        </div>
    )
}

export default FocusFlow
