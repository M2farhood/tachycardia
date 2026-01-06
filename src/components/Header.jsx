import { useState } from 'react'
import { Settings } from 'lucide-react'
import SettingsModal from './SettingsModal'

const Header = ({
    data,
    settings,
    todayMinutes = 0,
    totalMinutes = 0,
    onImport,
    onClearAll,
    onSettingsChange
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
                        <p className="text-sm font-medium uppercase tracking-widest text-white/40 mb-1">
                            Dashboard
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            {getGreeting()}, {userName}
                        </h1>
                    </div>

                    {/* Right side - Avatar & Settings */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2.5 rounded-full glass-panel-subtle liquid-press touch-target"
                            title="Settings"
                        >
                            <Settings size={18} className="text-white/60" />
                        </button>

                        {/* User Avatar with glow */}
                        <div className="w-12 h-12 rounded-full glow-avatar overflow-hidden bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                            <span className="text-xl font-bold text-white">
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
            />
        </>
    )
}

export default Header
