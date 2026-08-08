import { useState, useEffect, useCallback, useRef } from 'react'
import { migrate, needsMigration, isFutureSchemaError } from '../utils/migrations'
import { generateId } from '../utils/templates'

const STORAGE_KEY = 'study_tracker_data'
const LEGACY_CALENDAR_KEY = 'study_tracker_calendar'
// Device-local study-time keys. These stay exactly where they are — they are
// still written on every timer completion so an older client keeps working —
// and are backfilled once into the synced `timeLog` field (schema v7).
const LEGACY_DAILY_TIME_KEY = 'study_tracker_daily_time'
const LEGACY_TOTAL_TIME_KEY = 'study_tracker_total_time'

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

// One-time backfill of the device-local study-time keys into the synced
// `timeLog` (schema v7). Runs only when `timeLog` is still empty.
//
// `study_tracker_daily_time` = { date, minutes } for ONE day (today), and
// `study_tracker_total_time` = all-time minutes with no per-day breakdown. The
// per-day history simply does not exist, so the unattributable remainder is
// parked on the earliest day the user is known to have studied (falling back to
// the day before the daily entry). That keeps the all-time total exact — no
// study time is lost — while being honest that only today's figure is precise.
// Returns { data, changed }.
const backfillTimeLog = (data) => {
    if (!data) return { data, changed: false }
    const existing = data.timeLog || {}
    if (Object.keys(existing).length > 0) return { data, changed: false }

    let dailyDate = null
    let dailySeconds = 0
    try {
        const daily = JSON.parse(localStorage.getItem(LEGACY_DAILY_TIME_KEY) || 'null')
        if (daily && daily.date) {
            dailyDate = daily.date
            dailySeconds = Math.max(0, Math.round((Number(daily.minutes) || 0) * 60))
        }
    } catch {
        // Unreadable legacy entry — treat as absent.
    }

    const totalSeconds = Math.max(0, Math.round((parseInt(localStorage.getItem(LEGACY_TOTAL_TIME_KEY), 10) || 0) * 60))
    if (totalSeconds === 0 && dailySeconds === 0) return { data, changed: false }

    const timeLog = {}
    if (dailyDate && dailySeconds > 0) timeLog[dailyDate] = dailySeconds

    const remainder = totalSeconds - dailySeconds
    if (remainder > 0) {
        const historyDates = (data.studyDates || []).filter((d) => d !== dailyDate).sort()
        const bucket = historyDates[0] || dailyDate || new Date().toISOString().split('T')[0]
        timeLog[bucket] = (timeLog[bucket] || 0) + remainder
    }

    if (Object.keys(timeLog).length === 0) return { data, changed: false }
    return { data: { ...data, timeLog, updatedAt: now() }, changed: true }
}

// Read + upgrade the stored document once, at mount.
// Returns { data, readOnly, isFirstVisit }. `readOnly` is set when the stored
// document was written by a NEWER version of the app than this one: we still
// show it, but we must never write it back (see DATA-CONTRACT.md rule 4).
const readInitialState = (initialValue) => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { data: initialValue, readOnly: false, isFirstVisit: true }

    let parsed = null
    try {
        parsed = JSON.parse(stored)
    } catch (error) {
        console.error('Error reading from localStorage:', error)
        return { data: initialValue, readOnly: false, isFirstVisit: true }
    }

    let migrated
    try {
        migrated = migrate(parsed)
    } catch (error) {
        if (isFutureSchemaError(error)) {
            console.warn('Stored data is from a newer version of the app — running read-only.', error)
            return { data: parsed, readOnly: true, isFirstVisit: false }
        }
        throw error
    }

    // Pull the old standalone calendar key into the main data object.
    const { data: withCalendar, changed: calendarImported } = importLegacyCalendar(migrated)
    // Pull the device-local study-time keys into the synced timeLog.
    const { data: upgraded, changed: timeBackfilled } = backfillTimeLog(withCalendar)

    // Persist immediately if the load upgraded the schema or imported anything,
    // so the on-disk copy matches what we're running.
    if (needsMigration(parsed) || calendarImported || timeBackfilled) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded))
            if (calendarImported) localStorage.removeItem(LEGACY_CALENDAR_KEY)
        } catch (writeError) {
            console.error('Error persisting migrated data:', writeError)
        }
    }

    return { data: upgraded, readOnly: false, isFirstVisit: false }
}

export const useLocalStorage = (initialValue) => {
    const [boot] = useState(() => readInitialState(initialValue))

    // Initialize state from localStorage or use initial value
    const [data, setData] = useState(boot.data)

    // Flag to track if this is a first-time user
    const [isFirstVisit, setIsFirstVisit] = useState(boot.isFirstVisit)

    // Read-only mode: the document we are looking at was written by a newer
    // client. Show it, never write it — not to localStorage, not to Firestore.
    const [readOnly, setReadOnly] = useState(boot.readOnly)
    // Mirror in a ref so guards are correct in the SAME tick that read-only is
    // entered (a state update would not be visible until the next render).
    const readOnlyRef = useRef(boot.readOnly)

    const enterReadOnly = useCallback(() => {
        if (readOnlyRef.current) return
        readOnlyRef.current = true
        setReadOnly(true)
    }, [])

    // Every local mutation goes through this. In read-only mode it is a no-op,
    // so no edit can reach state and, from there, storage or the cloud.
    const commit = useCallback((updater) => {
        if (readOnlyRef.current) return
        setData(updater)
    }, [])

    // Save to localStorage whenever data changes
    useEffect(() => {
        if (readOnly) return
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
    }, [data, readOnly])

    // Update entire data object. Bumps root updatedAt so an import/restore wins
    // the next cloud merge.
    const updateData = useCallback((newData) => {
        if (readOnlyRef.current) return
        setData(newData ? { ...newData, updatedAt: now() } : newData)
        setIsFirstVisit(false)
    }, [])

    // Adopt the result of a cloud merge.
    //
    // Deliberately does NOT re-stamp `updatedAt` (unlike updateData). Re-stamping
    // an inbound merge makes it strictly newer than what the other device holds,
    // so that device merges it, re-stamps in turn, and the two ping-pong writes
    // to Firestore forever. The merged document keeps whichever `updatedAt`
    // syncMerge chose. See AGENTS.md / DATA-CONTRACT.md.
    const adoptCloudData = useCallback((merged) => {
        if (!merged) return
        setData(merged)
        setIsFirstVisit(false)
        // Mirror to localStorage right away rather than waiting for the save
        // effect, so a reload immediately after a merge sees the same document.
        if (readOnlyRef.current) return
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        } catch (error) {
            console.error('Error saving cloud data to localStorage:', error)
        }
    }, [])

    // Update specific tab
    const updateTab = useCallback((tabId, updates) => {
        commit(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: prev.tabs.map(tab =>
                tab.id === tabId ? { ...tab, ...updates, updatedAt: now() } : tab
            )
        }))
    }, [])

    // Update specific topic in a tab
    const updateTopic = useCallback((tabId, topicId, updates) => {
        commit(prev => ({
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
        commit(prev => ({
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
        commit(prev => ({
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
        commit(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: [...prev.tabs, { ...newTab, updatedAt: now() }]
        }))
    }, [])

    // Delete a tab (records a tombstone).
    const deleteTab = useCallback((tabId) => {
        commit(prev => ({
            ...prev,
            updatedAt: now(),
            deleted: { ...(prev.deleted || {}), [tabId]: now() },
            tabs: prev.tabs.filter(tab => tab.id !== tabId)
        }))
    }, [])

    // Reorder topics within a tab (bumps the tab so the new order wins the merge).
    const reorderTopics = useCallback((tabId, newTopics) => {
        commit(prev => ({
            ...prev,
            updatedAt: now(),
            tabs: prev.tabs.map(tab =>
                tab.id === tabId ? { ...tab, updatedAt: now(), topics: newTopics } : tab
            )
        }))
    }, [])

    // Update settings
    const updateSettings = useCallback((updates) => {
        commit(prev => ({
            ...prev,
            updatedAt: now(),
            settings: { ...prev.settings, ...updates }
        }))
    }, [])

    // Update timer session. Intentionally does NOT bump updatedAt: the timer is
    // device-local state and must not win cloud merges or trigger sync churn.
    const updateTimerSession = useCallback((session) => {
        commit(prev => ({
            ...prev,
            timerSession: session
        }))
    }, [])

    // Add a subtask to a topic
    const addSubtask = useCallback((tabId, topicId, newSubtask) => {
        commit(prev => ({
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
        commit(prev => ({
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
        commit(prev => ({
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
        commit(prev => {
            if (!prev) return prev
            const dates = prev.studyDates || []
            if (dates.includes(dateKey)) return prev
            return { ...prev, studyDates: [...dates, dateKey], updatedAt: now() }
        })
    }, [])

    // Add `seconds` of study time to `dateKey` (YYYY-MM-DD) in the synced
    // timeLog. Additive: the caller still writes the legacy device-local
    // localStorage keys too, so an older client keeps working unchanged.
    const recordStudyTime = useCallback((dateKey, seconds) => {
        const add = Math.max(0, Math.round(Number(seconds) || 0))
        if (!add) return
        commit(prev => {
            if (!prev) return prev
            const log = prev.timeLog || {}
            return {
                ...prev,
                timeLog: { ...log, [dateKey]: (Number(log[dateKey]) || 0) + add },
                updatedAt: now(),
            }
        })
    }, [commit])

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
        commit(prev => withCalendarDay(prev, dateKey, list => [
            ...list,
            { id: generateId(), text, completed: false, subtasks: [], updatedAt: now() }
        ]))
    }, [])

    const toggleCalendarTask = useCallback((dateKey, taskId) => {
        commit(prev => withCalendarDay(prev, dateKey, list =>
            list.map(t => t.id === taskId ? { ...t, completed: !t.completed, updatedAt: now() } : t)
        ))
    }, [])

    const editCalendarTask = useCallback((dateKey, taskId, newText) => {
        commit(prev => withCalendarDay(prev, dateKey, list =>
            list.map(t => t.id === taskId ? { ...t, text: newText, updatedAt: now() } : t)
        ))
    }, [])

    const deleteCalendarTask = useCallback((dateKey, taskId) => {
        commit(prev => ({
            ...withCalendarDay(prev, dateKey, list => list.filter(t => t.id !== taskId)),
            deleted: { ...(prev.deleted || {}), [taskId]: now() }
        }))
    }, [])

    const clearCalendarDay = useCallback((dateKey) => {
        commit(prev => {
            const ids = (prev.calendar?.[dateKey] || []).map(t => t.id)
            const calendar = { ...(prev.calendar || {}) }
            delete calendar[dateKey]
            const deleted = { ...(prev.deleted || {}) }
            ids.forEach(id => { deleted[id] = now() })
            return { ...prev, calendar, deleted, updatedAt: now() }
        })
    }, [])

    const addCalendarSubtask = useCallback((dateKey, taskId, text) => {
        commit(prev => withCalendarDay(prev, dateKey, list =>
            list.map(t => t.id !== taskId ? t : {
                ...t,
                updatedAt: now(),
                subtasks: [...(t.subtasks || []), { id: generateId(), text, completed: false, updatedAt: now() }]
            })
        ))
    }, [])

    const toggleCalendarSubtask = useCallback((dateKey, taskId, subtaskId) => {
        commit(prev => withCalendarDay(prev, dateKey, list =>
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
        commit(prev => ({
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
        commit(prev => withBlocksDay(prev, dateKey, list => [
            ...list,
            { id: generateId(), startTime, endTime, taskIds: [], updatedAt: now() }
        ]))
    }, [])

    const deleteBlock = useCallback((dateKey, blockId) => {
        commit(prev => ({
            ...withBlocksDay(prev, dateKey, list => list.filter(b => b.id !== blockId)),
            deleted: { ...(prev.deleted || {}), [blockId]: now() }
        }))
    }, [])

    // --- Block Templates -------------------------------------------------------
    const addBlockTemplate = useCallback((name, blocks) => {
        commit(prev => ({
            ...prev,
            updatedAt: now(),
            blockTemplates: [
                ...(prev.blockTemplates || []),
                { id: generateId(), name, blocks, createdAt: now() }
            ]
        }))
    }, [])

    const deleteBlockTemplate = useCallback((templateId) => {
        commit(prev => ({
            ...prev,
            updatedAt: now(),
            blockTemplates: (prev.blockTemplates || []).filter(t => t.id !== templateId)
        }))
    }, [])

    const toggleTaskInBlock = useCallback((dateKey, blockId, taskId) => {
        commit(prev => withBlocksDay(prev, dateKey, list =>
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
        // Read-only mode means "never write" — and deleting is a write.
        if (readOnlyRef.current) return
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(LEGACY_CALENDAR_KEY)
        setData(null)
        setIsFirstVisit(true)
    }, [])

    return {
        data,
        isFirstVisit,
        readOnly,
        enterReadOnly,
        updateData,
        adoptCloudData,
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
        // Study time (synced, additive — see migration 7)
        timeLog: data?.timeLog || {},
        recordStudyTime,
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
