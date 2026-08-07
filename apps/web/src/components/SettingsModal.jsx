import { useState, useRef } from 'react'
import { X, Upload, Download, Trash2, Clock, Printer, User, MoreHorizontal, BarChart2, Sun, Moon, FileText, Cloud, CloudOff, Loader, LogOut, CheckCircle, ChevronDown, Heart } from 'lucide-react'
import { exportData, importData, getStorageUsage } from '../utils/exportImport'
import ConfirmDialog from './ConfirmDialog'
import PrintModal from './PrintModal'
import PerformanceModal from './PerformanceModal'
import PlanImporterModal from './PlanImporterModal'

const SettingsModal = ({
    isOpen,
    onClose,
    data,
    settings,
    todayMinutes = 0,
    totalMinutes = 0,
    onImport,
    onClearAll,
    onSettingsChange,
    onImportTasks,
    // Auth props
    user = null,
    isAuthLoading = false,
    isSyncing = false,
    syncStatus = 'idle',
    onSignIn = () => { },
    onSignOut = () => { },
    isFirebaseConfigured = false
}) => {
    const [importError, setImportError] = useState(null)
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [showPrintModal, setShowPrintModal] = useState(false)
    const [showPerformance, setShowPerformance] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [nameValue, setNameValue] = useState(settings?.userName || '')
    const [showDataMenu, setShowDataMenu] = useState(false)
    const [showPlanImporter, setShowPlanImporter] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const fileInputRef = useRef(null)
    const storage = getStorageUsage()

    if (!isOpen) return null

    const handleExport = () => {
        exportData(data)
        setShowDataMenu(false)
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
        setShowDataMenu(false)
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

    const timerDuration = settings?.timerDuration || 25
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
                                        className="px-4 py-2 bg-accent text-white text-[15px] font-medium rounded-xl"
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
                                            ? 'bg-gradient-to-r from-blue-500/20 via-red-500/20 to-yellow-500/20 hover:from-blue-500/30 hover:via-red-500/30 hover:to-yellow-500/30 border border-white/10 text-white'
                                            : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] cursor-not-allowed'
                                        }`}
                                >
                                    {isAuthLoading ? (
                                        <Loader size={18} className="animate-spin" />
                                    ) : (
                                        <>
                                            {/* Google Logo */}
                                            <svg width="18" height="18" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            <span>Sign in with Google</span>
                                        </>
                                    )}
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
                                        ? 'bg-accent text-white'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    <Moon size={14} />
                                    Dark
                                </button>
                                <button
                                    onClick={() => onSettingsChange({ theme: 'light' })}
                                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-all liquid-press flex items-center justify-center gap-2 ${theme === 'light'
                                        ? 'bg-accent text-white'
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
                                        ? 'bg-accent text-white'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    15 min
                                </button>
                                <button
                                    onClick={() => onSettingsChange({ timerDuration: 25 })}
                                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-all liquid-press ${timerDuration === 25
                                        ? 'bg-accent text-white'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    25 min
                                </button>
                                <button
                                    onClick={() => onSettingsChange({ timerDuration: 50 })}
                                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium transition-all liquid-press ${timerDuration === 50
                                        ? 'bg-accent text-white'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                        }`}
                                >
                                    50 min
                                </button>
                            </div>
                        </div>

                        {/* Spaced Repetition */}
                        <div>
                            <button
                                onClick={() => onSettingsChange({ spacedRepetition: !settings?.spacedRepetition })}
                                className={`w-full py-2.5 px-3 rounded-xl text-left text-[15px] font-medium transition-all liquid-press flex items-center justify-between ${
                                    settings?.spacedRepetition
                                        ? 'bg-accent/20 text-accent border border-accent/30'
                                        : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]'
                                }`}
                            >
                                <span>Spaced Repetition</span>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${settings?.spacedRepetition ? 'bg-accent' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings?.spacedRepetition ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>
                            {settings?.spacedRepetition && (
                                <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 px-1">
                                    Completed topics show a review reminder after 1, 3, 7, 14 days.
                                </p>
                            )}
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
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${settings?.countdownVisible ? 'bg-accent' : 'bg-white/10'
                                        }`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings?.countdownVisible ? 'translate-x-4' : 'translate-x-0'
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
                                <div className="mt-2 space-y-2">
                                    <button
                                        onClick={() => setShowPerformance(true)}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-[15px] rounded-xl transition-colors liquid-press border border-[var(--border)]"
                                    >
                                        <BarChart2 size={16} />
                                        View All Performance
                                    </button>
                                    <button
                                        onClick={() => setShowPrintModal(true)}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-[15px] rounded-xl transition-colors liquid-press border border-[var(--border)]"
                                    >
                                        <Printer size={16} />
                                        Print / Save as PDF
                                    </button>
                                    <button
                                        onClick={() => setShowPlanImporter(true)}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-[15px] rounded-xl transition-colors liquid-press border border-[var(--border)]"
                                    >
                                        <FileText size={16} />
                                        Import Study Plan
                                    </button>

                                    {/* Storage + Export/Import */}
                                    <div className="flex items-center gap-3 px-1 py-1">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
                                                <span>Storage</span>
                                                <span>{storage.usedFormatted}</span>
                                            </div>
                                            <div className="h-1 bg-[var(--surface-3)] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${storage.percent > 80 ? 'bg-[var(--color-danger)]' : 'bg-accent/50'}`}
                                                    style={{ width: `${Math.min(storage.percent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowDataMenu(!showDataMenu)}
                                                className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                                                title="Import/Export"
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                            {showDataMenu && (
                                                <div className="absolute right-0 bottom-full mb-2 surface rounded-xl py-1 min-w-[100px] z-10 animate-fade-in shadow-xl">
                                                    <button
                                                        onClick={handleExport}
                                                        className="w-full px-3 py-2 text-left text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] flex items-center gap-2"
                                                    >
                                                        <Download size={12} />
                                                        Export
                                                    </button>
                                                    <button
                                                        onClick={handleImportClick}
                                                        className="w-full px-3 py-2 text-left text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] flex items-center gap-2"
                                                    >
                                                        <Upload size={12} />
                                                        Import
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {importError && (
                                        <p className="text-xs text-red-400 text-center bg-red-500/10 p-2 rounded-lg">
                                            {importError}
                                        </p>
                                    )}

                                    <button
                                        onClick={() => setShowClearConfirm(true)}
                                        className="w-full text-xs text-red-400/50 hover:text-red-400 py-1 transition-colors"
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

            <PlanImporterModal
                isOpen={showPlanImporter}
                onClose={() => setShowPlanImporter(false)}
                tabs={data?.tabs || []}
                onImportTasks={onImportTasks}
            />
        </>
    )
}

export default SettingsModal
