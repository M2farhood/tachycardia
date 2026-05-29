import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Plus, Trash2 } from 'lucide-react'
import CalendarTaskCard from './CalendarTaskCard'

const CalendarDayColumn = ({
    dateKey,
    dayLabel,
    fullDayLabel,
    dateNum,
    month,
    isToday,
    tasks,
    onAddTask,
    onToggleTask,
    onEditTask,
    onDeleteTask,
    onClearDay,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask
}) => {
    const [menuOpen, setMenuOpen] = useState(false)
    const [adding, setAdding] = useState(false)
    const [newText, setNewText] = useState('')
    const menuRef = useRef(null)
    const inputRef = useRef(null)

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return
        const close = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [menuOpen])

    // Focus input when entering add mode
    useEffect(() => {
        if (adding && inputRef.current) inputRef.current.focus()
    }, [adding])

    const handleAdd = () => {
        const trimmed = newText.trim()
        if (trimmed) {
            onAddTask(dateKey, trimmed)
            setNewText('')
            // Keep adding mode open for rapid entry
            setTimeout(() => inputRef.current?.focus(), 50)
            return
        }
        setAdding(false)
    }

    const dayTasks = tasks || []

    return (
        <div className={`
            calendar-day-card min-w-[300px] max-w-[350px] flex-shrink-0 h-full flex flex-col rounded-2xl border transition-all duration-300
            ${isToday ? 'bg-accent/5 border-accent/30' : 'bg-[#12141a] border-white/5'}
        `}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`
                        w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-lg
                        ${isToday ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-white/5 text-white/60'}
                    `}>
                        {dateNum}
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-sm font-medium ${isToday ? 'text-accent' : 'text-white/80'}`}>
                            {fullDayLabel}
                        </span>
                        <span className="text-xs text-white/40 uppercase tracking-wider">{month}</span>
                    </div>
                </div>

                {/* Menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-colors"
                    >
                        <MoreVertical size={16} />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 z-50 glass-panel border border-white/10 rounded-xl py-1 min-w-[140px] shadow-xl animate-fade-in">
                            <button
                                onClick={() => { setMenuOpen(false); setAdding(true) }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors"
                            >
                                <Plus size={14} /> Add task
                            </button>
                            {dayTasks.length > 0 && (
                                <button
                                    onClick={() => { setMenuOpen(false); onClearDay(dateKey) }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                                >
                                    <Trash2 size={14} /> Clear all
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Tasks Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {dayTasks.length > 0 ? (
                    dayTasks.map(task => (
                        <CalendarTaskCard
                            key={task.id}
                            task={task}
                            onToggle={() => onToggleTask(dateKey, task.id)}
                            onEdit={(newText) => onEditTask(dateKey, task.id, newText)}
                            onDelete={() => onDeleteTask(dateKey, task.id)}
                            onAddSubtask={(text) => onAddSubtask && onAddSubtask(dateKey, task.id, text)}
                            onToggleSubtask={(subId) => onToggleSubtask && onToggleSubtask(dateKey, task.id, subId)}
                            onDeleteSubtask={(subId) => onDeleteSubtask && onDeleteSubtask(dateKey, task.id, subId)}
                        />
                    ))
                ) : !adding && (
                    <div className="h-full flex flex-col items-center justify-center text-white/20">
                        <p className="text-sm italic">No tasks yet</p>
                    </div>
                )}
            </div>

            {/* Bottom Add Input */}
            <div className="p-3 border-t border-white/5 bg-black/20 rounded-b-2xl">
                {adding ? (
                    <input
                        ref={inputRef}
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleAdd()
                            if (e.key === 'Escape') { setAdding(false); setNewText('') }
                        }}
                        onBlur={() => { if (!newText.trim()) setAdding(false) }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                        placeholder="New task... (Enter to add)"
                    />
                ) : (
                    <button
                        onClick={() => setAdding(true)}
                        className="w-full py-2 flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all border border-dashed border-white/10 hover:border-white/20"
                    >
                        <Plus size={14} /> Add Task
                    </button>
                )}
            </div>
        </div>
    )
}

export default CalendarDayColumn
