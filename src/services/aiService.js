/**
 * AI Service - Tachycardia 💓
 * Gemini API with Mistral fallback
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY

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
- **ADD TASKS DIRECTLY** to the user's to-do lists!

Adding Tasks:
When the user asks you to add tasks/topics, you CAN add them directly! Use this format:
[ADD_TASK:tabId:taskName:category]

For example:
[ADD_TASK:tab-123:Review Chapter 5:Reading]
[ADD_TASK:tab-456:Practice Problems Set 3:Exercises]

Use the tabId from the study data provided. If user doesn't specify a tab, use the first one.
You can add multiple tasks at once. The tasks will be added automatically!
After using ADD_TASK tags, briefly confirm what you added (don't repeat the tags).

Guidelines:
- If user shares their study data, acknowledge it specifically
- Don't make up information about their tasks - use only what's provided
- Be encouraging but realistic about study expectations
- Suggest Pomodoro technique (25 min work, 5 min break) when appropriate`

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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

        if (status === 429) {
            const err = new Error('Rate limit exceeded')
            err.status = 429
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
 * Main AI function with fallback
 */
export async function askTachycardia(userMessage, studyData) {
    // Try Gemini first
    try {
        return await callGemini(userMessage, studyData)
    } catch (error) {
        console.warn('Gemini failed, trying Mistral:', error.message)

        // If rate limited or other error, try Mistral
        try {
            return await callMistral(userMessage, studyData)
        } catch (mistralError) {
            console.error('Mistral also failed:', mistralError.message)

            // Return a friendly fallback message
            return "💓 I'm having a little trouble connecting right now. Give me a moment and try again! In the meantime, remember: progress is progress, no matter how small. Keep going!"
        }
    }
}

/**
 * Check if AI is available
 */
export function isAIAvailable() {
    return !!(GEMINI_API_KEY || MISTRAL_API_KEY)
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
