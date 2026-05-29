import { useState } from 'react'
import { Settings, Brain } from 'lucide-react'
import SettingsModal from './SettingsModal'

const Header = ({
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
    isFirebaseConfigured = false,
    isFocusMode = false,
    onToggleFocus = () => { }
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

    return (
        <>
            <header className="px-6 pt-8 pb-4 no-print">
                <div className="flex items-start justify-between">
                    {/* Left side - Greeting */}
                    <div>
                        <p className="text-xs sm:text-sm font-medium uppercase tracking-widest text-white/40 mb-1">
                            Dashboard
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            {getGreeting()}, {userName}
                        </h1>
                    </div>

                    {/* Right side - Avatar & Settings */}
                    <div className="flex items-center gap-3">
                        {/* Focus Mode Toggle */}
                        <button
                            onClick={onToggleFocus}
                            className={`p-2.5 rounded-full liquid-press touch-target transition-all ${isFocusMode
                                ? 'bg-accent text-white shadow-[0_0_20px_var(--color-accent-glow)]'
                                : 'glass-panel-subtle text-white/60 hover:text-white'
                                }`}
                            title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                        >
                            <Brain size={18} />
                        </button>

                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2.5 rounded-full glass-panel-subtle liquid-press touch-target"
                            title="Settings"
                        >
                            <Settings size={18} className="text-white/60" />
                        </button>

                        {/* User Avatar with glow */}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full glow-avatar overflow-hidden bg-accent flex items-center justify-center">
                            <span className="text-lg sm:text-xl font-bold text-white">
                                {userName.charAt(0).toUpperCase()}
                            </span>
                        </div>
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
                onImportTasks={onImportTasks}
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
