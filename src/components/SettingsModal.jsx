import { useState, useRef } from 'react'
import { X, Upload, Download, Clock, Printer, User, BarChart2, Sun, Moon, Cloud, CloudOff, Loader, LogOut, CheckCircle, ChevronDown, Heart, Minus, Plus } from 'lucide-react'
import { exportData, importData } from '../utils/exportImport'
import { getSetting, getListSuggestions, MAX_LIST_SUGGESTIONS, SETTINGS_DEFAULTS } from '../utils/settingsDefaults'
import ConfirmDialog from './ConfirmDialog'
import PrintModal from './PrintModal'
import PerformanceModal from './PerformanceModal'
import StatsCards from './StatsCards'
import { resendVerification } from '../services/authService'

// ---- small building blocks for the Advanced section ----------------------
const GroupLabel = ({ children }) => (
    <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] pt-3 pb-1 border-t border-[var(--border-subtle)]">
        {children}
    </p>
)

const ToggleRow = ({ label, hint, checked, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="w-full flex items-center justify-between gap-3 py-2 text-left min-h-[40px]"
    >
        <span className="min-w-0">
            <span className="block text-[14px] text-[var(--text-primary)]">{label}</span>
            {hint && <span className="block text-[11px] text-[var(--text-tertiary)]">{hint}</span>}
        </span>
        <span className={`w-9 h-5 rounded-full p-0.5 flex-shrink-0 transition-colors ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--surface-3)]'}`}>
            <span className={`block w-4 h-4 rounded-full bg-[var(--on-accent)] shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </span>
    </button>
)

const PillRow = ({ label, options, value, onChange }) => (
    <div className="py-2">
        <p className="text-[14px] text-[var(--text-primary)] mb-1.5">{label}</p>
        <div className="flex gap-1.5 flex-wrap">
            {options.map(([v, text]) => (
                <button
                    key={String(v)}
                    type="button"
                    onClick={() => onChange(v)}
                    aria-pressed={value === v}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${value === v
                        ? 'bg-[var(--color-accent)] text-[var(--on-accent)]'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
                        }`}
                >
                    {text}
                </button>
            ))}
        </div>
    </div>
)

const StepperRow = ({ label, value, min, max, step = 5, unit, onChange }) => {
    const clamp = (n) => Math.min(max, Math.max(min, n))
    const btn = 'w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] disabled:opacity-30 transition-colors'
    return (
        <div className="flex items-center justify-between gap-3 py-2 min-h-[40px]">
            <span className="text-[14px] text-[var(--text-primary)]">{label}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button" className={btn} aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>
                    <Minus size={14} />
                </button>
                <span className="min-w-[56px] text-center text-[14px] font-medium text-[var(--text-primary)] tabular-nums">{value} {unit}</span>
                <button type="button" className={btn} aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>
                    <Plus size={14} />
                </button>
            </div>
        </div>
    )
}

// Editable chips: the quick names offered on "Start your first list".
const NamesRow = ({ label, hint, names, max, onChange, onReset }) => {
    const [draft, setDraft] = useState('')
    const add = () => {
        const name = draft.replace(/\s+/g, ' ').trim().slice(0, 40)
        if (!name || names.some(n => n.toLowerCase() === name.toLowerCase())) { setDraft(''); return }
        onChange([...names, name])
        setDraft('')
    }
    return (
        <div className="py-3 space-y-2">
            <div>
                <div className="text-[15px] text-[var(--text-primary)]">{label}</div>
                {hint && <div className="text-[12px] text-[var(--text-tertiary)]">{hint}</div>}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {names.map(n => (
                    <span key={n} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-[13px] border border-[var(--border)] text-[var(--text-secondary)]">
                        {n}
                        <button
                            onClick={() => onChange(names.filter(x => x !== n))}
                            aria-label={`Remove ${n}`}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--surface-2)]"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                {names.length === 0 && <span className="text-[13px] text-[var(--text-tertiary)]">None — no chips will show.</span>}
            </div>
            {names.length < max && (
                <div className="flex gap-2">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && add()}
                        placeholder="Add a name"
                        className="flex-1 min-w-0 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <button onClick={add} disabled={!draft.trim()} className="px-3 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] text-[13px] disabled:opacity-40">Add</button>
                </div>
            )}
            <button onClick={onReset} className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline underline-offset-2">Reset to defaults</button>
        </div>
    )
}

// Email accounts must confirm their address before Tachycardia works (it
// keeps throwaway accounts from spending the AI budget). Syncing works anyway.
const VerifyEmailNotice = ({ onRefreshUser }) => {
    const [msg, setMsg] = useState(null)
    const [busy, setBusy] = useState(false)
    const resend = async () => {
        setBusy(true)
        const { error } = await resendVerification()
        setMsg(error || 'Sent — check your inbox (and spam).')
        setBusy(false)
    }
    const check = async () => {
        setBusy(true)
        const u = await onRefreshUser()
        setMsg(u?.emailVerified ? 'Confirmed — Tachycardia is on.' : 'Not confirmed yet. Open the link in the email first.')
        setBusy(false)
    }
    return (
        <div className="rounded-lg bg-[var(--surface-2)] p-3 text-[13px] text-[var(--text-secondary)] space-y-2">
            <p>Confirm your email to use Tachycardia. We sent you a link.</p>
            <div className="flex gap-2">
                <button onClick={check} disabled={busy} className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-[var(--on-accent)] text-[12px] font-medium disabled:opacity-50">I've confirmed</button>
                <button onClick={resend} disabled={busy} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[12px] disabled:opacity-50">Resend link</button>
            </div>
            {msg && <p className="text-[12px] text-[var(--text-tertiary)]">{msg}</p>}
        </div>
    )
}

const SettingsModal = ({
    isOpen,
    onClose,
    data,
    settings,
    todayMinutes = 0,
    totalMinutes = 0,
    studyStreak = 0,
    onImport,
    onClearAll,
    onSettingsChange,
    // Auth props
    user = null,
    isAuthLoading = false,
    isSyncing = false,
    syncStatus = 'idle',
    onSignIn = () => { },
    onSignOut = () => { },
    onRefreshUser = async () => null,
    isFirebaseConfigured = false
}) => {
    const [importError, setImportError] = useState(null)
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [showPrintModal, setShowPrintModal] = useState(false)
    const [showPerformance, setShowPerformance] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [nameValue, setNameValue] = useState(settings?.userName || '')
    const [showAdvanced, setShowAdvanced] = useState(false)
    const fileInputRef = useRef(null)

    if (!isOpen) return null

    const handleExport = () => {
        exportData(data)
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setImportError(null)
            const importedData = await importData(file)
            onImport(importedData)
            onClose()
        } catch (error) {
            setImportError(error.message)
        }

        e.target.value = ''
    }

    const handleNameSave = () => {
        onSettingsChange({ userName: nameValue.trim() || '' })
        setEditingName(false)
    }

    const timerDuration = getSetting(settings, 'timerDuration')
    const userName = settings?.userName || 'Student'
    const theme = settings?.theme || 'dark'

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
                <div className="surface rounded-2xl shadow-2xl max-w-sm w-full animate-slide-up max-h-[85vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] sticky top-0 surface rounded-t-2xl">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Settings</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--surface-2)] rounded-full transition-colors"
                        >
                            <X size={18} className="text-[var(--text-tertiary)]" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        {/* User Name */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <User size={14} className="text-[var(--text-tertiary)]" />
                                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Your Name</span>
                            </div>
                            {editingName ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={nameValue}
                                        onChange={(e) => setNameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleNameSave()
                                            if (e.key === 'Escape') setEditingName(false)
                                        }}
                                        placeholder="Enter your name"
                                        className="flex-1 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-[15px] focus:outline-none focus:border-[var(--color-accent)]"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleNameSave}
                                        className="px-4 py-2 bg-accent text-on-accent text-[15px] font-medium rounded-xl"
                                    >
                                        Save
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setNameValue(settings?.userName || '')
                                        setEditingName(true)
                                    }}
                                    className="w-full px-3 py-2.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-xl text-left text-[var(--text-secondary)] text-[15px] transition-colors"
                                >
                                    {userName}
                                </button>
                            )}
                        </div>

                        {/* Your progress — lives here, not on the dashboard (owner's call) */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart2 size={14} className="text-[var(--text-tertiary)]" />
                                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Your progress</span>
                            </div>
                            <StatsCards
                                compact
                                studyStreak={studyStreak}
                                todayMinutes={todayMinutes}
                                totalMinutes={totalMinutes}
                                dailyGoalMinutes={getSetting(settings, 'dailyGoalMinutes')}
                            />
                        </div>

                        {/* Account & Sync Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Cloud size={14} className="text-[var(--text-tertiary)]" />
                                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Account & Sync</span>
                            </div>

                            {!user ? (
                                /* Signed Out State */
                                <button
                                    onClick={onSignIn}
                                    disabled={isAuthLoading || !isFirebaseConfigured}
                                    className={`w-full px-4 py-3 rounded-xl text-base font-medium transition-all liquid-press flex items-center justify-center gap-3 ${isFirebaseConfigured
                                            ? 'bg-[var(--color-accent)] text-[var(--on-accent)]'
                                            : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] cursor-not-allowed'
                                        }`}
                                >
                                    {isAuthLoading ? <Loader size={18} className="animate-spin" /> : <span>Sign in or create an account</span>}
                                </button>
                            ) : (
                                /* Signed In State */
                                <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-xl p-3 space-y-3">
                                    <div className="flex items-center gap-3">
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt="Profile"
                                                className="w-9 h-9 rounded-full border-2 border-[var(--color-success)]/30"
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center">
                                                <User size={16} className="text-[var(--color-success)]" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                                                {user.displayName || 'User'}
                                            </p>
                                            <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {isSyncing ? (
                                                <Loader size={14} className="text-accent animate-spin" />
                                            ) : syncStatus === 'synced' ? (
                                                <CheckCircle size={14} className="text-[var(--color-success)]" />
                                            ) : syncStatus === 'error' ? (
                                                <CloudOff size={14} className="text-[var(--color-danger)]" />
                                            ) : (
                                                <Cloud size={14} className="text-[var(--text-tertiary)]" />
                                            )}
                                            <span className={`text-[11px] ${syncStatus === 'synced' ? 'text-[var(--color-success)]' :
                                                    syncStatus === 'syncing' ? 'text-accent' :
                                                        syncStatus === 'error' ? 'text-[var(--color-danger)]' :
                                                            'text-[var(--text-tertiary)]'
                                                }`}>
                                                {syncStatus === 'synced' ? 'Synced' :
                                                    syncStatus === 'syncing' ? 'Syncing...' :
                                                        syncStatus === 'error' ? 'Error' :
                                                            'Ready'}
                                            </span>
                                        </div>
                                    </div>
                                    {user.provider === 'password' && !user.emailVerified && (
                                        <VerifyEmailNotice onRefreshUser={onRefreshUser} />
                                    )}
                                    <button
                                        onClick={onSignOut}
                                        disabled={isAuthLoading}
                                        className="w-full py-2 px-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LogOut size={14} />
                                        Sign Out
                                    </button>
                                </div>
                            )}

                            {!isFirebaseConfigured && !user && (
                                <p className="text-[11px] text-[var(--text-tertiary)] mt-2 text-center">
                                    Add Firebase credentials to .env to enable sync
                                </p>
                            )}
                        </div>

                        {/* Theme Toggle */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                {theme === 'dark' ? (
                                    <Moon size={14} className="text-[var(--text-tertiary)]" />
                                ) : (
                                    <Sun size={14} className="text-[var(--text-tertiary)]" />
                                )}
                                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Theme</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSettingsChange({ theme: 'dark' })}
                                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-all liquid-press flex items-center justify-center gap-2 ${theme === 'dark'
                                        ? 'bg-accent text-on-accent'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    <Moon size={14} />
                                    Dark
                                </button>
                                <button
                                    onClick={() => onSettingsChange({ theme: 'light' })}
                                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-all liquid-press flex items-center justify-center gap-2 ${theme === 'light'
                                        ? 'bg-accent text-on-accent'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    <Sun size={14} />
                                    Light
                                </button>
                            </div>
                        </div>

                        {/* Timer Duration */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={14} className="text-[var(--text-tertiary)]" />
                                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Session Timer</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSettingsChange({ timerDuration: 15 })}
                                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-all liquid-press ${timerDuration === 15
                                        ? 'bg-accent text-on-accent'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    15 min
                                </button>
                                <button
                                    onClick={() => onSettingsChange({ timerDuration: 25 })}
                                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-all liquid-press ${timerDuration === 25
                                        ? 'bg-accent text-on-accent'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    25 min
                                </button>
                                <button
                                    onClick={() => onSettingsChange({ timerDuration: 50 })}
                                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-all liquid-press ${timerDuration === 50
                                        ? 'bg-accent text-on-accent'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    50 min
                                </button>
                            </div>
                        </div>

                        {/* Exam Countdown */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={14} className="text-[var(--text-tertiary)]" />
                                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Exam Countdown</span>
                            </div>
                            <div className="space-y-2">
                                <button
                                    onClick={() => onSettingsChange({
                                        countdownVisible: !settings?.countdownVisible
                                    })}
                                    className={`w-full py-2.5 px-3 rounded-xl text-left text-[15px] font-medium transition-all liquid-press flex items-center justify-between ${settings?.countdownVisible
                                        ? 'bg-accent/20 text-accent border border-accent/30'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    <span>Show Countdown</span>
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${settings?.countdownVisible ? 'bg-accent' : 'bg-[var(--surface-3)]'
                                        }`}>
                                        <div className={`w-4 h-4 rounded-full bg-[var(--on-accent)] shadow-sm transition-transform ${settings?.countdownVisible ? 'translate-x-4' : 'translate-x-0'
                                            }`} />
                                    </div>
                                </button>

                                {settings?.countdownVisible && (
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={settings?.examDate?.split('T')[0] || ''}
                                            onChange={(e) => {
                                                const date = e.target.value
                                                const time = settings?.examDate?.split('T')[1] || '09:00'
                                                onSettingsChange({ examDate: `${date}T${time}` })
                                            }}
                                            className="flex-1 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-[13px] focus:outline-none focus:border-[var(--color-accent)] min-w-0"
                                        />
                                        <input
                                            type="time"
                                            value={settings?.examDate?.split('T')[1] || ''}
                                            onChange={(e) => {
                                                const time = e.target.value
                                                const date = settings?.examDate?.split('T')[0] || new Date().toISOString().split('T')[0]
                                                onSettingsChange({ examDate: `${date}T${time}` })
                                            }}
                                            className="w-24 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Advanced (collapsible) */}
                        <div>
                            <button
                                onClick={() => setShowAdvanced(v => !v)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-[15px] font-medium rounded-xl transition-colors liquid-press border border-[var(--border)]"
                            >
                                <span>Advanced</span>
                                <ChevronDown
                                    size={15}
                                    className={`text-[var(--text-tertiary)] transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {showAdvanced && (
                                <div className="mt-2 px-1 space-y-0.5">
                                    <div className="grid grid-cols-2 gap-2 pb-2">
                                        <button
                                            onClick={() => setShowPerformance(true)}
                                            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-[13px] rounded-xl transition-colors liquid-press"
                                        >
                                            <BarChart2 size={15} />
                                            Performance
                                        </button>
                                        <button
                                            onClick={() => setShowPrintModal(true)}
                                            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-[13px] rounded-xl transition-colors liquid-press"
                                        >
                                            <Printer size={15} />
                                            Print / PDF
                                        </button>
                                    </div>

                                    <GroupLabel>Sessions</GroupLabel>
                                    <StepperRow
                                        label="Session length"
                                        value={timerDuration}
                                        min={5}
                                        max={90}
                                        unit="min"
                                        onChange={(v) => onSettingsChange({ timerDuration: v })}
                                    />
                                    <PillRow
                                        label="Break after a session"
                                        value={getSetting(settings, 'breakMinutes')}
                                        options={[[0, 'Off'], [5, '5 min'], [10, '10 min']]}
                                        onChange={(v) => onSettingsChange({ breakMinutes: v })}
                                    />
                                    <ToggleRow
                                        label="Keep screen awake"
                                        checked={getSetting(settings, 'keepAwake')}
                                        onChange={(v) => onSettingsChange({ keepAwake: v })}
                                    />
                                    <PillRow
                                        label="End-of-session sound"
                                        value={getSetting(settings, 'sessionSound')}
                                        options={[['chime', 'Chime'], ['soft', 'Soft'], ['silent', 'Silent']]}
                                        onChange={(v) => onSettingsChange({ sessionSound: v })}
                                    />
                                    <ToggleRow
                                        label="Body-double check-ins"
                                        hint="Gentle prompts while in Focus"
                                        checked={getSetting(settings, 'bodyDouble')}
                                        onChange={(v) => onSettingsChange({ bodyDouble: v })}
                                    />

                                    <GroupLabel>Goals</GroupLabel>
                                    <PillRow
                                        label="Daily study goal"
                                        value={getSetting(settings, 'dailyGoalMinutes')}
                                        options={[[0, 'Off'], [30, '30'], [60, '60'], [90, '90'], [120, '120']]}
                                        onChange={(v) => onSettingsChange({ dailyGoalMinutes: v })}
                                    />

                                    <GroupLabel>Lists</GroupLabel>
                                    <NamesRow
                                        label="Suggested list names"
                                        hint="Quick picks when you start a new list"
                                        names={getListSuggestions(settings)}
                                        max={MAX_LIST_SUGGESTIONS}
                                        onChange={(v) => onSettingsChange({ listSuggestions: v })}
                                        onReset={() => onSettingsChange({ listSuggestions: SETTINGS_DEFAULTS.listSuggestions })}
                                    />
                                    <ToggleRow
                                        label="Hide completed tasks"
                                        checked={getSetting(settings, 'hideCompleted')}
                                        onChange={(v) => onSettingsChange({ hideCompleted: v })}
                                    />
                                    <ToggleRow
                                        label="Spaced repetition"
                                        hint="Done topics come back for review after 1, 3, 7, 14 days"
                                        checked={getSetting(settings, 'spacedRepetition')}
                                        onChange={(v) => onSettingsChange({ spacedRepetition: v })}
                                    />

                                    <GroupLabel>Calendar</GroupLabel>
                                    <PillRow
                                        label="Week starts on"
                                        value={getSetting(settings, 'weekStart')}
                                        options={[['sat', 'Saturday'], ['sun', 'Sunday'], ['mon', 'Monday']]}
                                        onChange={(v) => onSettingsChange({ weekStart: v })}
                                    />
                                    <ToggleRow
                                        label="Show unfinished earlier tasks on today"
                                        checked={getSetting(settings, 'carryOverTasks')}
                                        onChange={(v) => onSettingsChange({ carryOverTasks: v })}
                                    />

                                    <GroupLabel>Tachycardia</GroupLabel>
                                    <ToggleRow
                                        label="AI assistant"
                                        checked={getSetting(settings, 'aiEnabled')}
                                        onChange={(v) => onSettingsChange({ aiEnabled: v })}
                                    />

                                    <GroupLabel>Comfort</GroupLabel>
                                    <ToggleRow
                                        label="Reduce motion"
                                        checked={getSetting(settings, 'reduceMotion')}
                                        onChange={(v) => onSettingsChange({ reduceMotion: v })}
                                    />

                                    <GroupLabel>Backup</GroupLabel>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <button
                                            onClick={handleExport}
                                            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-[13px] rounded-xl transition-colors"
                                        >
                                            <Download size={14} />
                                            Export
                                        </button>
                                        <button
                                            onClick={handleImportClick}
                                            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-[13px] rounded-xl transition-colors"
                                        >
                                            <Upload size={14} />
                                            Import
                                        </button>
                                    </div>

                                    {importError && (
                                        <p className="text-xs text-[var(--color-danger)] text-center bg-[var(--color-danger)]/10 p-2 rounded-lg">
                                            {importError}
                                        </p>
                                    )}

                                    <button
                                        onClick={() => setShowClearConfirm(true)}
                                        className="w-full text-xs text-[var(--color-danger)]/60 hover:text-[var(--color-danger)] pt-3 pb-1 transition-colors"
                                    >
                                        Clear All Data
                                    </button>
                                </div>
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />
                    </div>

                    {/* Footer credit */}
                    <div className="px-5 pb-4 pt-1 border-t border-[var(--border-subtle)]">
                        <p className="text-[11px] text-[var(--text-tertiary)] text-center flex items-center justify-center gap-1">
                            <a href="/privacy" target="_blank" rel="noreferrer" className="mr-3 underline underline-offset-2 hover:text-[var(--text-secondary)]">Privacy policy</a>
                            Made with <Heart size={11} className="text-[var(--text-tertiary)]" /> by Mohammed Farhood
                        </p>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={onClearAll}
                title="Delete All Data?"
                message="This will permanently delete all your sections, topics, notes, and progress."
                confirmText="Delete Everything"
                isDangerous={true}
                requireTyping="DELETE"
            />

            <PrintModal
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                tabs={data?.tabs || []}
            />

            <PerformanceModal
                isOpen={showPerformance}
                onClose={() => setShowPerformance(false)}
                tabs={data?.tabs || []}
                todayMinutes={todayMinutes}
                totalMinutes={totalMinutes}
                studyDates={data?.studyDates || []}
            />
        </>
    )
}

export default SettingsModal
