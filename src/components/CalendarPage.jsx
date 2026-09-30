import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CalendarDayColumn from './CalendarDayColumn'
import { localDateKey, addDays } from '../utils/dateKeys'
import { WEEK_START_OFFSETS } from '../utils/settingsDefaults'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] // by JS getDay()
const FULL_DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CARRY_OVER_DAYS = 14

// First day of the week containing `date`, given the JS getDay() of the first column.
const getWeekStart = (date, firstDay) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return addDays(d, -((d.getDay() - firstDay + 7) % 7))
}

const formatWeekRange = (start) => {
    const end = addDays(start, 6)
    if (start.getMonth() === end.getMonth()) {
        return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`
    }
    return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`
}

// True at >= 1024px (Tailwind `lg`).
const useIsDesktop = () => {
    const query = '(min-width: 1024px)'
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
    useEffect(() => {
        const mq = window.matchMedia(query)
        const onChange = () => setMatches(mq.matches)
        mq.addEventListener('change', onChange)
        onChange()
        return () => mq.removeEventListener('change', onChange)
    }, [])
    return matches
}

const CalendarPage = ({
    // eslint-disable-next-line no-unused-vars
    isFocusMode = false, // accepted for compatibility; Focus mode lives elsewhere now
    weekStart = 'sat',
    carryOverTasks = false,
    listTasks = {},
    onToggleListTask,
    tasks = {},
    onAddTask,
    onToggleTask,
    onEditTask,
    onDeleteTask,
    onClearDay,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask
}) => {
    const [weekOffset, setWeekOffset] = useState(0)
    const [selectedKey, setSelectedKey] = useState(null)
    const isDesktop = useIsDesktop()

    const todayKey = localDateKey()
    const firstDay = WEEK_START_OFFSETS[weekStart] ?? WEEK_START_OFFSETS.sat

    const weekStartDate = useMemo(() => {
        const base = getWeekStart(new Date(), firstDay)
        return addDays(base, weekOffset * 7)
        // todayKey re-evaluates the base after midnight
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstDay, weekOffset, todayKey])

    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStartDate, i)
        const key = localDateKey(d)
        return {
            dateKey: key,
            dayLabel: DAY_LABELS[d.getDay()],
            fullDayLabel: FULL_DAY_LABELS[d.getDay()],
            dateNum: d.getDate(),
            month: MONTH_NAMES[d.getMonth()],
            isToday: key === todayKey
        }
    }), [weekStartDate, todayKey])

    const selected = weekDays.find(d => d.dateKey === selectedKey)
        || weekDays.find(d => d.isToday)
        || weekDays[0]

    // Unfinished tasks from the previous 14 days — display only.
    const carryOver = useMemo(() => {
        if (!carryOverTasks) return []
        const out = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        for (let i = 1; i <= CARRY_OVER_DAYS; i++) {
            const d = addDays(today, -i)
            const list = tasks[localDateKey(d)] || []
            list.filter(t => !t.completed).forEach(task => {
                out.push({
                    dateKey: localDateKey(d),
                    task,
                    label: `${DAY_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
                })
            })
        }
        return out
    }, [carryOverTasks, tasks, todayKey]) // eslint-disable-line react-hooks/exhaustive-deps

    const dayProps = {
        onAddTask, onToggleTask, onEditTask, onDeleteTask, onClearDay,
        onAddSubtask, onToggleSubtask, onDeleteSubtask
    }

    return (
        <div className="flex flex-col animate-fade-in px-4 sm:px-6 pb-8 max-w-[1600px] mx-auto w-full">
            {/* Week header */}
            <div className="flex items-center justify-between gap-2 py-4">
                <h2 dir="ltr" className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {formatWeekRange(weekStartDate)}
                </h2>
                <div className="flex items-center gap-1">
                    {weekOffset !== 0 && (
                        <button
                            onClick={() => { setWeekOffset(0); setSelectedKey(null) }}
                            className="px-3 h-9 mr-1 rounded-full text-[13px] font-medium text-accent border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
                        >
                            Today
                        </button>
                    )}
                    <button
                        onClick={() => setWeekOffset(prev => prev - 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[var(--surface-2)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Previous week"
                        title="Previous week"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setWeekOffset(prev => prev + 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[var(--surface-2)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Next week"
                        title="Next week"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {isDesktop ? (
                <div className="grid grid-cols-7 min-h-[calc(100vh-240px)] border-t border-[var(--border-subtle)] pt-4">
                    {weekDays.map(day => (
                        <CalendarDayColumn
                            key={day.dateKey}
                            variant="column"
                            {...day}
                            tasks={tasks[day.dateKey]}
                            carryOver={day.isToday ? carryOver : []}
                            listItems={listTasks[day.dateKey] || []}
                            onToggleListItem={onToggleListTask}
                            {...dayProps}
                        />
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-7 gap-1 pb-4" role="tablist" aria-label="Days of the week">
                        {weekDays.map(day => {
                            const isSel = day.dateKey === selected.dateKey
                            const hasTasks = (tasks[day.dateKey] || []).length > 0 || (listTasks[day.dateKey] || []).length > 0
                            return (
                                <button
                                    key={day.dateKey}
                                    role="tab"
                                    aria-selected={isSel}
                                    onClick={() => setSelectedKey(day.dateKey)}
                                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors min-w-0 ${isSel
                                        ? 'bg-[var(--surface-2)] border-[var(--border)]'
                                        : 'border-transparent hover:bg-[var(--surface-1)]'}`}
                                >
                                    <span className={`text-[11px] font-medium ${day.isToday ? 'text-accent' : 'text-[var(--text-tertiary)]'}`}>
                                        {day.dayLabel.charAt(0)}
                                    </span>
                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[15px] font-semibold tabular-nums ${day.isToday
                                        ? 'bg-accent text-on-accent'
                                        : 'text-[var(--text-primary)]'}`}>
                                        {day.dateNum}
                                    </span>
                                    <span className={`w-1 h-1 rounded-full ${hasTasks ? 'bg-accent' : 'bg-transparent'}`} />
                                </button>
                            )
                        })}
                    </div>
                    <CalendarDayColumn
                        key={selected.dateKey}
                        variant="panel"
                        {...selected}
                        tasks={tasks[selected.dateKey]}
                        carryOver={selected.isToday ? carryOver : []}
                        listItems={listTasks[selected.dateKey] || []}
                        onToggleListItem={onToggleListTask}
                        {...dayProps}
                    />
                </>
            )}
        </div>
    )
}

export default CalendarPage
