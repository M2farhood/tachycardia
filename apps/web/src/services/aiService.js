/**
 * AI Service - Tachycardia 💓 (client)
 * --------------------------------------------------------------------------
 * Keys NO LONGER live here. This is a thin client that calls our own backend
 * (see /server), which holds the provider keys and runs the cascade. The only
 * client-side AI config is VITE_AI_ENABLED — a non-secret boolean that lets the
 * UI show/hide AI features synchronously without exposing any key.
 *
 * Same exported names as before so callers don't change:
 *   askTachycardia, generateSubtasks, parsePlanWithAI, parseTaskActions, isAIAvailable
 */

// Base URL for the API. Empty => same-origin relative '/api' (the default for
// single-process VPS / nginx deploys). Override for a separate API host.
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// AI is considered available unless explicitly disabled. The real provider
// keys are validated server-side; this only gates the UI.
const AI_ENABLED = import.meta.env.VITE_AI_ENABLED !== 'false'

async function postJSON(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Request failed: ${response.status}`)
    }

    return response.json()
}

/**
 * Whether AI features should be shown. Synchronous + safe (no secrets).
 */
export function isAIAvailable() {
    return AI_ENABLED
}

/**
 * Chat with Tachycardia (multi-turn).
 * @param {Array<{role:'user'|'assistant', content:string}>} messages - conversation history
 * @param {object} studyData - current study data for context
 * @returns {Promise<string>} the assistant's reply text
 */
export async function askTachycardia(messages, studyData) {
    const { reply } = await postJSON('/api/ai/chat', { messages, studyData })
    return reply
}

/**
 * Generate 3-5 actionable subtasks for a task.
 * @returns {Promise<string[]>}
 */
export async function generateSubtasks(taskName, studyData) {
    if (!isAIAvailable()) {
        throw new Error('AI is not enabled.')
    }
    const { subtasks } = await postJSON('/api/ai/subtasks', { taskName, studyData })
    return Array.isArray(subtasks) ? subtasks : ['Start with a small step']
}

/**
 * AI-powered study plan parsing. Returns task objects in the app's UI shape.
 */
export async function parsePlanWithAI(planText) {
    const { tasks } = await postJSON('/api/ai/parse-plan', { planText })
    if (!Array.isArray(tasks)) throw new Error('AI returned an invalid response')

    // Transform raw parsed tasks into the importer's expected UI shape.
    return tasks.map((task, index) => ({
        id: `import-${Date.now()}-${index}`,
        name: task.name || 'Untitled Task',
        category: task.category || null,
        date: task.date ? new Date(task.date) : null,
        dateFormatted: task.date ? formatDateShort(task.date) : null,
        duration: task.duration || null,
        durationFormatted: task.duration ? `${task.duration}h` : null,
        weight: task.weight || null,
        selected: true,
    }))
}

/**
 * Helper: Format date string to short form (e.g. "Jan 15").
 */
function formatDateShort(dateStr) {
    try {
        const date = new Date(dateStr)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${months[date.getMonth()]} ${date.getDate()}`
    } catch {
        return null
    }
}

/**
 * Parse [ADD_TASK:tabId:name:category] tokens out of an AI reply.
 * Pure string parsing — stays on the client.
 * @returns {{tasks: Array<{tabId, name, category}>, cleanMessage: string}}
 */
export function parseTaskActions(response) {
    const taskPattern = /\[ADD_TASK:([^:]+):([^:]+):([^\]]+)\]/g
    const tasks = []
    let match

    while ((match = taskPattern.exec(response)) !== null) {
        tasks.push({
            tabId: match[1].trim(),
            name: match[2].trim(),
            category: match[3].trim(),
        })
    }

    const cleanMessage = response.replace(taskPattern, '').trim()
    return { tasks, cleanMessage }
}
