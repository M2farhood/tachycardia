import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Plus, Trash2, Check } from 'lucide-react'
import CalendarTaskCard from './CalendarTaskCard'

/**
 * One day of the calendar.
 *  variant="column" — a hairline-separated column in the 7-up desktop grid.
 *  variant="panel"  — the single selected day on phones / tablets.
 * `carryOver` is a display-only list of { dateKey, task } for unfinished
 * tasks from earlier days (only passed for today).
 */
const CalendarDayColumn = ({
    variant = 'column',
    dateKey,
    dayLabel,
    fullDayLabel,
    dateNum,
    month,
    isToday,
    tasks,
    carryOver = [],
    // Tasks from the lists that were given this day: [{ tabId, tabTitle, topic }]
    listItems = [],
    onToggleListItem,
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
    const [newText, setNewText] = useState('')
    const menuRef = useRef(null)
    const inputRef = useRef(null)
    const isPanel = variant === 'panel'

    useEffect(() => {
        if (!menuOpen) return
        const close = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [menuOpen])

    const handleAdd = () => {
        const trimmed = newText.trim()
        if (!trimmed) return
        onAddTask(dateKey, trimmed)
        setNewText('')
        inputRef.current?.focus()
    }

    const dayTasks = tasks || []
    const doneCount = dayTasks.filter(t => t.completed).length
    const countLabel = dayTasks.length === 0 ? '' : `${doneCount}/${dayTasks.length}`

    const menu = (
        <div className="relative shrink-0" ref={menuRef}>
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Day options"
                className="p-2 hover:bg-[var(--surface-2)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
                <MoreVertical size={16} />
            </button>
            {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 surface rounded-xl py-1 min-w-[140px] shadow-xl animate-fade-in">
                    <button
                        onClick={() => { setMenuOpen(false); inputRef.current?.focus() }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                        <Plus size={14} /> Add task
                    </button>
                    {dayTasks.length > 0 && (
                        <button
                            onClick={() => { setMenuOpen(false); onClearDay(dateKey) }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[var(--color-danger)] hover:bg-[var(--surface-2)] transition-colors"
                        >
                            <Trash2 size={14} /> Clear all
                        </button>
                    )}
                </div>
            )}
        </div>
    )

    return (
        <section
            aria-label={fullDayLabel}
            className={`flex flex-col min-w-0 ${isPanel ? '' : 'h-full px-3 first:pl-0 last:pr-0 border-l border-[var(--border-subtle)] first:border-l-0'}`}
        >
            {/* Header */}
            {isPanel ? (
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                    <div className="flex items-baseline gap-3 min-w-0">
                        <span className={`text-3xl font-semibold tabular-nums ${isToday ? 'text-accent' : 'text-[var(--text-primary)]'}`}>{dateNum}</span>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                                {fullDayLabel}{isToday && <span className="text-accent"> · Today</span>}
                            </span>
                            <span className="text-[12px] text-[var(--text-tertiary)]">
                                {month}{countLabel && <> · <span dir="ltr">{countLabel}</span> done</>}
                            </span>
                        </div>
                    </div>
                    {menu}
                </div>
            ) : (
                <div className="flex items-start justify-between pb-3 border-b border-[var(--border)]">
                    <div className="min-w-0">
                        <span className={`block text-[11px] font-medium uppercase tracking-wider ${isToday ? 'text-accent' : 'text-[var(--text-tertiary)]'}`}>
                            {dayLabel}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center justify-center min-w-9 h-9 px-1 rounded-full text-xl font-semibold tabular-nums ${isToday ? 'bg-accent text-on-accent' : 'text-[var(--text-primary)]'}`}>
                                {dateNum}
                            </span>
                            {countLabel && (
                                <span dir="ltr" className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{countLabel}</span>
                            )}
                        </div>
                    </div>
                    {menu}
                </div>
            )}

            {/* Tasks */}
            <div className={`${isPanel ? 'pt-1' : 'flex-1 overflow-y-auto pt-1 custom-scrollbar'}`}>
                {listItems.map(({ tabId, tabTitle, topic }) => (
                    <div key={topic.id} className="flex items-start gap-3 py-2 border-b border-[var(--border-subtle)]">
                        <button
                            onClick={() => onToggleListItem?.(tabId, topic)}
                            aria-label={topic.completed ? `Mark ${topic.name} not done` : `Mark ${topic.name} done`}
                            className={`mt-0.5 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${topic.completed
                                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--on-accent)]'
                                : 'border-[var(--text-tertiary)] text-transparent hover:text-[var(--text-tertiary)]'}`}
                        >
                            <Check size={12} strokeWidth={3} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className={`text-sm leading-snug break-words ${topic.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>{topic.name}</p>
                            <p className="text-[11px] text-[var(--color-accent)]">{tabTitle}</p>
                        </div>
                    </div>
                ))}

                {carryOver.length > 0 && (
                    <div className="mb-3">
                        <p className="pt-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">From earlier</p>
                        {carryOver.map(({ dateKey: fromKey, task, label }) => (
                            <div key={`${fromKey}-${task.id}`} className="flex items-start gap-3 py-2 border-b border-[var(--border-subtle)] last:border-b-0">
                                <button
                                    onClick={() => onToggleTask(fromKey, task.id)}
                                    aria-label="Mark done"
                                    className="mt-0.5 w-5 h-5 rounded-md border-[1.5px] border-[var(--text-tertiary)] hover:border-[var(--text-secondary)] flex items-center justify-center flex-shrink-0 text-transparent hover:text-[var(--text-tertiary)]"
                                >
                                    <Check size={12} strokeWidth={3} />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm leading-snug text-[var(--text-secondary)] break-words">{task.text}</p>
                                    <p className="text-[11px] text-[var(--text-tertiary)]">{label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {dayTasks.length > 0 ? (
                    dayTasks.map(task => (
                        <CalendarTaskCard
                            key={task.id}
                            task={task}
                            onToggle={() => onToggleTask(dateKey, task.id)}
                            onEdit={(text) => onEditTask(dateKey, task.id, text)}
                            onDelete={() => onDeleteTask(dateKey, task.id)}
                            onAddSubtask={(text) => onAddSubtask && onAddSubtask(dateKey, task.id, text)}
                            onToggleSubtask={(subId) => onToggleSubtask && onToggleSubtask(dateKey, task.id, subId)}
                            onDeleteSubtask={(subId) => onDeleteSubtask && onDeleteSubtask(dateKey, task.id, subId)}
                        />
                    ))
                ) : carryOver.length === 0 && listItems.length === 0 && (
                    <p className="py-6 text-[13px] text-[var(--text-tertiary)]">Nothing planned.</p>
                )}
            </div>

            {/* Add field */}
            <div className="pt-2 mt-1 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                    <Plus size={14} className="text-[var(--text-tertiary)] shrink-0" />
                    <input
                        ref={inputRef}
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleAdd()
                            if (e.key === 'Escape') setNewText('')
                        }}
                        aria-label={`Add a task to ${fullDayLabel}`}
                        className="w-full min-w-0 bg-transparent py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none"
                        placeholder="Add a task"
                    />
                </div>
            </div>
        </section>
    )
}

export default CalendarDayColumn
