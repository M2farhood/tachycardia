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
                topics: [
                    { id: 'med-1', name: 'Topic 1: Introduction', category: 'Week 1', completed: false },
                    { id: 'med-2', name: 'Topic 2: Core Concepts', category: 'Week 1', completed: false },
                    { id: 'med-3', name: 'Topic 3: Key Principles', category: 'Week 2', completed: false },
                    { id: 'med-4', name: 'Topic 4: Case Studies', category: 'Week 2', completed: false },
                    { id: 'med-5', name: 'Review & Practice Questions', category: 'Week 3', completed: false },
                ],
                notes: ''
            },
            {
                id: 'module-2',
                title: 'Module 2',
                emoji: '🔬',
                subtitle: 'Second Module',
                topics: [
                    { id: 'med-6', name: 'Topic 1: Fundamentals', category: 'Week 4', completed: false },
                    { id: 'med-7', name: 'Topic 2: Clinical Applications', category: 'Week 4', completed: false },
                    { id: 'med-8', name: 'Topic 3: Practical Skills', category: 'Week 5', completed: false },
                    { id: 'med-9', name: 'Topic 4: Advanced Concepts', category: 'Week 5', completed: false },
                ],
                notes: ''
            },
            {
                id: 'module-3',
                title: 'Module 3',
                emoji: '💊',
                subtitle: 'Third Module',
                topics: [
                    { id: 'med-10', name: 'Topic 1: Theory', category: 'Week 6', completed: false },
                    { id: 'med-11', name: 'Topic 2: Practice', category: 'Week 6', completed: false },
                    { id: 'med-12', name: 'Topic 3: Assessment Prep', category: 'Week 7', completed: false },
                ],
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
                topics: [
                    { id: 'topic-1', name: 'Chapter 1: Introduction', category: 'Week 1', completed: false },
                    { id: 'topic-2', name: 'Chapter 2: Core Concepts', category: 'Week 2', completed: false },
                    { id: 'topic-3', name: 'Chapter 3: Advanced Topics', category: 'Week 3', completed: false },
                    { id: 'topic-4', name: 'Review & Practice', category: 'Week 4', completed: false },
                ],
                notes: ''
            },
            {
                id: 'subject-2',
                title: 'Subject 2',
                emoji: '📗',
                subtitle: 'Your second subject',
                topics: [
                    { id: 'topic-5', name: 'Module A', category: 'Part 1', completed: false },
                    { id: 'topic-6', name: 'Module B', category: 'Part 1', completed: false },
                    { id: 'topic-7', name: 'Module C', category: 'Part 2', completed: false },
                ],
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
                topics: [
                    { id: 'vocab-1', name: 'Basic Greetings', category: 'Beginner', completed: false },
                    { id: 'vocab-2', name: 'Numbers & Counting', category: 'Beginner', completed: false },
                    { id: 'vocab-3', name: 'Common Verbs', category: 'Beginner', completed: false },
                    { id: 'vocab-4', name: 'Food & Drinks', category: 'Everyday', completed: false },
                    { id: 'vocab-5', name: 'Travel & Directions', category: 'Everyday', completed: false },
                    { id: 'vocab-6', name: 'Business Vocabulary', category: 'Advanced', completed: false },
                ],
                notes: ''
            },
            {
                id: 'grammar',
                title: 'Grammar',
                emoji: '📐',
                subtitle: 'Rules & Structure',
                topics: [
                    { id: 'gram-1', name: 'Present Tense', category: 'Basics', completed: false },
                    { id: 'gram-2', name: 'Past Tense', category: 'Basics', completed: false },
                    { id: 'gram-3', name: 'Future Tense', category: 'Basics', completed: false },
                    { id: 'gram-4', name: 'Pronouns & Articles', category: 'Structure', completed: false },
                    { id: 'gram-5', name: 'Conditionals', category: 'Advanced', completed: false },
                ],
                notes: ''
            },
            {
                id: 'speaking',
                title: 'Speaking Practice',
                emoji: '🗣️',
                subtitle: 'Conversation Skills',
                topics: [
                    { id: 'speak-1', name: 'Self Introduction', category: 'Basic', completed: false },
                    { id: 'speak-2', name: 'Ordering at Restaurant', category: 'Situational', completed: false },
                    { id: 'speak-3', name: 'Asking for Directions', category: 'Situational', completed: false },
                    { id: 'speak-4', name: 'Phone Conversations', category: 'Intermediate', completed: false },
                ],
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
                title: 'My First Section',
                emoji: '📋',
                subtitle: 'Add your topics below',
                topics: [
                    { id: 'first-topic', name: 'Click to edit this topic', category: 'Category', completed: false },
                ],
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
    category: 'Category',
    completed: false
})

// Create a new empty tab
export const createEmptyTab = () => ({
    id: generateId(),
    title: 'New Section',
    emoji: '📌',
    subtitle: 'Description',
    topics: [createEmptyTopic()],
    notes: ''
})

// Get initial app state from a template
export const getInitialState = (templateKey) => {
    const template = templates[templateKey]
    return {
        version: '1.0.0',
        settings: {
            timerDuration: 25,
            isMuted: false,
            createdAt: new Date().toISOString()
        },
        tabs: template.tabs.map(tab => ({
            ...tab,
            id: generateId(),
            topics: tab.topics.map(topic => ({
                ...topic,
                id: generateId()
            }))
        })),
        timerSession: null
    }
}
