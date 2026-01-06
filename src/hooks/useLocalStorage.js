import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'study_tracker_data'

export const useLocalStorage = (initialValue) => {
    // Initialize state from localStorage or use initial value
    const [data, setData] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                return JSON.parse(stored)
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

    // Update entire data object
    const updateData = useCallback((newData) => {
        setData(newData)
        setIsFirstVisit(false)
    }, [])

    // Update specific tab
    const updateTab = useCallback((tabId, updates) => {
        setData(prev => ({
            ...prev,
            tabs: prev.tabs.map(tab =>
                tab.id === tabId ? { ...tab, ...updates } : tab
            )
        }))
    }, [])

    // Update specific topic in a tab
    const updateTopic = useCallback((tabId, topicId, updates) => {
        setData(prev => ({
            ...prev,
            tabs: prev.tabs.map(tab =>
                tab.id === tabId
                    ? {
                        ...tab,
                        topics: tab.topics.map(topic =>
                            topic.id === topicId ? { ...topic, ...updates } : topic
                        )
                    }
                    : tab
            )
        }))
    }, [])

    // Add a new topic to a tab
    const addTopic = useCallback((tabId, newTopic) => {
        setData(prev => ({
            ...prev,
            tabs: prev.tabs.map(tab =>
                tab.id === tabId
                    ? { ...tab, topics: [...tab.topics, newTopic] }
                    : tab
            )
        }))
    }, [])

    // Delete a topic from a tab
    const deleteTopic = useCallback((tabId, topicId) => {
        setData(prev => ({
            ...prev,
            tabs: prev.tabs.map(tab =>
                tab.id === tabId
                    ? { ...tab, topics: tab.topics.filter(t => t.id !== topicId) }
                    : tab
            )
        }))
    }, [])

    // Add a new tab
    const addTab = useCallback((newTab) => {
        setData(prev => ({
            ...prev,
            tabs: [...prev.tabs, newTab]
        }))
    }, [])

    // Delete a tab
    const deleteTab = useCallback((tabId) => {
        setData(prev => ({
            ...prev,
            tabs: prev.tabs.filter(tab => tab.id !== tabId)
        }))
    }, [])

    // Reorder topics within a tab
    const reorderTopics = useCallback((tabId, newTopics) => {
        setData(prev => ({
            ...prev,
            tabs: prev.tabs.map(tab =>
                tab.id === tabId ? { ...tab, topics: newTopics } : tab
            )
        }))
    }, [])

    // Update settings
    const updateSettings = useCallback((updates) => {
        setData(prev => ({
            ...prev,
            settings: { ...prev.settings, ...updates }
        }))
    }, [])

    // Update timer session
    const updateTimerSession = useCallback((session) => {
        setData(prev => ({
            ...prev,
            timerSession: session
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
        addTab,
        deleteTab,
        reorderTopics,
        updateSettings,
        updateTimerSession,
        clearAllData
    }
}
