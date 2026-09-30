import { useState } from 'react'
import { Brain, LayoutGrid, CalendarDays, Heart } from 'lucide-react'
import SettingsModal from './SettingsModal'

const Header = ({
    data,
    settings,
    todayMinutes = 0,
    totalMinutes = 0,
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
    isFirebaseConfigured = false,
    isFocusMode = false,
    onToggleFocus = () => { },
    activeView = null,
    onViewChange = () => { },
    showTachycardia = true
}) => {
    const [showSettings, setShowSettings] = useState(false)

    // Get user name from settings or default to "Student"
    const userName = settings?.userName || 'Student'

    // Get current hour for greeting
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    const views = [
        { id: 'blocks', label: 'Blocks', icon: <LayoutGrid size={16} /> },
        { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
        ...(showTachycardia ? [{ id: 'tachycardia', label: 'Tachycardia', icon: <Heart size={16} /> }] : []),
    ]

    // 36px circle visually; the ::after pad brings the touch target to 40px+
    const circle = (active) =>
        `relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 liquid-press transition-colors after:content-[''] after:absolute after:-inset-[3px] ${active
            ? 'bg-[var(--color-accent)] text-[var(--on-accent)]'
            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`

    return (
        <>
            <header className="px-4 sm:px-6 pt-6 pb-3 no-print">
                <div className="flex items-center justify-between gap-3">
                    {/* Left side - Greeting */}
                    <h1 className="min-w-0 flex-1 truncate text-base sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                        {getGreeting()}, {userName}
                    </h1>

                    {/* Right side - view switches, focus, avatar */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {views.map(({ id, label, icon }) => {
                            const active = activeView === id
                            return (
                                <button
                                    key={id}
                                    onClick={() => onViewChange(active ? null : id)}
                                    aria-label={label}
                                    aria-pressed={active}
                                    title={label}
                                    className={circle(active)}
                                >
                                    {icon}
                                </button>
                            )
                        })}

                        <button
                            onClick={onToggleFocus}
                            aria-label={isFocusMode ? 'Exit Focus Mode' : 'Focus Mode'}
                            aria-pressed={isFocusMode}
                            title={isFocusMode ? 'Exit Focus Mode' : 'Focus Mode'}
                            className={circle(isFocusMode)}
                        >
                            <Brain size={16} />
                        </button>

                        {/* User Avatar — tap to open Settings */}
                        <button
                            onClick={() => setShowSettings(true)}
                            aria-label="Settings"
                            title="Settings"
                            className={`${circle(false)} !bg-[var(--color-accent)] !text-[var(--on-accent)] text-sm font-bold`}
                        >
                            {userName.charAt(0).toUpperCase()}
                        </button>
                    </div>
                </div>
            </header>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                data={data}
                settings={settings}
                todayMinutes={todayMinutes}
                totalMinutes={totalMinutes}
                onImport={onImport}
                onClearAll={onClearAll}
                onSettingsChange={onSettingsChange}
                // Auth props
                user={user}
                isAuthLoading={isAuthLoading}
                isSyncing={isSyncing}
                syncStatus={syncStatus}
                onSignIn={onSignIn}
                onSignOut={onSignOut}
                isFirebaseConfigured={isFirebaseConfigured}
            />
        </>
    )
}

export default Header
