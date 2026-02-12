import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Plus, Trash2 } from 'lucide-react'
import CalendarTaskItem from './CalendarTaskItem'

const CalendarDayColumn = ({ dateKey, dayLabel, fullDayLabel, dateNum, month, isToday, tasks, onAddTask, onToggleTask, onEditTask, onDeleteTask, onClearDay }) => {
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
        <div className={`calendar-day-row ${isToday ? 'calendar-day-today' : ''}`}>
            {/* Left: date badge */}
            <div className="calendar-date-badge">
                <span className={`calendar-date-num ${isToday ? 'calendar-date-today' : ''}`}>
                    {dateNum}
                </span>
                <div className="calendar-date-meta">
                    <span className={`calendar-day-name ${isToday ? 'text-[var(--color-accent)]' : ''}`}>
                        {fullDayLabel}
                    </span>
                    <span className="calendar-month-label">{month}</span>
                </div>
            </div>

            {/* Right: tasks area */}
            <div className="calendar-tasks-area">
                {dayTasks.length > 0 ? (
                    <div className="calendar-tasks-list">
                        {dayTasks.map(task => (
                            <CalendarTaskItem
                                key={task.id}
                                task={task}
                                onToggle={() => onToggleTask(dateKey, task.id)}
                                onEdit={(newText) => onEditTask(dateKey, task.id, newText)}
                                onDelete={() => onDeleteTask(dateKey, task.id)}
                            />
                        ))}
                    </div>
                ) : !adding ? (
                    <p className="text-[12px] text-[var(--color-text-tertiary)] italic py-1">No tasks</p>
                ) : null}

                {/* Inline add input */}
                {adding && (
                    <input
                        ref={inputRef}
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleAdd()
                            if (e.key === 'Escape') { setAdding(false); setNewText('') }
                        }}
                        onBlur={() => { if (!newText.trim()) setAdding(false) }}
                        className="calendar-add-input"
                        placeholder="New task... (Enter to add, Esc to cancel)"
                    />
                )}
            </div>

            {/* Three-dot menu */}
            <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="calendar-day-menu-btn"
                    title="Day options"
                >
                    <MoreVertical size={16} />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 glass-panel rounded-lg py-1 min-w-[140px] animate-fade-in shadow-lg">
                        <button
                            onClick={() => { setMenuOpen(false); setAdding(true) }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-white/5 transition-colors"
                        >
                            <Plus size={14} /> Add task
                        </button>
                        {dayTasks.length > 0 && (
                            <button
                                onClick={() => { setMenuOpen(false); onClearDay(dateKey) }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                            >
                                <Trash2 size={14} /> Clear all
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CalendarDayColumn
