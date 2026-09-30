import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Heart, ArrowLeft, Check, X, RefreshCw } from 'lucide-react'
import { useAIChat } from '../hooks/useAIChat'
import { isAIAvailable } from '../services/aiService'
import { describeAction, DISPLAY_TOOLS, DESTRUCTIVE_TOOLS } from '../utils/aiActions'

const STARTERS = ['Plan my week', 'What should I do next?', 'Add tasks to a section…']

const smallBtn =
    'inline-flex items-center justify-center gap-1.5 min-h-9 px-3 rounded-lg text-[13px] font-medium transition-colors'

const ProposalCard = ({ call, status, data, onApply, onSkip }) => {
    const [sure, setSure] = useState(false)
    const state = status?.state || 'skipped'
    const destructive = DESTRUCTIVE_TOOLS.includes(call.function?.name)
    const sentence = describeAction(data, call)

    return (
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
            <p className="text-[14px] text-[var(--text-primary)] break-words">{sentence}</p>
            {state === 'pending' && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {destructive ? (
                        <button
                            type="button"
                            onClick={() => (sure ? onApply() : setSure(true))}
                            className={`${smallBtn} bg-[var(--color-danger)] text-on-accent`}
                        >
                            {sure ? 'Sure?' : 'Delete'}
                        </button>
                    ) : (
                        <button type="button" onClick={onApply} className={`${smallBtn} bg-[var(--color-accent)] text-on-accent`}>
                            Apply
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onSkip}
                        className={`${smallBtn} border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]`}
                    >
                        Skip
                    </button>
                </div>
            )}
            {state === 'applied' && (
                <p className="mt-1.5 text-[13px] text-[var(--color-success)] flex items-center gap-1"><Check size={14} /> Applied</p>
            )}
            {state === 'skipped' && (
                <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)] flex items-center gap-1"><X size={14} /> Skipped</p>
            )}
            {state === 'failed' && (
                <div className="mt-1.5">
                    <p className="text-[13px] text-[var(--color-danger)]" role="alert">{status.error}</p>
                    <div className="mt-1.5 flex gap-2">
                        <button type="button" onClick={onApply} className={`${smallBtn} border border-[var(--border)] text-[var(--text-secondary)]`}>
                            Try again
                        </button>
                        <button type="button" onClick={onSkip} className={`${smallBtn} text-[var(--text-tertiary)]`}>Skip</button>
                    </div>
                </div>
            )}
        </div>
    )
}

const TachycardiaTab = ({ data, settings, onApplyAction, onSignIn, isSignedIn = false, onBack }) => {
    const { messages, isLoading, error, sendMessage, retry, applyProposal, skipProposal, clearChat } = useAIChat({
        data,
        signedIn: isSignedIn,
        onApplyAction,
    })
    const aiOn = isAIAvailable(settings)
    const [input, setInput] = useState('')
    const endRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages, isLoading, error])

    const submit = (e) => {
        e?.preventDefault()
        if (!input.trim() || isLoading) return
        sendMessage(input)
        setInput('')
    }

    const starter = (text) => {
        if (text.endsWith('…')) {
            setInput('Add tasks to ')
            inputRef.current?.focus()
        } else {
            sendMessage(text)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100dvh-180px)] min-h-[360px] mx-4 mb-4 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-2 min-h-10 px-3 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
                >
                    <ArrowLeft size={18} className="text-[var(--text-secondary)]" />
                    <span className="text-[13px] text-[var(--text-secondary)]">Back</span>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-2 px-3 min-h-10 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                        <Heart size={18} className="text-accent" fill="currentColor" />
                        <span className="font-semibold text-[var(--text-primary)]">Tachycardia</span>
                    </div>
                    {messages.length > 0 && (
                        <button
                            type="button"
                            onClick={clearChat}
                            className="flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-[13px]"
                            aria-label="Clear chat"
                        >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">Clear chat</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-2xl surface p-3 sm:p-4 space-y-3">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-2">
                        <div className="w-14 h-14 rounded-full bg-[var(--color-accent)] text-on-accent flex items-center justify-center mb-4">
                            <Heart size={26} fill="currentColor" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Hi, I’m Tachycardia</h2>
                        <p className="text-[14px] text-[var(--text-secondary)] max-w-sm mb-5">
                            I can plan, add tasks and schedule your days. I only suggest — nothing changes until you tap Apply.
                        </p>
                        {aiOn && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {STARTERS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => starter(s)}
                                        disabled={isLoading}
                                        className="min-h-10 px-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--color-accent)] text-[var(--text-primary)] text-[14px] transition-colors disabled:opacity-50"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {messages.map((m) => {
                    const isUser = m.role === 'user'
                    const proposals = (m.tool_calls || []).filter((c) => !DISPLAY_TOOLS.includes(c.function?.name))
                    return (
                        <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[92%] sm:max-w-[85%] min-w-0 rounded-2xl px-4 py-3 ${
                                    isUser
                                        ? 'bg-[var(--color-accent)] text-on-accent'
                                        : 'bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)]'
                                }`}
                            >
                                {!isUser && (
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Heart size={12} className="text-accent" fill="currentColor" />
                                        <span className="text-xs text-accent font-medium">Tachycardia</span>
                                    </div>
                                )}
                                {m.content && (
                                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                                )}
                                {proposals.map((c) => (
                                    <ProposalCard
                                        key={c.id}
                                        call={c}
                                        status={m.status?.[c.id]}
                                        data={data}
                                        onApply={() => applyProposal(m.id, c.id)}
                                        onSkip={() => skipProposal(m.id, c.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                })}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-1" aria-label="Tachycardia is thinking">
                                {[0, 150, 300].map((d) => (
                                    <div key={d} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[14px]" role="alert">
                        <p className="text-[var(--color-danger)]">{error.message}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {error.code === 'AUTH_REQUIRED' && onSignIn && (
                                <button type="button" onClick={onSignIn} className={`${smallBtn} bg-[var(--color-accent)] text-on-accent`}>
                                    Sign in
                                </button>
                            )}
                            {(error.code === 'NETWORK' || error.code === 'OTHER') && (
                                <button
                                    type="button"
                                    onClick={retry}
                                    className={`${smallBtn} border border-[var(--border)] text-[var(--text-secondary)]`}
                                >
                                    <RefreshCw size={14} /> Try again
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div ref={endRef} />
            </div>

            {aiOn ? (
                <form onSubmit={submit} className="mt-3 flex gap-2 items-end">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) submit(e)
                        }}
                        placeholder="Ask Tachycardia…"
                        rows={1}
                        className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] focus:border-[var(--color-accent)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none transition-colors"
                        style={{ minHeight: '50px', maxHeight: '120px' }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        aria-label="Send"
                        className="w-[50px] h-[50px] shrink-0 rounded-2xl bg-[var(--color-accent)] text-on-accent flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </form>
            ) : (
                <p className="mt-3 text-[13px] text-[var(--text-tertiary)] text-center">Tachycardia is turned off in Settings.</p>
            )}
        </div>
    )
}

export default TachycardiaTab
