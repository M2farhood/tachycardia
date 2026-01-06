// Pre-defined templates for different study types
export const templates = {
    medical: {
        name: 'Medical Studies',
        description: 'Surgery subspecialties exam tracker',
        emoji: '🩺',
        tabs: [
            {
                id: 'ped-surgery',
                title: 'Pediatric Surgery',
                emoji: '👼',
                subtitle: '3 Modules',
                topics: [
                    { id: 'ps-1', name: 'Bowel atresia, Malrotation', category: 'Dr. Ali Farooq', completed: false },
                    { id: 'ps-2', name: "Hirschsprung's disease, Anorectal Malformation", category: 'Dr. Ali Farooq', completed: false },
                    { id: 'ps-3', name: 'Esophagus & GERD', category: 'Dr. Ali Farooq', completed: false },
                    { id: 'ps-4', name: 'Hypertrophic Pyloric Stenosis (HPS)', category: 'Dr. Ali Farooq', completed: false },
                    { id: 'ps-5', name: 'Self Assessment Quiz', category: 'Dr. Ali Farooq', completed: false },
                    { id: 'ps-6', name: 'Meconium ileus & Duplications', category: 'Dr. Ali Agab', completed: false },
                    { id: 'ps-7', name: 'GIT Foreign body & Caustic ingestion', category: 'Dr. Ali Agab', completed: false },
                    { id: 'ps-8', name: 'Congenital Diaphragmatic Hernia & Eventration', category: 'Dr. Ali Agab', completed: false },
                    { id: 'ps-9', name: 'Biliary atresia', category: 'Dr. Ali Agab', completed: false },
                    { id: 'ps-10', name: 'Choledochal cyst', category: 'Dr. Ali Agab', completed: false },
                    { id: 'ps-11', name: 'Acute abdominal pain', category: 'Dr. Ali Agab', completed: false },
                    { id: 'ps-12', name: 'Inguinoscrotal conditions & Acute scrotum', category: 'Dr. Moh. Jassim', completed: false },
                    { id: 'ps-13', name: 'Congenital abdominal wall defect', category: 'Dr. Moh. Jassim', completed: false },
                    { id: 'ps-14', name: 'Congenital neck masses', category: 'Dr. Moh. Jassim', completed: false },
                    { id: 'ps-15', name: 'Infantile & Childhood tumors', category: 'Dr. Moh. Jassim', completed: false },
                ],
                notes: ''
            },
            {
                id: 'neurosurgery',
                title: 'Neurosurgery',
                emoji: '🧠',
                subtitle: 'Head & Spine',
                topics: [
                    { id: 'ns-1', name: 'Principle of Neurosurgery', category: 'General', completed: false },
                    { id: 'ns-2', name: 'Congenital Head Problems', category: 'Congenital', completed: false },
                    { id: 'ns-3', name: 'Hydrocephalus', category: 'Congenital/Acquired', completed: false },
                    { id: 'ns-4', name: 'Head injury (Part 1 & 2)', category: 'Trauma', completed: false },
                    { id: 'ns-5', name: 'Neural tube defect', category: 'Congenital', completed: false },
                    { id: 'ns-6', name: 'Arnold-Chiari malformation', category: 'Congenital', completed: false },
                    { id: 'ns-7', name: 'Spinal Cord Injury', category: 'Trauma', completed: false },
                    { id: 'ns-8', name: 'Peripheral nerve injury', category: 'Trauma', completed: false },
                    { id: 'ns-9', name: 'ICP (Intracranial Pressure)', category: 'Pathophysiology', completed: false },
                    { id: 'ns-10', name: 'SOL (Space Occupying Lesions)', category: 'Pathology', completed: false },
                    { id: 'ns-11', name: 'Spinal cord tumour', category: 'Oncology', completed: false },
                ],
                notes: ''
            },
            {
                id: 'urosurgery',
                title: 'Urosurgery',
                emoji: '💧',
                subtitle: 'Renal & Tract',
                topics: [
                    { id: 'us-1', name: 'Symptoms, Signs & Investigations of Urinary Tract', category: 'Basics', completed: false },
                    { id: 'us-2', name: 'Renal tumours', category: 'Oncology', completed: false },
                    { id: 'us-3', name: 'Renal failure', category: 'Pathology', completed: false },
                    { id: 'us-4', name: 'Renal trauma', category: 'Trauma', completed: false },
                    { id: 'us-5', name: 'Urinary stone disease', category: 'Stones', completed: false },
                    { id: 'us-6', name: 'Congenital anomalies of UUT', category: 'Congenital', completed: false },
                    { id: 'us-7', name: 'Bladder anomalies and injury', category: 'Bladder', completed: false },
                    { id: 'us-8', name: 'UTI (Urinary Tract Infection)', category: 'Infection', completed: false },
                    { id: 'us-9', name: 'Urinary catheter & instruments', category: 'Clinical', completed: false },
                    { id: 'us-10', name: 'Urinary incontinence', category: 'Function', completed: false },
                    { id: 'us-11', name: 'Bladder fistulae, stones and diverticulum', category: 'Bladder', completed: false },
                    { id: 'us-12', name: 'Tumour of urinary bladder', category: 'Oncology', completed: false },
                    { id: 'us-13', name: 'Neurogenic bladder dysfunction', category: 'Function', completed: false },
                    { id: 'us-14', name: 'The urethra (anomalies & injury)', category: 'Urethra', completed: false },
                    { id: 'us-15', name: 'BPH & Carcinoma of prostate', category: 'Prostate', completed: false },
                    { id: 'us-16', name: 'Infertility and Impotence', category: 'Andrology', completed: false },
                    { id: 'us-17', name: 'Penis and Scrotum', category: 'Genitalia', completed: false },
                    { id: 'us-18', name: 'Testis (Part 1 & 2)', category: 'Genitalia', completed: false },
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
