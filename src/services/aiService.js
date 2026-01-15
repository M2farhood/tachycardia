/**
 * AI Service - Tachycardia 💓
 * OpenRouter API (primary) with Gemini/Mistral fallbacks
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_KEY_BACKUP = import.meta.env.VITE_GEMINI_API_KEY_BACKUP
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

// OpenRouter model to use (free, fast, high rate limits)
const OPENROUTER_MODEL = 'google/gemini-2.0-flash-exp:free'

// Tachycardia's personality prompt
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

/**
 * Build context from study data
 */
function buildContext(studyData) {
    if (!studyData) return ''

    const { tabs = [], settings = {} } = studyData

    let context = '\n\n--- Current Study Data ---\n'

    // Add date
    context += `Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n`

    // Add exam countdown if set
    if (settings.examDate) {
        const examDate = new Date(settings.examDate)
        const today = new Date()
        const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24))
        if (daysLeft > 0) {
            context += `Exam in: ${daysLeft} days\n`
        }
    }

    // Add tabs and topics summary
    let totalTasks = 0
    let completedTasks = 0

    tabs.forEach(tab => {
        const completed = tab.topics.filter(t => t.completed).length
        const total = tab.topics.length
        totalTasks += total
        completedTasks += completed

        context += `\n${tab.emoji} ${tab.title} (ID: ${tab.id}): ${completed}/${total} completed\n`

        // List incomplete topics
        const incomplete = tab.topics.filter(t => !t.completed)
        if (incomplete.length > 0 && incomplete.length <= 5) {
            incomplete.forEach(topic => {
                context += `  - ${topic.name}\n`
            })
        } else if (incomplete.length > 5) {
            // Just show first 3 if too many
            incomplete.slice(0, 3).forEach(topic => {
                context += `  - ${topic.name}\n`
            })
            context += `  ... and ${incomplete.length - 3} more\n`
        }
    })

    context += `\nOverall Progress: ${completedTasks}/${totalTasks} tasks completed (${totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0}%)\n`
    context += '--- End of Study Data ---'

    return context
}

/**
 * Call Gemini API
 */
async function callGemini(userMessage, studyData) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured')
    }

    const context = buildContext(studyData)
    const fullPrompt = SYSTEM_PROMPT + context

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: userMessage }]
                }],
                systemInstruction: {
                    parts: [{ text: fullPrompt }]
                },
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 500,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            })
        }
    )

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const status = response.status

        if (status === 429 || status === 404) {
            const err = new Error(status === 429 ? 'Rate limit exceeded' : 'Model not found')
            err.status = status
            throw err
        }

        throw new Error(error.error?.message || `Gemini API error: ${status}`)
    }

    const data = await response.json()

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini')
    }

    return data.candidates[0].content.parts[0].text
}

/**
 * Call Gemini API with a specific key (for backup)
 */
async function callGeminiWithKey(userMessage, studyData, apiKey) {
    const context = buildContext(studyData)
    const fullPrompt = SYSTEM_PROMPT + context

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: userMessage }]
                }],
                systemInstruction: {
                    parts: [{ text: fullPrompt }]
                },
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 500,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            })
        }
    )

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `Gemini API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini')
    }

    return data.candidates[0].content.parts[0].text
}

/**
 * Call Mistral API (fallback)
 */
async function callMistral(userMessage, studyData) {
    if (!MISTRAL_API_KEY) {
        throw new Error('Mistral API key not configured')
    }

    const context = buildContext(studyData)
    const fullPrompt = SYSTEM_PROMPT + context

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: [
                { role: 'system', content: fullPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 500
        })
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Mistral API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from Mistral')
    }

    return data.choices[0].message.content
}

/**
 * Call OpenRouter API (primary - most reliable with many model options)
 */
async function callOpenRouter(userMessage, studyData, systemPromptOverride = null) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured')
    }

    const context = buildContext(studyData)
    const fullPrompt = (systemPromptOverride || SYSTEM_PROMPT) + context

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Study Tracker - Tachycardia'
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
                { role: 'system', content: fullPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 1000
        })
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenRouter')
    }

    return data.choices[0].message.content
}

/**
 * Main AI function with cascading fallback
 * Order: OpenRouter (primary) → Mistral → Primary Gemini → Backup Gemini
 */
export async function askTachycardia(userMessage, studyData) {
    // Try OpenRouter first (most reliable, multi-model access)
    if (OPENROUTER_API_KEY) {
        try {
            return await callOpenRouter(userMessage, studyData)
        } catch (error) {
            console.warn('OpenRouter failed:', error.message)
        }
    }

    // Try Mistral second
    if (MISTRAL_API_KEY) {
        try {
            return await callMistral(userMessage, studyData)
        } catch (error) {
            console.warn('Mistral failed:', error.message)
        }
    }

    // Try Primary Gemini
    if (GEMINI_API_KEY) {
        try {
            return await callGemini(userMessage, studyData)
        } catch (error) {
            console.warn('Primary Gemini failed:', error.message)
        }
    }

    // Try Backup Gemini key
    if (GEMINI_API_KEY_BACKUP) {
        try {
            return await callGeminiWithKey(userMessage, studyData, GEMINI_API_KEY_BACKUP)
        } catch (backupError) {
            console.warn('Backup Gemini failed:', backupError.message)
        }
    }

    // All failed
    return "💓 I'm having a little trouble connecting right now. Give me a moment and try again! In the meantime, remember: progress is progress, no matter how small. Keep going!"
}

/**
 * Check if AI is available
 */
export function isAIAvailable() {
    return !!(OPENROUTER_API_KEY || GEMINI_API_KEY || MISTRAL_API_KEY)
}

/**
 * Parse task actions from AI response
 * Returns { tasks: [{tabId, name, category}], cleanMessage: string }
 */
export function parseTaskActions(response) {
    const taskPattern = /\[ADD_TASK:([^:]+):([^:]+):([^\]]+)\]/g
    const tasks = []
    let match

    while ((match = taskPattern.exec(response)) !== null) {
        tasks.push({
            tabId: match[1].trim(),
            name: match[2].trim(),
            category: match[3].trim()
        })
    }

    // Remove task tags from the message
    const cleanMessage = response.replace(taskPattern, '').trim()

    return { tasks, cleanMessage }
}

// Prompt for AI-powered plan parsing
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
    "duration": 2.5,  // hours as number, or null
    "weight": 15      // percentage as number, or null
  }
]

EXAMPLES:

Input: "📅 Jan 15: Biology Chapter 1 - 2h (Weight: 10%)"
Output: [{"name": "Biology Chapter 1", "category": null, "date": "2025-01-15", "duration": 2, "weight": 10}]

Input: "Anatomy (Weight: 30%)\\n- Upper limb\\n- Lower limb\\n- Thorax"
Output: [
  {"name": "Upper limb", "category": "Anatomy", "date": null, "duration": null, "weight": 10},
  {"name": "Lower limb", "category": "Anatomy", "date": null, "duration": null, "weight": 10},
  {"name": "Thorax", "category": "Anatomy", "date": null, "duration": null, "weight": 10}
]

Now parse this study plan and return ONLY the JSON array:`

/**
 * AI-powered plan parsing
 * Sends the raw study plan text to AI for intelligent extraction
 * Returns parsed tasks array or throws error
 */
export async function parsePlanWithAI(planText) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('AI parsing requires OpenRouter API key')
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Study Tracker - Plan Parser'
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
                { role: 'system', content: PLAN_PARSING_PROMPT },
                { role: 'user', content: planText }
            ],
            temperature: 0.1, // Low temperature for consistent structured output
            max_tokens: 4000
        })
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `AI parsing failed: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
        throw new Error('Empty response from AI')
    }

    // Extract JSON from the response (handle potential markdown wrapping)
    let jsonStr = content.trim()

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    // Parse JSON
    let tasks
    try {
        tasks = JSON.parse(jsonStr)
    } catch (parseError) {
        console.error('Failed to parse AI response:', content)
        throw new Error('AI returned invalid JSON')
    }

    if (!Array.isArray(tasks)) {
        throw new Error('AI returned non-array response')
    }

    // Transform to app's expected format with IDs
    return tasks.map((task, index) => ({
        id: `import-${Date.now()}-${index}`,
        name: task.name || 'Untitled Task',
        category: task.category || null,
        date: task.date ? new Date(task.date) : null,
        dateFormatted: task.date ? formatDateShort(task.date) : null,
        duration: task.duration || null,
        durationFormatted: task.duration ? `${task.duration}h` : null,
        weight: task.weight || null,
        selected: true
    }))
}

/**
 * Helper: Format date string to short form
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

