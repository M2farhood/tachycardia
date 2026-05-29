import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Pencil, Trash2, Check } from 'lucide-react'

const CalendarTaskItem = ({ task, onToggle, onEdit, onDelete }) => {
    const [menuOpen, setMenuOpen] = useState(false)
    const [editing, setEditing] = useState(false)
    const [editText, setEditText] = useState(task.text)
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

    // Focus input when entering edit mode
    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [editing])

    const handleSave = () => {
        const trimmed = editText.trim()
        if (trimmed && trimmed !== task.text) {
            onEdit(trimmed)
        }
        setEditing(false)
        setEditText(task.text)
    }

    if (editing) {
        return (
            <div className="flex items-center gap-2 py-1.5">
                <input
                    ref={inputRef}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') handleSave()
                        if (e.key === 'Escape') { setEditing(false); setEditText(task.text) }
                    }}
                    onBlur={handleSave}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors"
                    placeholder="Task name..."
                />
            </div>
        )
    }

    return (
        <div className="calendar-task group flex items-center gap-2.5 py-1.5">
            {/* Checkbox */}
            <button
                onClick={onToggle}
                className={`custom-checkbox flex-shrink-0 ${task.completed ? 'checked' : ''}`}
                style={{ width: 20, height: 20, borderWidth: '1.5px' }}
            >
                {task.completed && <Check size={12} strokeWidth={3} className="text-white" />}
            </button>

            {/* Text */}
            <span className={`flex-1 text-sm leading-snug transition-colors ${task.completed
                    ? 'line-through text-[var(--color-text-tertiary)]'
                    : 'text-[var(--color-text-primary)]'
                }`}>
                {task.text}
            </span>

            {/* Three-dot menu */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity focus:opacity-60"
                    title="Options"
                >
                    <MoreVertical size={14} className="text-[var(--color-text-secondary)]" />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 surface rounded-lg py-1 min-w-[120px] animate-fade-in shadow-lg">
                        <button
                            onClick={() => { setMenuOpen(false); setEditing(true) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
                        >
                            <Pencil size={12} /> Edit
                        </button>
                        <button
                            onClick={() => { setMenuOpen(false); onDelete() }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-red-400 hover:bg-[var(--surface-2)] transition-colors"
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CalendarTaskItem
