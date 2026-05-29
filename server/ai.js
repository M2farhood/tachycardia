/**
 * Server-side AI module — holds ALL provider keys and the cascade.
 * --------------------------------------------------------------------------
 * Keys live only here (process.env, never shipped to the browser). The client
 * calls our own /api/ai/* endpoints; this module talks to the providers.
 *
 * Cascade order (mirrors the old client behaviour): OpenRouter → Mistral →
 * Gemini primary → Gemini backup. The first provider to answer wins.
 *
 * Multi-turn: chat() accepts a `messages` array ([{role, content}, ...]) so the
 * assistant has conversation memory. Tool-calling is stubbed for the future
 * agentic work — `tools` is passed through to OpenRouter only for now.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_KEY_BACKUP = process.env.GEMINI_API_KEY_BACKUP

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free'
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || 'https://study-tracker.app'

// Gemini model names move/retire over time — keep them configurable so a future
// retirement is a one-line env change, not a code change.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_MODEL_BACKUP = process.env.GEMINI_MODEL_BACKUP || 'gemini-2.5-flash-lite'

// Tachycardia's personality prompt (unchanged from the original client copy).
const SYSTEM_PROMPT = `You are Tachycardia 💓, a friendly and encouraging AI study companion inside the Study Tracker app.

Personality:
- Warm, supportive, and slightly witty
- Use occasional heart/pulse metaphors ("Let's get your study heart pumping!", "Your progress is accelerating!")
- Celebrate progress genuinely
- Give practical, actionable advice
- Keep responses concise (2-4 sentences usually)
- Never overwhelming - be helpful without being verbose

Capabilities:
- Suggest what to study next based on deadlines and progress
- Help create study schedules
- Motivate and encourage when users feel stuck
- Answer questions about study strategies
- Help organize and prioritize topics
- Add tasks to the user's to-do lists (ONLY when explicitly asked)

Adding Tasks - IMPORTANT RULES:
- ONLY add tasks when the user EXPLICITLY asks you to add/create a task
- Words like "add", "create", "put", "schedule" indicate they want a task added
- Just asking "what should I study?" does NOT mean add a task - just give advice
- Just asking "what's next?" does NOT mean add a task - just recommend
- If recommending something, ASK if they want you to add it - don't auto-add

When user explicitly asks to add tasks, use this format:
[ADD_TASK:tabId:taskName:category]

Example - when user says "Add review chapter 5 to my list":
[ADD_TASK:tab-123:Review Chapter 5:Reading]

Guidelines:
- If user shares their study data, acknowledge it specifically
- Don't make up information about their tasks - use only what's provided
- Be encouraging but realistic about study expectations
- Suggest Pomodoro technique (25 min work, 5 min break) when appropriate
- NEVER add tasks unless explicitly asked to do so`

const SUBTASK_GENERATION_PROMPT = `You are a helpful study assistant. Breakdown the following task into 3-5 distinct, actionable micro-steps.
Return ONLY a raw JSON array of strings. No markdown formatting.
Example: ["Open the textbook", "Read the introduction", "Summarize key points"]`

const PLAN_PARSING_PROMPT = `You are a study plan parser. Your job is to extract study tasks from freeform text and return structured JSON.

RULES:
1. Extract ALL study tasks/topics mentioned in the text
2. For hierarchical lists, if a category has a weight but sub-items don't, distribute the weight evenly
3. Parse dates in any format and convert to ISO format (YYYY-MM-DD)
4. Parse durations and convert to hours (decimal)
5. Extract weights/percentages when mentioned
6. Identify categories/sections and apply them to child tasks
7. Clean up task names - remove bullet points, numbers, emojis, but keep the essence
8. Return ONLY valid JSON, no markdown, no explanations

OUTPUT FORMAT (JSON array):
[
  {
    "name": "Topic name (clean, concise)",
    "category": "Parent category or null",
    "date": "YYYY-MM-DD or null",
    "duration": 2.5,
    "weight": 15
  }
]

Now parse this study plan and return ONLY the JSON array:`

/**
 * Serialize study data into a context string appended to the system prompt.
 * (Ported from the old client buildContext.)
 */
function buildContext(studyData) {
    if (!studyData) return ''

    const { tabs = [], settings = {} } = studyData
    let context = '\n\n--- Current Study Data ---\n'
    context += `Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n`

    if (settings.examDate) {
        const examDate = new Date(settings.examDate)
        const today = new Date()
        const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24))
        if (daysLeft > 0) context += `Exam in: ${daysLeft} days\n`
    }

    let totalTasks = 0
    let completedTasks = 0

    tabs.forEach((tab) => {
        const completed = (tab.topics || []).filter((t) => t.completed).length
        const total = (tab.topics || []).length
        totalTasks += total
        completedTasks += completed

        context += `\n${tab.emoji || ''} ${tab.title} (ID: ${tab.id}): ${completed}/${total} completed\n`

        const incomplete = (tab.topics || []).filter((t) => !t.completed)
        if (incomplete.length > 0 && incomplete.length <= 5) {
            incomplete.forEach((topic) => { context += `  - ${topic.name}\n` })
        } else if (incomplete.length > 5) {
            incomplete.slice(0, 3).forEach((topic) => { context += `  - ${topic.name}\n` })
            context += `  ... and ${incomplete.length - 3} more\n`
        }
    })

    context += `\nOverall Progress: ${completedTasks}/${totalTasks} tasks completed (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)\n`
    context += '--- End of Study Data ---'
    return context
}

const SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
]

/**
 * OpenAI-style providers (OpenRouter, Mistral) take {role, content} messages.
 * Returns { reply, toolCalls }.
 */
async function callOpenAICompatible({ url, apiKey, model, system, messages, temperature, maxTokens, tools, extraHeaders = {} }) {
    const body = {
        model,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature,
        max_tokens: maxTokens,
    }
    if (tools && tools.length) {
        body.tools = tools
        body.tool_choice = 'auto'
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            ...extraHeaders,
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || error.message || `Provider error: ${response.status}`)
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const reply = message?.content
    const toolCalls = message?.tool_calls || null

    // A tool-call-only response has no text content — that's still valid.
    if (!reply && !toolCalls) throw new Error('Empty provider response')
    return { reply: reply || '', toolCalls }
}

/**
 * Gemini uses a different request shape (contents + systemInstruction).
 * No tool-calling here yet — falls back to plain text.
 */
async function callGeminiModel({ apiKey, model, system, messages, temperature, maxTokens }) {
    const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }))

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction: { parts: [{ text: system }] },
                generationConfig: { temperature, topK: 40, topP: 0.95, maxOutputTokens: maxTokens },
                safetySettings: SAFETY_SETTINGS,
            }),
        }
    )

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `Gemini error: ${response.status}`)
    }

    const data = await response.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!reply) throw new Error('Empty Gemini response')
    return { reply, toolCalls: null }
}

/**
 * Run a chat completion through the provider cascade.
 * @returns {Promise<{reply: string, toolCalls: object[]|null, provider: string}>}
 * @throws if every configured provider fails (or none are configured).
 */
async function runCascade({ system, messages, temperature = 0.7, maxTokens = 1000, tools = null }) {
    const attempts = []

    if (OPENROUTER_API_KEY) {
        attempts.push(['openrouter', () => callOpenAICompatible({
            url: 'https://openrouter.ai/api/v1/chat/completions',
            apiKey: OPENROUTER_API_KEY,
            model: OPENROUTER_MODEL,
            system, messages, temperature, maxTokens, tools,
            extraHeaders: { 'HTTP-Referer': OPENROUTER_REFERER, 'X-Title': 'Study Tracker - Tachycardia' },
        })])
    }
    if (MISTRAL_API_KEY) {
        attempts.push(['mistral', () => callOpenAICompatible({
            url: 'https://api.mistral.ai/v1/chat/completions',
            apiKey: MISTRAL_API_KEY,
            model: 'mistral-small-latest',
            system, messages, temperature, maxTokens: Math.min(maxTokens, 1000),
        })])
    }
    if (GEMINI_API_KEY) {
        attempts.push(['gemini', () => callGeminiModel({
            apiKey: GEMINI_API_KEY, model: GEMINI_MODEL,
            system, messages, temperature, maxTokens: Math.min(maxTokens, 1000),
        })])
    }
    if (GEMINI_API_KEY_BACKUP) {
        attempts.push(['gemini-backup', () => callGeminiModel({
            apiKey: GEMINI_API_KEY_BACKUP, model: GEMINI_MODEL_BACKUP,
            system, messages, temperature, maxTokens: Math.min(maxTokens, 1000),
        })])
    }

    if (attempts.length === 0) {
        const err = new Error('No AI provider configured')
        err.code = 'NO_PROVIDER'
        throw err
    }

    let lastError
    for (const [name, fn] of attempts) {
        try {
            const result = await fn()
            return { ...result, provider: name }
        } catch (error) {
            lastError = error
            console.warn(`[ai] ${name} failed:`, error.message)
        }
    }
    throw lastError || new Error('All AI providers failed')
}

/** Strip ```json fences and parse a JSON value out of a model response. */
function parseJsonFromText(text) {
    let s = (text || '').trim()
    if (s.startsWith('```json')) s = s.slice(7)
    else if (s.startsWith('```')) s = s.slice(3)
    if (s.endsWith('```')) s = s.slice(0, -3)
    return JSON.parse(s.trim())
}

/** Whether any provider key is configured (drives /api/ai/status). */
export function isConfigured() {
    return !!(OPENROUTER_API_KEY || MISTRAL_API_KEY || GEMINI_API_KEY || GEMINI_API_KEY_BACKUP)
}

/** Chat with Tachycardia. messages = [{role:'user'|'assistant', content}]. */
export async function chat({ messages, studyData, tools }) {
    const system = SYSTEM_PROMPT + buildContext(studyData)
    const { reply, toolCalls, provider } = await runCascade({
        system, messages, temperature: 0.7, maxTokens: 1000, tools,
    })
    return { reply, toolCalls, provider }
}

/** Break a task into 3-5 micro-steps. Returns string[]. */
export async function generateSubtasks({ taskName, studyData }) {
    const system = SUBTASK_GENERATION_PROMPT + buildContext(studyData)
    const { reply } = await runCascade({
        system,
        messages: [{ role: 'user', content: `Task: "${taskName}". Break this down.` }],
        temperature: 0.7,
        maxTokens: 500,
    })
    const parsed = parseJsonFromText(reply)
    if (Array.isArray(parsed)) return parsed
    return ['Start with a small step']
}

/** Parse freeform study plan text into structured task objects. */
export async function parsePlan({ planText }) {
    const { reply } = await runCascade({
        system: PLAN_PARSING_PROMPT,
        messages: [{ role: 'user', content: planText }],
        temperature: 0.1,
        maxTokens: 4000,
    })
    const tasks = parseJsonFromText(reply)
    if (!Array.isArray(tasks)) throw new Error('AI returned non-array response')
    return tasks
}
