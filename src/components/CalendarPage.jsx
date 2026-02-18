import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Circle, Clock } from 'lucide-react'
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

const CalendarPage = ({ isFocusMode = false }) => {
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

    if (isFocusMode) {
        const todaysTasks = tasks[todayKey] || []

        return (
            <div className="flex flex-col items-center min-h-[60vh] animate-fade-in max-w-2xl mx-auto w-full pt-12">
                <h2 className="text-3xl font-bold text-white mb-12 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse box-shadow-glow"></span>
                    Today's Timeline
                </h2>

                <div className="w-full relative pl-8 border-l-2 border-white/10 ml-4 space-y-12 pb-20">
                    {todaysTasks.length === 0 ? (
                        <div className="text-white/40 italic pl-4">No tasks scheduled for today. Enjoy your freedom!</div>
                    ) : (
                        todaysTasks.map((task, idx) => (
                            <div key={task.id} className="relative group">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-[#0a0c10] ${task.completed ? 'bg-green-500' : 'bg-blue-500'} transition-colors`}></div>

                                <div className={`p-6 rounded-2xl border transition-all ${task.completed
                                        ? 'bg-white/5 border-transparent opacity-50'
                                        : 'bg-white/10 border-white/10 hover:border-blue-500/50 hover:bg-white/15'
                                    }`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className={`text-xl font-medium mb-2 ${task.completed ? 'line-through text-white/50' : 'text-white'}`}>
                                                {task.text}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-white/40">
                                                {task.time && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock size={14} /> {task.time}
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                                                    {task.category || 'General'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => toggleTask(todayKey, task.id)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${task.completed
                                                    ? 'bg-green-500 border-green-500 text-black'
                                                    : 'border-white/30 hover:border-white text-transparent'
                                                }`}
                                        >
                                            <Circle size={16} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )
    }

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
