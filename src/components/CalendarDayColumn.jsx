import { useState, useRef } from 'react'
import { Plus, Check } from 'lucide-react'
import CalendarTaskCard from './CalendarTaskCard'

/**
 * One day of the calendar.
 *  variant="day"    — the big single-day view (the calendar opens on it).
 *  variant="column" — one of the 7 columns of the desktop week.
 *  variant="stack"  — one day in the phone week (a stacked list).
 * In the week variants the day's header opens that day big (onOpenDay).
 * `carryOver` is a display-only list of { dateKey, task, label } for unfinished
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
    onOpenDay,
    onAddTask,
    onToggleTask,
    onEditTask,
    onDeleteTask,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask
}) => {
    const [newText, setNewText] = useState('')
    const inputRef = useRef(null)
    const isDay = variant === 'day'
    const isStack = variant === 'stack'

    const handleAdd = () => {
        const trimmed = newText.trim()
        if (!trimmed) return
        onAddTask(dateKey, trimmed)
        setNewText('')
        inputRef.current?.focus()
    }

    const dayTasks = tasks || []
    // Unfinished first, finished at the bottom — in both kinds of task.
    const byDone = (a, b) => Number(!!a.completed) - Number(!!b.completed)
    const listSorted = [...listItems].sort((a, b) => byDone(a.topic, b.topic))
    const tasksSorted = [...dayTasks].sort(byDone)
    const total = listItems.length + dayTasks.length
    const done = listItems.filter(i => i.topic.completed).length + dayTasks.filter(t => t.completed).length
    const isEmpty = total === 0 && carryOver.length === 0

    const listRow = ({ tabId, tabTitle, topic }) => (
        <div key={topic.id} className={`flex items-start gap-3 border-b border-[var(--border-subtle)] ${isDay ? 'py-3.5' : 'py-2'}`}>
            <button
                onClick={() => onToggleListItem?.(tabId, topic)}
                aria-label={topic.completed ? `Mark ${topic.name} not done` : `Mark ${topic.name} done`}
                className={`mt-0.5 ${isDay ? 'w-6 h-6' : 'w-5 h-5'} rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${topic.completed
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--on-accent)]'
                    : 'border-[var(--text-tertiary)] text-transparent hover:text-[var(--text-tertiary)]'}`}
            >
                <Check size={isDay ? 14 : 12} strokeWidth={3} />
            </button>
            {isDay ? (
                <div className="min-w-0 flex-1 flex items-baseline justify-between gap-4">
                    <p className={`text-[16px] sm:text-[17px] leading-snug break-words min-w-0 ${topic.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)] font-medium'}`}>{topic.name}</p>
                    <span className="text-[12px] sm:text-[13px] text-[var(--color-accent)] flex-shrink-0 max-w-[40%] truncate">{tabTitle}</span>
                </div>
            ) : (
                <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug break-words ${topic.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>{topic.name}</p>
                    <p className="text-[11px] text-[var(--color-accent)]">{tabTitle}</p>
                </div>
            )}
        </div>
    )

    const header = isDay ? null : (
        <div className={`border-b border-[var(--border)] ${isStack ? '' : 'pb-2'}`}>
        <button
            onClick={() => onOpenDay?.(dateKey)}
            aria-label={`Open ${fullDayLabel} ${dateNum} ${month}`}
            title="Open this day"
            className={`w-full text-left flex items-center justify-between gap-2 rounded-lg px-2 -mx-2 hover:bg-[var(--surface-2)] transition-colors ${isStack ? 'py-2' : 'py-1'}`}
        >
            {isStack ? (
                <span className="flex items-baseline gap-2">
                    <span className={`text-[15px] font-semibold ${isToday ? 'text-accent' : 'text-[var(--text-primary)]'}`}>{fullDayLabel}</span>
                    <span className="text-[13px] text-[var(--text-tertiary)]">{dateNum} {month}{isToday && ' · Today'}</span>
                </span>
            ) : (
                <span className="min-w-0">
                    <span className={`block text-[11px] font-medium uppercase tracking-wider ${isToday ? 'text-accent' : 'text-[var(--text-tertiary)]'}`}>{dayLabel}</span>
                    <span className={`mt-0.5 inline-flex items-center justify-center min-w-9 h-9 px-1 rounded-full text-xl font-semibold tabular-nums ${isToday ? 'bg-accent text-on-accent' : 'text-[var(--text-primary)]'}`}>{dateNum}</span>
                </span>
            )}
            {total > 0 && (
                <span dir="ltr" className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{done}/{total}</span>
            )}
        </button>
        </div>
    )

    return (
        <section
            aria-label={`${fullDayLabel} ${dateNum} ${month}`}
            className={`flex flex-col min-w-0 ${variant === 'column' ? 'h-full px-3 first:pl-0 last:pr-0 border-l border-[var(--border-subtle)] first:border-l-0' : ''} ${isStack ? 'mb-4' : ''}`}
        >
            {header}

            <div className={variant === 'column' ? 'flex-1 overflow-y-auto pt-1 custom-scrollbar' : 'pt-1'}>
                {listSorted.map(listRow)}

                {tasksSorted.map(task => (
                    <CalendarTaskCard
                        key={task.id}
                        task={task}
                        large={isDay}
                        onToggle={() => onToggleTask(dateKey, task.id)}
                        onEdit={(text) => onEditTask(dateKey, task.id, text)}
                        onDelete={() => onDeleteTask(dateKey, task.id)}
                        onAddSubtask={(text) => onAddSubtask && onAddSubtask(dateKey, task.id, text)}
                        onToggleSubtask={(subId) => onToggleSubtask && onToggleSubtask(dateKey, task.id, subId)}
                        onDeleteSubtask={(subId) => onDeleteSubtask && onDeleteSubtask(dateKey, task.id, subId)}
                    />
                ))}

                {carryOver.length > 0 && (
                    <div className="mt-3">
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

                {isEmpty && (
                    <p className={`${isDay ? 'py-10 text-[15px]' : isStack ? 'py-2 text-[13px]' : 'py-6 text-[13px]'} text-[var(--text-tertiary)]`}>
                        {isDay ? `Nothing planned for ${isToday ? 'today' : fullDayLabel}.` : 'Nothing planned.'}
                    </p>
                )}
            </div>

            {/* One add line per day (the phone week adds through the day view) */}
            {!isStack && (
                <div className={`${isDay ? 'mt-2 border-b border-[var(--border)] focus-within:border-[var(--color-accent)]' : 'pt-2 mt-1 border-t border-[var(--border-subtle)]'} transition-colors`}>
                    <div className="flex items-center gap-3">
                        <Plus size={isDay ? 20 : 14} className="text-[var(--text-tertiary)] shrink-0" />
                        <input
                            ref={inputRef}
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleAdd()
                                if (e.key === 'Escape') setNewText('')
                            }}
                            aria-label={`Add a task to ${fullDayLabel}`}
                            className={`w-full min-w-0 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none ${isDay ? 'py-4 text-[17px]' : 'py-2 text-[13px]'}`}
                            placeholder={isDay ? `Add a task for ${isToday ? 'today' : fullDayLabel}` : 'Add a task'}
                        />
                    </div>
                </div>
            )}
        </section>
    )
}

export default CalendarDayColumn
