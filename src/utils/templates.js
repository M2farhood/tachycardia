import { CURRENT_SCHEMA_VERSION } from './migrations'

// Pre-defined templates for different study types
export const templates = {
    medical: {
        name: 'Medical Studies',
        description: 'Medical exam or course tracker',
        emoji: '🩺',
        tabs: [
            {
                id: 'module-1',
                title: 'Module 1',
                emoji: '📖',
                subtitle: 'First Module',
                topics: [],
                notes: ''
            },
            {
                id: 'module-2',
                title: 'Module 2',
                emoji: '🔬',
                subtitle: 'Second Module',
                topics: [],
                notes: ''
            },
            {
                id: 'module-3',
                title: 'Module 3',
                emoji: '💊',
                subtitle: 'Third Module',
                topics: [],
                notes: ''
            }
        ]
    },


    academic: {
        name: 'General Academic',
        description: 'Simple subject-based tracker',
        emoji: '📚',
        tabs: [
            {
                id: 'subject-1',
                title: 'Subject 1',
                emoji: '📖',
                subtitle: 'Your first subject',
                topics: [],
                notes: ''
            },
            {
                id: 'subject-2',
                title: 'Subject 2',
                emoji: '📗',
                subtitle: 'Your second subject',
                topics: [],
                notes: ''
            }
        ]
    },

    language: {
        name: 'Language Learning',
        description: 'Track vocabulary, grammar & speaking',
        emoji: '🌍',
        tabs: [
            {
                id: 'vocabulary',
                title: 'Vocabulary',
                emoji: '📝',
                subtitle: 'Words & Phrases',
                topics: [],
                notes: ''
            },
            {
                id: 'grammar',
                title: 'Grammar',
                emoji: '📐',
                subtitle: 'Rules & Structure',
                topics: [],
                notes: ''
            },
            {
                id: 'speaking',
                title: 'Speaking Practice',
                emoji: '🗣️',
                subtitle: 'Conversation Skills',
                topics: [],
                notes: ''
            }
        ]
    },

    blank: {
        name: 'Start Fresh',
        description: 'Create your own structure',
        emoji: '✨',
        tabs: [
            {
                id: 'my-section',
                title: 'My Section',
                emoji: '📋',
                subtitle: 'Add your topics below',
                topics: [],
                notes: ''
            }
        ]
    }
}

// Generate a unique ID
export const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create a new empty topic
export const createEmptyTopic = () => ({
    id: generateId(),
    name: 'New Topic',
    category: '',
    completed: false,
    subtasks: [],
    updatedAt: new Date().toISOString()
})

// Create a new empty tab
export const createEmptyTab = () => ({
    id: generateId(),
    title: 'New Section',
    emoji: '📌',
    subtitle: 'Description',
    topics: [],
    notes: '',
    updatedAt: new Date().toISOString()
})

// Get initial app state from a template
export const getInitialState = (templateKey) => {
    const template = templates[templateKey]
    const now = new Date().toISOString()
    return {
        version: '1.0.0',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: now,
        deleted: {},
        settings: {
            timerDuration: 25,
            isMuted: false,
            createdAt: now
        },
        tabs: template.tabs.map(tab => ({
            ...tab,
            id: generateId(),
            topics: [],
            updatedAt: now
        })),
        timerSession: null
    }
}
