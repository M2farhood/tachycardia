import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CalendarDayColumn from './CalendarDayColumn'
import { localDateKey, addDays, parseLocalDateKey } from '../utils/dateKeys'
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

const formatDayTitle = (date) =>
    `${FULL_DAY_LABELS[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`

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
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask
}) => {
    const todayKey = localDateKey()
    // Opens on today, big. 'week' shows the 7 days; clicking a day opens it.
    const [view, setView] = useState('day')
    const [dayKey, setDayKey] = useState(todayKey)
    const isDesktop = useIsDesktop()

    const firstDay = WEEK_START_OFFSETS[weekStart] ?? WEEK_START_OFFSETS.sat
    const dayDate = parseLocalDateKey(dayKey)
    const weekStartDate = getWeekStart(dayDate, firstDay)

    const describe = (d) => {
        const key = localDateKey(d)
        return {
            dateKey: key,
            dayLabel: DAY_LABELS[d.getDay()],
            fullDayLabel: FULL_DAY_LABELS[d.getDay()],
            dateNum: d.getDate(),
            month: MONTH_NAMES[d.getMonth()],
            isToday: key === todayKey
        }
    }
    const weekDays = Array.from({ length: 7 }, (_, i) => describe(addDays(weekStartDate, i)))
    const onToday = view === 'day' ? dayKey === todayKey : weekDays.some(d => d.isToday)

    const step = (dir) => setDayKey(localDateKey(addDays(dayDate, dir * (view === 'day' ? 1 : 7))))
    const openDay = (key) => { setDayKey(key); setView('day') }

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

    const dayProps = (day) => ({
        ...day,
        tasks: tasks[day.dateKey],
        carryOver: day.isToday ? carryOver : [],
        listItems: listTasks[day.dateKey] || [],
        onToggleListItem: onToggleListTask,
        onOpenDay: openDay,
        onAddTask, onToggleTask, onEditTask, onDeleteTask,
        onAddSubtask, onToggleSubtask, onDeleteSubtask
    })

    const unit = view === 'day' ? 'day' : 'week'

    return (
        <div className="flex flex-col animate-fade-in px-4 sm:px-6 pb-8 max-w-[1600px] mx-auto w-full">
            {/* Header: where you are, arrows, Day | Week */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <h2 dir="ltr" className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {view === 'day' ? formatDayTitle(dayDate) : formatWeekRange(weekStartDate)}
                    {view === 'day' && dayKey === todayKey && <span className="ml-2 text-[15px] font-medium text-accent">Today</span>}
                </h2>
                <div className="flex items-center gap-1">
                    {!onToday && (
                        <button
                            onClick={() => setDayKey(todayKey)}
                            className="px-3 h-9 mr-1 rounded-full text-[13px] font-medium text-accent border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
                        >
                            Today
                        </button>
                    )}
                    <button
                        onClick={() => step(-1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[var(--surface-2)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label={`Previous ${unit}`}
                        title={`Previous ${unit}`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => step(1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[var(--surface-2)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label={`Next ${unit}`}
                        title={`Next ${unit}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                    <div className="ml-2 flex p-1 rounded-full bg-[var(--surface-2)]" role="tablist" aria-label="Calendar view">
                        {[['day', 'Day'], ['week', 'Week']].map(([key, text]) => (
                            <button
                                key={key}
                                role="tab"
                                aria-selected={view === key}
                                onClick={() => setView(key)}
                                className={`px-4 h-8 rounded-full text-[13px] font-medium transition-colors ${view === key
                                    ? 'bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                            >
                                {text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {view === 'day' ? (
                <div className="border-t border-[var(--border-subtle)] pt-2">
                    <CalendarDayColumn key={dayKey} variant="day" {...dayProps(describe(dayDate))} />
                </div>
            ) : isDesktop ? (
                <div className="grid grid-cols-7 min-h-[calc(100vh-240px)] border-t border-[var(--border-subtle)] pt-4">
                    {weekDays.map(day => (
                        <CalendarDayColumn key={day.dateKey} variant="column" {...dayProps(day)} />
                    ))}
                </div>
            ) : (
                <div className="border-t border-[var(--border-subtle)] pt-2">
                    {weekDays.map(day => (
                        <CalendarDayColumn key={day.dateKey} variant="stack" {...dayProps(day)} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default CalendarPage
