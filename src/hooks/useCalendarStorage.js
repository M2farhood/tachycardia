import { useState, useEffect, useCallback } from 'react'

const CALENDAR_KEY = 'study_tracker_calendar'

export const useCalendarStorage = () => {
    const [tasks, setTasks] = useState(() => {
        try {
            const stored = localStorage.getItem(CALENDAR_KEY)
            if (stored) return JSON.parse(stored)
        } catch (e) {
            console.error('Error reading calendar data:', e)
        }
        return {}
    })

    // Persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(CALENDAR_KEY, JSON.stringify(tasks))
        } catch (e) {
            console.error('Error saving calendar data:', e)
        }
    }, [tasks])

    const addTask = useCallback((dateKey, text) => {
        setTasks(prev => ({
            ...prev,
            [dateKey]: [
                ...(prev[dateKey] || []),
                {
                    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    text,
                    completed: false,
                    subtasks: []
                }
            ]
        }))
    }, [])

    const toggleTask = useCallback((dateKey, taskId) => {
        setTasks(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).map(t =>
                t.id === taskId ? { ...t, completed: !t.completed } : t
            )
        }))
    }, [])

    const deleteTask = useCallback((dateKey, taskId) => {
        setTasks(prev => {
            const updated = (prev[dateKey] || []).filter(t => t.id !== taskId)
            const next = { ...prev }
            if (updated.length === 0) {
                delete next[dateKey]
            } else {
                next[dateKey] = updated
            }
            return next
        })
    }, [])

    const editTask = useCallback((dateKey, taskId, newText) => {
        setTasks(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).map(t =>
                t.id === taskId ? { ...t, text: newText } : t
            )
        }))
    }, [])

    const addSubtask = useCallback((dateKey, taskId, text) => {
        setTasks(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).map(t => {
                if (t.id !== taskId) return t
                return {
                    ...t,
                    subtasks: [
                        ...(t.subtasks || []),
                        {
                            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                            text,
                            completed: false
                        }
                    ]
                }
            })
        }))
    }, [])

    const toggleSubtask = useCallback((dateKey, taskId, subtaskId) => {
        setTasks(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).map(t => {
                if (t.id !== taskId) return t
                return {
                    ...t,
                    subtasks: (t.subtasks || []).map(s =>
                        s.id === subtaskId ? { ...s, completed: !s.completed } : s
                    )
                }
            })
        }))
    }, [])

    const deleteSubtask = useCallback((dateKey, taskId, subtaskId) => {
        setTasks(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).map(t => {
                if (t.id !== taskId) return t
                return {
                    ...t,
                    subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId)
                }
            })
        }))
    }, [])

    const clearDay = useCallback((dateKey) => {
        setTasks(prev => {
            const next = { ...prev }
            delete next[dateKey]
            return next
        })
    }, [])

    return { tasks, addTask, toggleTask, deleteTask, editTask, clearDay, addSubtask, toggleSubtask, deleteSubtask }
}
