import { useState, useEffect, useCallback } from 'react'
import { migrate, needsMigration, generateId } from '@study/core'

const STORAGE_KEY = 'study_tracker_data'
const LEGACY_CALENDAR_KEY = 'study_tracker_calendar'

// ISO timestamp helper for stamping per-entity updatedAt on every mutation.
const now = () => new Date().toISOString()

// One-time import of the old separate calendar localStorage key into the main
// data object (so it gets cloud sync). Stamps updatedAt so entries can merge.
// Returns { data, changed }. Leaves the legacy key for the caller to remove.
const importLegacyCalendar = (data) => {
    if (!data) return { data, changed: false }
    const alreadyHasCalendar = data.calendar && Object.keys(data.calendar).length > 0
    if (alreadyHasCalendar) return { data, changed: false }

    let legacy = null
    try {
        legacy = JSON.parse(localStorage.getItem(LEGACY_CALENDAR_KEY) || 'null')
    } catch {
        legacy = null
    }
    if (!legacy || Object.keys(legacy).length === 0) return { data, changed: false }

    const stamp = data.updatedAt || now()
    const calendar = {}
    for (const [dateKey, list] of Object.entries(legacy)) {
        calendar[dateKey] = (list || []).map((task) => ({
            ...task,
            updatedAt: task.updatedAt || stamp,
            subtasks: (task.subtasks || []).map((s) => ({ ...s, updatedAt: s.updatedAt || stamp })),
        }))
    }
    return { data: { ...data, calendar, updatedAt: now() }, changed: true }
}

export const useLocalStorage = (initialValue) => {
    // Initialize state from localStorage or use initial value
    const [data, setData] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                const migrated = migrate(parsed)
                // Pull the old standalone calendar key into the main data object.
                const { data: upgraded, changed: calendarImported } = importLegacyCalendar(migrated)
                // Persist immediately if the load upgraded the schema or imported
                // the calendar, so the on-disk copy matches what we're running.
                if (needsMigration(parsed) || calendarImported) {
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded))
                        if (calendarImported) localStorage.removeItem(LEGACY_CALENDAR_KEY)
                    } catch (writeError) {
                        console.error('Error persisting migrated data:', writeError)
                    }
                }
                return upgraded
            }
        } catch (error) {
            console.error('Error reading from localStorage:', error)
        }
        return initialValue
    })

    // Flag to track if this is a first-time user
    const [isFirstVisit, setIsFirstVisit] = useState(() => {
        return !localStorage.getItem(STORAGE_KEY)
    })

    // Save to localStorage whenever data changes
    useEffect(() => {
        if (data) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
            } catch (error) {
                console.error('Error saving to localStorage:', error)
                // Could be quota exceeded
                if (error.name === 'QuotaExceededError') {
                    alert('Storage limit reached! Please export and clear some data.')
                }
            }
        }
    }, [data])

    // Update entire data object. Bumps root updatedAt so an import/restore wins
    // the next cloud merge.
    const updateData = useCallback((newData) => {
        setData(newData ? { ...newData, updatedAt: now() } : newData)
        setIsFirstVisit(false)
    }, [])

    // Update specific tab
    const updateTab = useCallback((tabId, updates) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: prev.tabs.map(tab =>
                tab.id === tabId ? { ...tab, ...updates, updatedAt: now() } : tab
            )
        }))
    }, [])

    // Update specific topic in a tab
    const updateTopic = useCallback((tabId, topicId, updates) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: prev.tabs.map(tab =>
                tab.id === tabId
                    ? {
                        ...tab,
                        topics: tab.topics.map(topic =>
                            topic.id === topicId ? { ...topic, ...updates, updatedAt: now() } : topic
                        )
                    }
                    : tab
            )
        }))
    }, [])

    // Add a new topic to a tab. Bumps the tab's updatedAt so the adding device's
    // topic ordering wins the merge.
    const addTopic = useCallback((tabId, newTopic) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: prev.tabs.map(tab =>
                tab.id === tabId
                    ? { ...tab, updatedAt: now(), topics: [...tab.topics, { ...newTopic, updatedAt: now() }] }
                    : tab
            )
        }))
    }, [])

    // Delete a topic from a tab (records a tombstone so the deletion syncs).
    const deleteTopic = useCallback((tabId, topicId) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            deleted: { ...(prev.deleted || {}), [topicId]: now() },
            tabs: prev.tabs.map(tab =>
                tab.id === tabId
                    ? { ...tab, updatedAt: now(), topics: tab.topics.filter(t => t.id !== topicId) }
                    : tab
            )
        }))
    }, [])

    // Add a new tab
    const addTab = useCallback((newTab) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: [...prev.tabs, { ...newTab, updatedAt: now() }]
        }))
    }, [])

    // Delete a tab (records a tombstone).
    const deleteTab = useCallback((tabId) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            deleted: { ...(prev.deleted || {}), [tabId]: now() },
            tabs: prev.tabs.filter(tab => tab.id !== tabId)
        }))
    }, [])

    // Reorder topics within a tab (bumps the tab so the new order wins the merge).
    const reorderTopics = useCallback((tabId, newTopics) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: prev.tabs.map(tab =>
                tab.id === tabId ? { ...tab, updatedAt: now(), topics: newTopics } : tab
            )
        }))
    }, [])

    // Update settings
    const updateSettings = useCallback((updates) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            settings: { ...prev.settings, ...updates }
        }))
    }, [])

    // Update timer session. Intentionally does NOT bump updatedAt: the timer is
    // device-local state and must not win cloud merges or trigger sync churn.
    const updateTimerSession = useCallback((session) => {
        setData(prev => ({
            ...prev,
            timerSession: session
        }))
    }, [])

    // Add a subtask to a topic
    const addSubtask = useCallback((tabId, topicId, newSubtask) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: prev.tabs.map(tab =>
                tab.id === tabId
                    ? {
                        ...tab,
                        topics: tab.topics.map(topic =>
                            topic.id === topicId
                                ? { ...topic, updatedAt: now(), subtasks: [...(topic.subtasks || []), { ...newSubtask, updatedAt: now() }] }
                                : topic
                        )
                    }
                    : tab
            )
        }))
    }, [])

    // Update a subtask in a topic
    const updateSubtask = useCallback((tabId, topicId, subtaskId, updates) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: prev.tabs.map(tab =>
                tab.id === tabId
                    ? {
                        ...tab,
                        topics: tab.topics.map(topic =>
                            topic.id === topicId
                                ? {
                                    ...topic,
                                    subtasks: (topic.subtasks || []).map(subtask =>
                                        subtask.id === subtaskId ? { ...subtask, ...updates, updatedAt: now() } : subtask
                                    )
                                }
                                : topic
                        )
                    }
                    : tab
            )
        }))
    }, [])

    // Delete a subtask from a topic (records a tombstone).
    const deleteSubtask = useCallback((tabId, topicId, subtaskId) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            deleted: { ...(prev.deleted || {}), [subtaskId]: now() },
            tabs: prev.tabs.map(tab =>
                tab.id === tabId
                    ? {
                        ...tab,
                        topics: tab.topics.map(topic =>
                            topic.id === topicId
                                ? { ...topic, updatedAt: now(), subtasks: (topic.subtasks || []).filter(s => s.id !== subtaskId) }
                                : topic
                        )
                    }
                    : tab
            )
        }))
    }, [])

    // Record that the user studied on `dateKey` (YYYY-MM-DD), for the streak.
    // Returns the same data reference if the day is already recorded (no churn).
    const recordStudyDay = useCallback((dateKey) => {
        setData(prev => {
            if (!prev) return prev
            const dates = prev.studyDates || []
            if (dates.includes(dateKey)) return prev
            return { ...prev, studyDates: [...dates, dateKey], updatedAt: now() }
        })
    }, [])

    // --- Calendar CRUD --------------------------------------------------------
    // Calendar lives at data.calendar = { [dateKey]: Task[] }. Each task/subtask
    // carries updatedAt and deletions go through the tombstone map, exactly like
    // topics, so the calendar rides on the same per-entity cloud merge.

    // Apply `updater` to one day's task list; drops the day if it ends up empty.
    const withCalendarDay = (prev, dateKey, updater) => {
        const list = prev.calendar?.[dateKey] || []
        const nextList = updater(list)
        const calendar = { ...(prev.calendar || {}) }
        if (nextList.length === 0) delete calendar[dateKey]
        else calendar[dateKey] = nextList
        return { ...prev, calendar, updatedAt: now() }
    }

    const addCalendarTask = useCallback((dateKey, text) => {
        setData(prev => withCalendarDay(prev, dateKey, list => [
            ...list,
            { id: generateId(), text, completed: false, subtasks: [], updatedAt: now() }
        ]))
    }, [])

    const toggleCalendarTask = useCallback((dateKey, taskId) => {
        setData(prev => withCalendarDay(prev, dateKey, list =>
            list.map(t => t.id === taskId ? { ...t, completed: !t.completed, updatedAt: now() } : t)
        ))
    }, [])

    const editCalendarTask = useCallback((dateKey, taskId, newText) => {
        setData(prev => withCalendarDay(prev, dateKey, list =>
            list.map(t => t.id === taskId ? { ...t, text: newText, updatedAt: now() } : t)
        ))
    }, [])

    const deleteCalendarTask = useCallback((dateKey, taskId) => {
        setData(prev => ({
            ...withCalendarDay(prev, dateKey, list => list.filter(t => t.id !== taskId)),
            deleted: { ...(prev.deleted || {}), [taskId]: now() }
        }))
    }, [])

    const clearCalendarDay = useCallback((dateKey) => {
        setData(prev => {
            const ids = (prev.calendar?.[dateKey] || []).map(t => t.id)
            const calendar = { ...(prev.calendar || {}) }
            delete calendar[dateKey]
            const deleted = { ...(prev.deleted || {}) }
            ids.forEach(id => { deleted[id] = now() })
            return { ...prev, calendar, deleted, updatedAt: now() }
        })
    }, [])

    const addCalendarSubtask = useCallback((dateKey, taskId, text) => {
        setData(prev => withCalendarDay(prev, dateKey, list =>
            list.map(t => t.id !== taskId ? t : {
                ...t,
                updatedAt: now(),
                subtasks: [...(t.subtasks || []), { id: generateId(), text, completed: false, updatedAt: now() }]
            })
        ))
    }, [])

    const toggleCalendarSubtask = useCallback((dateKey, taskId, subtaskId) => {
        setData(prev => withCalendarDay(prev, dateKey, list =>
            list.map(t => t.id !== taskId ? t : {
                ...t,
                updatedAt: now(),
                subtasks: (t.subtasks || []).map(s =>
                    s.id === subtaskId ? { ...s, completed: !s.completed, updatedAt: now() } : s
                )
            })
        ))
    }, [])

    const deleteCalendarSubtask = useCallback((dateKey, taskId, subtaskId) => {
        setData(prev => ({
            ...withCalendarDay(prev, dateKey, list =>
                list.map(t => t.id !== taskId ? t : {
                    ...t,
                    updatedAt: now(),
                    subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId)
                })
            ),
            deleted: { ...(prev.deleted || {}), [subtaskId]: now() }
        }))
    }, [])

    // --- Blocks CRUD ----------------------------------------------------------
    // Blocks live at data.blocks = { [dateKey]: Block[] }.
    // Block: { id, startTime, endTime, taskIds: string[], updatedAt }

    const withBlocksDay = (prev, dateKey, updater) => {
        const list = prev.blocks?.[dateKey] || []
        const nextList = updater(list)
        const blocks = { ...(prev.blocks || {}) }
        if (nextList.length === 0) delete blocks[dateKey]
        else blocks[dateKey] = nextList
        return { ...prev, blocks, updatedAt: now() }
    }

    const addBlock = useCallback((dateKey, { startTime, endTime }) => {
        setData(prev => withBlocksDay(prev, dateKey, list => [
            ...list,
            { id: generateId(), startTime, endTime, taskIds: [], updatedAt: now() }
        ]))
    }, [])

    const deleteBlock = useCallback((dateKey, blockId) => {
        setData(prev => ({
            ...withBlocksDay(prev, dateKey, list => list.filter(b => b.id !== blockId)),
            deleted: { ...(prev.deleted || {}), [blockId]: now() }
        }))
    }, [])

    // --- Block Templates -------------------------------------------------------
    const addBlockTemplate = useCallback((name, blocks) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            blockTemplates: [
                ...(prev.blockTemplates || []),
                { id: generateId(), name, blocks, createdAt: now() }
            ]
        }))
    }, [])

    const deleteBlockTemplate = useCallback((templateId) => {
        setData(prev => ({
            ...prev,
            updatedAt: now(),
            blockTemplates: (prev.blockTemplates || []).filter(t => t.id !== templateId)
        }))
    }, [])

    const toggleTaskInBlock = useCallback((dateKey, blockId, taskId) => {
        setData(prev => withBlocksDay(prev, dateKey, list =>
            list.map(b => b.id !== blockId ? b : {
                ...b,
                updatedAt: now(),
                taskIds: (b.taskIds || []).includes(taskId)
                    ? b.taskIds.filter(id => id !== taskId)
                    : [...(b.taskIds || []), taskId]
            })
        ))
    }, [])

    // Clear all data
    const clearAllData = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(LEGACY_CALENDAR_KEY)
        setData(null)
        setIsFirstVisit(true)
    }, [])

    return {
        data,
        isFirstVisit,
        updateData,
        updateTab,
        updateTopic,
        addTopic,
        deleteTopic,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        addTab,
        deleteTab,
        reorderTopics,
        updateSettings,
        updateTimerSession,
        recordStudyDay,
        // Calendar
        calendar: data?.calendar || {},
        addCalendarTask,
        toggleCalendarTask,
        editCalendarTask,
        deleteCalendarTask,
        clearCalendarDay,
        addCalendarSubtask,
        toggleCalendarSubtask,
        deleteCalendarSubtask,
        // Blocks
        blocks: data?.blocks || {},
        addBlock,
        deleteBlock,
        toggleTaskInBlock,
        // Block templates
        blockTemplates: data?.blockTemplates || [],
        addBlockTemplate,
        deleteBlockTemplate,
        clearAllData
    }
}
