import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Check, Trash2, Plus, ChevronRight, ChevronDown } from 'lucide-react'

const CalendarTaskCard = ({
    task,
    onToggle,
    onEdit,
    onDelete,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(task.text)
    const [isExpanded, setIsExpanded] = useState(false)
    const [newSubtask, setNewSubtask] = useState('')
    const [showMenu, setShowMenu] = useState(false)

    const inputRef = useRef(null)
    const menuRef = useRef(null)

    // Close menu on outside click
    useEffect(() => {
        if (!showMenu) return
        const close = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [showMenu])

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleSave = () => {
        const trimmed = editValue.trim()
        if (trimmed && trimmed !== task.text) {
            onEdit(trimmed)
        } else {
            setEditValue(task.text)
        }
        setIsEditing(false)
    }

    const handleAddSubtask = () => {
        if (newSubtask.trim()) {
            onAddSubtask(newSubtask.trim())
            setNewSubtask('')
        }
    }

    const subtasks = task.subtasks || []
    const completedSubtasks = subtasks.filter(s => s.completed).length
    const progress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0

    return (
        <div className={`
            group relative p-3 rounded-xl border transition-all duration-200
            ${task.completed
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-white/5 border-white/10 hover:border-accent/30 hover:bg-white/10'
            }
        `}>
            {/* Header / Main Task */}
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                    onClick={onToggle}
                    className={`
                        mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0
                        ${task.completed
                            ? 'bg-green-500 border-green-500 text-black'
                            : 'border-white/30 hover:border-white/60 text-transparent'
                        }
                    `}
                >
                    <Check size={12} strokeWidth={3} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave()
                                if (e.key === 'Escape') {
                                    setEditValue(task.text)
                                    setIsEditing(false)
                                }
                            }}
                            className="w-full bg-black/20 rounded px-2 py-1 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                    ) : (
                        <div>
                            <p
                                onClick={() => setIsExpanded(!isExpanded)}
                                onDoubleClick={() => setIsEditing(true)}
                                className={`
                                    text-sm leading-snug cursor-pointer select-none transition-colors
                                    ${task.completed
                                        ? 'text-[var(--color-text-tertiary)] line-through'
                                        : 'text-[var(--color-text-primary)] font-medium'
                                    }
                                `}
                            >
                                {task.text}
                            </p>

                            {/* Subtask Progress indicator (if collapsed and has subtasks) */}
                            {subtasks.length > 0 && !isExpanded && (
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden max-w-[60px]">
                                        <div
                                            className="h-full bg-accent/50 rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-[var(--color-text-tertiary)]">
                                        {completedSubtasks}/{subtasks.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions Menu */}
                <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 hover:bg-white/10 rounded-lg text-[var(--color-text-tertiary)] hover:text-white"
                    >
                        <MoreVertical size={14} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 z-50 surface rounded-lg py-1 min-w-[120px] shadow-xl animate-fade-in">
                            <button
                                onClick={() => { setShowMenu(false); setIsEditing(true) }}
                                className="w-full text-left px-3 py-2 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => { setShowMenu(false); onDelete() }}
                                className="w-full text-left px-3 py-2 text-[11px] text-red-400 hover:bg-[var(--surface-2)] transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Expander Arrow (only if items exist or expanded) */}
            {(subtasks.length > 0 || isExpanded) && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="absolute bottom-2 right-2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
            )}

            {/* Subtasks Section */}
            {isExpanded && (
                <div className="mt-3 pl-2 border-l border-white/10 space-y-2">
                    {subtasks.map(sub => (
                        <div key={sub.id} className="flex items-center gap-2 group/sub">
                            <button
                                onClick={() => onToggleSubtask(sub.id)}
                                className={`
                                    w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors
                                    ${sub.completed ? 'bg-accent border-accent' : 'border-white/20 hover:border-white/40'}
                                `}
                            >
                                {sub.completed && <Check size={8} strokeWidth={4} className="text-white" />}
                            </button>
                            <span className={`text-[11px] flex-1 ${sub.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'}`}>
                                {sub.text}
                            </span>
                            <button
                                onClick={() => onDeleteSubtask(sub.id)}
                                className="opacity-0 group-hover/sub:opacity-100 p-0.5 text-[var(--text-tertiary)] hover:text-red-400 transition-all"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    ))}

                    {/* Add Subtask Input */}
                    <div className="flex items-center gap-2 mt-2 pt-1">
                        <Plus size={12} className="text-[var(--text-tertiary)]" />
                        <input
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                            placeholder="Add subtask..."
                            className="bg-transparent text-[11px] text-[var(--text-secondary)] placeholder-[var(--text-tertiary)] focus:outline-none flex-1 min-w-0"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export default CalendarTaskCard
