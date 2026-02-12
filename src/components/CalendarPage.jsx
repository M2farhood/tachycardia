import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarStorage } from '../hooks/useCalendarStorage'
import CalendarDayColumn from './CalendarDayColumn'

// Get the Saturday that starts the week containing `date`
const getWeekStartSaturday = (date) => {
    const d = new Date(date)
    const day = d.getDay() // 0=Sun, 6=Sat
    const offset = (day + 1) % 7
    d.setDate(d.getDate() - offset)
    d.setHours(0, 0, 0, 0)
    return d
}

const DAY_LABELS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const FULL_DAY_LABELS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const formatDateKey = (d) => d.toISOString().split('T')[0]
const formatWeekRange = (start) => {
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const sameMonth = start.getMonth() === end.getMonth()
    if (sameMonth) {
        return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`
    }
    return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`
}

const CalendarPage = () => {
    const { tasks, addTask, toggleTask, deleteTask, editTask, clearDay } = useCalendarStorage()
    const [weekOffset, setWeekOffset] = useState(0)

    const today = useMemo(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d
    }, [])

    const todayKey = formatDateKey(today)

    const weekStart = useMemo(() => {
        const base = getWeekStartSaturday(today)
        base.setDate(base.getDate() + weekOffset * 7)
        return base
    }, [today, weekOffset])

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart)
            d.setDate(d.getDate() + i)
            return {
                date: d,
                dateKey: formatDateKey(d),
                dayLabel: DAY_LABELS[i],
                fullDayLabel: FULL_DAY_LABELS[i],
                dateNum: d.getDate(),
                month: MONTH_NAMES[d.getMonth()],
                isToday: formatDateKey(d) === todayKey
            }
        })
    }, [weekStart, todayKey])

    return (
        <div className="calendar-page">
            {/* Sticky week header */}
            <div className="calendar-header">
                <button
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    className="calendar-nav-btn"
                    title="Previous week"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="text-center">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">
                        {formatWeekRange(weekStart)}
                    </h2>
                    {weekOffset !== 0 && (
                        <button
                            onClick={() => setWeekOffset(0)}
                            className="text-[11px] text-[var(--color-accent)] hover:underline mt-0.5"
                        >
                            Back to this week
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    className="calendar-nav-btn"
                    title="Next week"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Full-page vertical day list */}
            <div className="calendar-vertical-list">
                {weekDays.map(day => (
                    <CalendarDayColumn
                        key={day.dateKey}
                        dateKey={day.dateKey}
                        dayLabel={day.dayLabel}
                        fullDayLabel={day.fullDayLabel}
                        dateNum={day.dateNum}
                        month={day.month}
                        isToday={day.isToday}
                        tasks={tasks[day.dateKey]}
                        onAddTask={addTask}
                        onToggleTask={toggleTask}
                        onEditTask={editTask}
                        onDeleteTask={deleteTask}
                        onClearDay={clearDay}
                    />
                ))}
            </div>
        </div>
    )
}

export default CalendarPage
