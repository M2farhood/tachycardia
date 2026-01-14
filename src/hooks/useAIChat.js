import { useState, useCallback, useEffect } from 'react'
import { askTachycardia, parseTaskActions } from '../services/aiService'

const CHAT_STORAGE_KEY = 'tachycardia_chat_history'

export const useAIChat = (studyData, addTopic) => {
    const [messages, setMessages] = useState(() => {
        try {
            const stored = localStorage.getItem(CHAT_STORAGE_KEY)
            if (stored) {
                return JSON.parse(stored)
            }
        } catch (e) {
            console.error('Error loading chat history:', e)
        }
        return []
    })

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    // Save messages to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
        } catch (e) {
            console.error('Error saving chat history:', e)
        }
    }, [messages])

    // Send a message to Tachycardia
    const sendMessage = useCallback(async (text) => {
        if (!text.trim() || isLoading) return

        const userMessage = {
            id: `msg-${Date.now()}-user`,
            role: 'user',
            content: text.trim(),
            timestamp: Date.now()
        }

        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)
        setError(null)

        try {
            const response = await askTachycardia(text, studyData)

            // Parse task actions from the response
            const { tasks, cleanMessage } = parseTaskActions(response)

            // Execute task additions
            if (tasks.length > 0 && addTopic) {
                tasks.forEach(task => {
                    addTopic(task.tabId, {
                        name: task.name,
                        category: task.category,
                        completed: false
                    })
                })
            }

            // Build the AI message with optional task confirmation
            let displayMessage = cleanMessage
            if (tasks.length > 0) {
                const taskList = tasks.map(t => `• ${t.name}`).join('\n')
                displayMessage = `${cleanMessage}\n\n✅ **Added ${tasks.length} task${tasks.length > 1 ? 's' : ''}:**\n${taskList}`
            }

            const aiMessage = {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: displayMessage,
                timestamp: Date.now(),
                tasksAdded: tasks.length
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (err) {
            console.error('AI error:', err)
            setError('Something went wrong. Please try again.')

            // Add error message to chat
            const errorMessage = {
                id: `msg-${Date.now()}-error`,
                role: 'assistant',
                content: "💓 Oops! I'm having a little trouble right now. Give me a moment and try again!",
                timestamp: Date.now(),
                isError: true
            }

            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }, [studyData, isLoading, addTopic])

    // Clear chat history
    const clearChat = useCallback(() => {
        setMessages([])
        localStorage.removeItem(CHAT_STORAGE_KEY)
    }, [])

    // Send a quick action message
    const sendQuickAction = useCallback((action) => {
        const prompts = {
            'plan': "Help me plan my study schedule for this week based on my current tasks. Add any tasks you think I need!",
            'next': "What should I study next? Give me a focused recommendation.",
            'motivate': "I'm feeling a bit unmotivated. Give me some encouragement!",
            'progress': "How am I doing with my study progress? Any suggestions?",
            'break': "I've been studying for a while. Should I take a break?"
        }

        const prompt = prompts[action]
        if (prompt) {
            sendMessage(prompt)
        }
    }, [sendMessage])

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        sendQuickAction,
        clearChat
    }
}

