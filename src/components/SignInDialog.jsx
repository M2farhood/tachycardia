import { useState } from 'react'
import { X, Eye, EyeOff, Mail } from 'lucide-react'
import { resetPassword, MIN_PASSWORD_LENGTH } from '../services/authService'

/**
 * Sign in / create account / reset password.
 *
 * Safety choices (kept simple on purpose):
 * - Firebase Auth checks and stores passwords; nothing here keeps a copy — the
 *   password lives only in this component's state until the request is sent.
 * - Errors never say whether an email has an account; "forgot password"
 *   always answers the same way.
 * - Native password fields with the right autocomplete hints, so password
 *   managers and iCloud Keychain can generate and fill strong passwords.
 */
const SignInDialog = ({ isOpen, onClose, onSignIn, googleAvailable = true }) => {
    const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [show, setShow] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const [notice, setNotice] = useState(null)

    if (!isOpen) return null

    const close = () => {
        setPassword('')
        setError(null)
        setNotice(null)
        setMode('signin')
        onClose()
    }

    const switchMode = (next) => {
        setMode(next)
        setError(null)
        setNotice(null)
        setPassword('')
    }

    const submit = async (e) => {
        e.preventDefault()
        if (busy) return
        setBusy(true)
        setError(null)
        setNotice(null)
        if (mode === 'reset') {
            const { error: err } = await resetPassword(email)
            if (err) setError(err)
            else setNotice('If there is an account for that email, a reset link is on its way. Check your inbox.')
            setBusy(false)
            return
        }
        const res = await onSignIn(mode === 'signup' ? 'email-signup' : 'email', { email, password })
        setBusy(false)
        if (res?.success) {
            setPassword('')
            if (mode === 'signup') {
                setNotice('Account created. We sent a link to confirm your email — open it to turn on Tachycardia.')
                setMode('signin')
                return
            }
            close()
        } else {
            setError(res?.error || 'Something went wrong. Please try again.')
        }
    }

    const google = async () => {
        setBusy(true)
        setError(null)
        const res = await onSignIn('google')
        setBusy(false)
        if (res?.success) close()
        else if (res?.error) setError(res.error)
    }

    const title = mode === 'signup' ? 'Create an account' : mode === 'reset' ? 'Reset your password' : 'Sign in'
    const input = 'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]'

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop" onClick={close}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="surface rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
                    <button onClick={close} aria-label="Close" className="p-2 -mr-2 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-2)]">
                        <X size={18} />
                    </button>
                </div>
                <p className="text-[13px] text-[var(--text-tertiary)] mb-5">
                    {mode === 'reset'
                        ? 'We’ll email you a link to choose a new password.'
                        : 'Keeps your lists in sync across your phone and computer. The app works without an account too.'}
                </p>

                {mode !== 'reset' && googleAvailable && (
                    <>
                        <button
                            onClick={google}
                            disabled={busy}
                            className="w-full py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                        >
                            Continue with Google
                        </button>
                        <div className="flex items-center gap-3 my-4 text-[11px] uppercase tracking-widest text-[var(--text-tertiary)]">
                            <span className="flex-1 h-px bg-[var(--border-subtle)]" /> or email <span className="flex-1 h-px bg-[var(--border-subtle)]" />
                        </div>
                    </>
                )}

                <form onSubmit={submit} className="space-y-3" noValidate>
                    <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={input}
                    />
                    {mode !== 'reset' && (
                        <div className="relative">
                            <input
                                type={show ? 'text' : 'password'}
                                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
                                required
                                placeholder={mode === 'signup' ? `Password (${MIN_PASSWORD_LENGTH}+ characters)` : 'Password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`${input} pr-12`}
                            />
                            <button
                                type="button"
                                onClick={() => setShow(v => !v)}
                                aria-label={show ? 'Hide password' : 'Show password'}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                            >
                                {show ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    )}

                    {error && <p role="alert" className="text-[13px] text-[var(--color-danger)]">{error}</p>}
                    {notice && <p role="status" className="text-[13px] text-[var(--color-success)] flex gap-2"><Mail size={14} className="mt-0.5 flex-shrink-0" />{notice}</p>}

                    <button
                        type="submit"
                        disabled={busy || !email.trim() || (mode !== 'reset' && !password)}
                        className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-[var(--on-accent)] text-[15px] font-semibold disabled:opacity-40"
                    >
                        {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
                    </button>
                </form>

                <div className="mt-4 flex flex-col items-center gap-2 text-[13px]">
                    {mode === 'signin' && (
                        <>
                            <button onClick={() => switchMode('reset')} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">Forgot password?</button>
                            <button onClick={() => switchMode('signup')} className="text-[var(--color-accent)] font-medium">New here? Create an account</button>
                        </>
                    )}
                    {mode !== 'signin' && (
                        <button onClick={() => switchMode('signin')} className="text-[var(--color-accent)] font-medium">Back to sign in</button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SignInDialog
