import { useState, useEffect, useCallback } from 'react'
import { migrate, needsMigration } from '../utils/migrations'

const STORAGE_KEY = 'study_tracker_data'

// ISO timestamp helper for stamping per-entity updatedAt on every mutation.
const now = () => new Date().toISOString()

export const useLocalStorage = (initialValue) => {
    // Initialize state from localStorage or use initial value
    const [data, setData] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                const upgraded = migrate(parsed)
                // Persist immediately if the load upgraded the schema, so the
                // on-disk copy matches what the app is now running with.
                if (needsMigration(parsed)) {
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded))
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

    // Clear all data
    const clearAllData = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
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
        clearAllData
    }
}
