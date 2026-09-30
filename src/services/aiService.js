/**
 * AI Service - Tachycardia 💓 (client)
 * --------------------------------------------------------------------------
 * No keys here. A thin client for our own backend (/server), which holds the
 * provider key, checks the Firebase sign-in, and enforces the daily caps.
 *
 * The AI only ever *proposes* changes (tool calls). Applying one is the app's
 * job — see src/utils/aiActions.js — and only happens after the owner taps
 * Apply.
 */

import { auth } from '../config/firebase'
import { buildAIContext } from '../utils/aiActions'

// Empty => same-origin '/api' (the VPS / nginx setup). Override for a separate API host.
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// Build-time kill switch. The owner's own on/off lives in settings.aiEnabled.
const AI_ENABLED = import.meta.env.VITE_AI_ENABLED !== 'false'

export class AIError extends Error {
    constructor(message, code) {
        super(message)
        this.name = 'AIError'
        this.code = code
    }
}

const localDateKey = (d = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function postJSON(path, body) {
    const headers = { 'Content-Type': 'application/json' }
    const user = auth?.currentUser
    if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`

    let response
    try {
        response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
    } catch {
        throw new AIError("Can't reach Tachycardia — check your connection.", 'NETWORK')
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new AIError(data.error || `Request failed: ${response.status}`, data.code)
    return data
}

/** Whether AI features should be shown at all (build flag + owner setting). */
export function isAIAvailable(settings) {
    return AI_ENABLED && settings?.aiEnabled !== false
}

/** Whether a signed-in user exists right now (the server requires one). */
export function isSignedIn() {
    return !!auth?.currentUser
}

/**
 * Chat turn. `messages` are OpenAI-style turns, including assistant tool_calls
 * and `tool` results. Returns { reply, toolCalls: [{id, name, arguments}] }.
 */
export async function sendChat(messages, data) {
    return postJSON('/api/ai/chat', { messages, context: buildAIContext(data, localDateKey()) })
}

/** Focus-mode coach turn. Same shape as sendChat. */
export async function sendFocus(messages, data) {
    return postJSON('/api/ai/focus', { messages, context: buildAIContext(data, localDateKey()) })
}

/** 3-5 tiny next steps for a task. Returns string[]. */
export async function generateSteps(taskName, data) {
    const { steps } = await postJSON('/api/ai/steps', { taskName, context: buildAIContext(data, localDateKey()) })
    return Array.isArray(steps) ? steps : []
}

/**
 * Split a coach reply into its text and the tap-able quick replies from a
 * trailing "OPTIONS: a | b | c" line.
 */
export function splitOptions(reply) {
    const lines = String(reply || '').split('\n')
    const idx = lines.findIndex((l) => /^\s*OPTIONS\s*:/i.test(l))
    if (idx === -1) return { text: reply.trim(), options: [] }
    const options = lines[idx].replace(/^\s*OPTIONS\s*:/i, '').split('|').map((s) => s.trim()).filter(Boolean).slice(0, 4)
    const text = lines.filter((_, i) => i !== idx).join('\n').trim()
    return { text, options }
}

export { localDateKey }

// --- TEMPORARY: old names kept only until FocusMode / useAIChat /
// PlanImporterModal are rewritten in this branch. Remove at integration. ---
export const generateSubtasks = (taskName, data) => generateSteps(taskName, data)
export async function askTachycardia(messages, data) {
    return (await sendChat(messages, data)).reply
}
export async function parsePlanWithAI() {
    throw new AIError('Plan import was removed.', 'REMOVED')
}
export function parseTaskActions(response) {
    return { tasks: [], cleanMessage: response }
}
