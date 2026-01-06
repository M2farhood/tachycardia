import { useState, useRef } from 'react'
import { X, Upload, Download, Trash2, Clock, Printer, User, MoreHorizontal, BarChart2, Sun, Moon } from 'lucide-react'
import { exportData, importData, getStorageUsage } from '../utils/exportImport'
import ConfirmDialog from './ConfirmDialog'
import PrintModal from './PrintModal'
import PerformanceModal from './PerformanceModal'

const SettingsModal = ({
    isOpen,
    onClose,
    data,
    settings,
    todayMinutes = 0,
    totalMinutes = 0,
    onImport,
    onClearAll,
    onSettingsChange
}) => {
    const [importError, setImportError] = useState(null)
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [showPrintModal, setShowPrintModal] = useState(false)
    const [showPerformance, setShowPerformance] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [nameValue, setNameValue] = useState(settings?.userName || '')
    const [showDataMenu, setShowDataMenu] = useState(false)
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
                <div className="glass-panel rounded-3xl shadow-2xl max-w-sm w-full animate-slide-up max-h-[85vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 glass-panel rounded-t-3xl">
                        <h2 className="text-lg font-bold text-white">Settings</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={18} className="text-white/50" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        {/* User Name */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <User size={14} className="text-white/40" />
                                <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Your Name</span>
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
                                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleNameSave}
                                        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl"
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
                                    className="w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-left text-white/80 text-sm transition-colors"
                                >
                                    {userName}
                                </button>
                            )}
                        </div>

                        {/* Theme Toggle */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                {theme === 'dark' ? (
                                    <Moon size={14} className="text-white/40" />
                                ) : (
                                    <Sun size={14} className="text-white/40" />
                                )}
                                <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Theme</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSettingsChange({ theme: 'dark' })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all liquid-press flex items-center justify-center gap-2 ${theme === 'dark'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                                        }`}
                                >
                                    <Moon size={14} />
                                    Dark
                                </button>
                                <button
                                    onClick={() => onSettingsChange({ theme: 'light' })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all liquid-press flex items-center justify-center gap-2 ${theme === 'light'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10'
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
                                <Clock size={14} className="text-white/40" />
                                <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Session Timer</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSettingsChange({ timerDuration: 25 })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all liquid-press ${timerDuration === 25
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                                        }`}
                                >
                                    25 min
                                </button>
                                <button
                                    onClick={() => onSettingsChange({ timerDuration: 50 })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all liquid-press ${timerDuration === 50
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                                        }`}
                                >
                                    50 min
                                </button>
                            </div>
                        </div>

                        {/* Performance Button */}
                        <button
                            onClick={() => setShowPerformance(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 text-white/90 text-sm font-medium rounded-xl transition-colors liquid-press border border-blue-500/20"
                        >
                            <BarChart2 size={16} />
                            View All Performance
                        </button>

                        {/* Print Button */}
                        <button
                            onClick={() => setShowPrintModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white/80 text-sm font-medium rounded-xl transition-colors liquid-press border border-white/5"
                        >
                            <Printer size={16} />
                            Print / Save as PDF
                        </button>

                        {/* Data row: Storage + Export/Import */}
                        <div className="flex items-center gap-3 py-2">
                            <div className="flex-1">
                                <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
                                    <span>Storage</span>
                                    <span>{storage.usedFormatted}</span>
                                </div>
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${storage.percent > 80 ? 'bg-red-500' : 'bg-blue-500/50'}`}
                                        style={{ width: `${Math.min(storage.percent, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setShowDataMenu(!showDataMenu)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 transition-colors"
                                    title="Import/Export"
                                >
                                    <MoreHorizontal size={16} />
                                </button>

                                {showDataMenu && (
                                    <div className="absolute right-0 bottom-full mb-2 glass-panel rounded-xl py-1 min-w-[100px] z-10 animate-fade-in shadow-xl">
                                        <button
                                            onClick={handleExport}
                                            className="w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 flex items-center gap-2"
                                        >
                                            <Download size={12} />
                                            Export
                                        </button>
                                        <button
                                            onClick={handleImportClick}
                                            className="w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 flex items-center gap-2"
                                        >
                                            <Upload size={12} />
                                            Import
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />

                        {importError && (
                            <p className="text-xs text-red-400 text-center bg-red-500/10 p-2 rounded-lg">
                                {importError}
                            </p>
                        )}

                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="w-full text-[10px] text-red-400/50 hover:text-red-400 py-1 transition-colors"
                        >
                            Clear All Data
                        </button>
                    </div>

                    {/* Footer credit */}
                    <div className="px-5 pb-4 pt-1 border-t border-white/5">
                        <p className="text-[10px] text-white/20 text-center">
                            Made with ❤️ in MUCOM & by Mohammed Farhood
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
            />
        </>
    )
}

export default SettingsModal
