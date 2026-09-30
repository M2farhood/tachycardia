import { useState, useRef, useEffect } from 'react'
import { Check, Trash2, Plus, Pencil, ChevronRight, ChevronDown } from 'lucide-react'

const CalendarTaskCard = ({
    task,
    onToggle,
    onEdit,
    onDelete,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask,
    large = false
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(task.text)
    const [isExpanded, setIsExpanded] = useState(false)
    const [newSubtask, setNewSubtask] = useState('')

    const inputRef = useRef(null)

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
        <div className={`group relative ${large ? 'py-3.5' : 'py-2.5'} border-b border-[var(--border-subtle)] last:border-b-0 transition-colors`}>
            {/* Header / Main Task */}
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                    onClick={onToggle}
                    aria-label={task.completed ? 'Mark not done' : 'Mark done'}
                    className={`
                        ${large ? 'mt-0.5 w-6 h-6' : 'mt-0.5 w-5 h-5'} rounded-md border-[1.5px] flex items-center justify-center transition-all flex-shrink-0
                        ${task.completed
                            ? 'bg-[var(--color-success)] border-[var(--color-success)] text-on-accent'
                            : 'border-[var(--text-tertiary)] hover:border-[var(--text-secondary)] text-transparent'
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
                            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-accent"
                        />
                    ) : (
                        <div>
                            <p
                                onClick={() => setIsExpanded(!isExpanded)}
                                onDoubleClick={() => setIsEditing(true)}
                                className={`
                                    ${large ? 'text-[16px] sm:text-[17px]' : 'text-sm'} leading-snug cursor-pointer select-none transition-colors
                                    ${task.completed
                                        ? 'text-[var(--text-tertiary)] line-through'
                                        : 'text-[var(--text-primary)] font-medium'
                                    }
                                `}
                            >
                                {task.text}
                            </p>

                            {/* Subtask Progress indicator (if collapsed and has subtasks) */}
                            {subtasks.length > 0 && !isExpanded && (
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="h-1 flex-1 bg-[var(--surface-3)] rounded-full overflow-hidden max-w-[60px]">
                                        <div
                                            className="h-full bg-accent rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-[var(--text-tertiary)]">
                                        {completedSubtasks}/{subtasks.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions: edit + delete, no hidden menu */}
                {/* In the narrow week columns they take no room until hovered */}
                <div className={`items-center flex-shrink-0 opacity-60 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${large ? 'flex' : 'flex md:hidden md:group-hover:flex md:group-focus-within:flex'}`}>
                    <button
                        onClick={() => setIsEditing(true)}
                        aria-label={`Edit ${task.text}`}
                        title="Edit"
                        className="p-1.5 hover:bg-[var(--surface-2)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        onClick={onDelete}
                        aria-label={`Delete ${task.text}`}
                        title="Delete"
                        className="p-1.5 hover:bg-[var(--surface-2)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--color-danger)]"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Expander Arrow (only if items exist or expanded) */}
            {(subtasks.length > 0 || isExpanded) && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-label="Toggle subtasks"
                    className="absolute bottom-2 right-0 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
            )}

            {/* Subtasks Section */}
            {isExpanded && (
                <div className="mt-2 ml-8 pl-3 border-l border-[var(--border)] space-y-2">
                    {subtasks.map(sub => (
                        <div key={sub.id} className="flex items-center gap-2 group/sub">
                            <button
                                onClick={() => onToggleSubtask(sub.id)}
                                className={`
                                    w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors
                                    ${sub.completed ? 'bg-accent border-accent text-on-accent' : 'border-[var(--text-tertiary)] hover:border-[var(--text-secondary)]'}
                                `}
                            >
                                {sub.completed && <Check size={8} strokeWidth={4} />}
                            </button>
                            <span className={`text-[12px] flex-1 ${sub.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'}`}>
                                {sub.text}
                            </span>
                            <button
                                onClick={() => onDeleteSubtask(sub.id)}
                                className="opacity-60 md:opacity-0 group-hover/sub:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-[var(--color-danger)] transition-all"
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
                            className="bg-transparent text-[12px] text-[var(--text-secondary)] placeholder-[var(--text-tertiary)] focus:outline-none flex-1 min-w-0"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export default CalendarTaskCard
