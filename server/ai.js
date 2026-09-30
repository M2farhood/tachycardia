/**
 * Server-side AI module — holds ALL provider keys and the cascade.
 * --------------------------------------------------------------------------
 * Keys live only here (process.env, never shipped to a client). The web and
 * phone apps call our own /api/ai/* endpoints; this module talks to providers.
 *
 * Primary: OpenRouter with a cheap tool-capable model (DeepSeek V4 Flash,
 * ≈$0.0003 a message), plus OpenRouter's own fallback list so a provider
 * outage silently moves to the next model. Mistral/Gemini stay as a last
 * resort, text-only, if their keys are set.
 *
 * Cost discipline: small max_tokens, reasoning off, a compact context (ids +
 * names only, capped), and the last few turns of history only. The daily caps
 * live in guard.js and are fed the real cost OpenRouter reports.
 */

import { APP_TOOLS, FOCUS_TOOLS, isKnownTool } from './tools.js'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const OPENROUTER_MODELS = (process.env.OPENROUTER_MODELS || 'deepseek/deepseek-v4-flash,qwen/qwen3.7-flash')
    .split(',').map((s) => s.trim()).filter(Boolean)
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || 'https://study.t-plusplus.tech'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const MAX_HISTORY = 12

const CHAT_PROMPT = `You are Tachycardia, the assistant inside Study Tracker — a to-do app where each "section" is one project or life area (work, hospital, study...) with its own task list, plus a calendar and time blocks.

Voice: warm, calm, practical. 1-4 short sentences. No lectures, no filler, no emoji spam.
Plain text only: no markdown — no **bold**, no headings, no tables. A short dash list is fine when listing tasks.

You can PROPOSE changes with tools. The app shows every proposal to the user as a card and they tap Apply or Skip — so:
- When they ask you to add, create, move, schedule, rename, complete or delete something, call the matching tool(s) right away. Don't ask "shall I?" first; the card is the confirmation.
- When they only ask for advice ("what should I do next?"), answer in words and do not call tools.
- Use ONLY ids that appear in the context. Never invent ids. To put tasks in a brand-new section, use add_section with its tasks.
- Dates are YYYY-MM-DD, relative to "Today" in the context. Times are 24h HH:MM.
- After calling tools, add one short sentence saying what you proposed. Never claim it is already done.
- delete_task only when they clearly ask to delete or remove.`

const FOCUS_PROMPT = `You are Tachycardia in Focus mode: a calm coach for people who feel stuck, anxious or scattered (often ADHD). Your job is to get them started within two minutes, feeling safe.

How to talk:
- At most 3 short sentences (under 60 words), ONE question at a time. Name the feeling briefly, then move on. No lectures, no toxic positivity, no shame.
- Do NOT recite their tasks or data back to them — they can see it. Use it silently to ask a better question.
- Plain text only: no markdown, no **bold**, no lists.
- End every message that asks something with a line: OPTIONS: first | second | third  (2-4 short tap-able replies).
- Ask at most 2-3 questions in total before acting. Use their real sections and tasks from the context.

Then act with exactly one tool:
- Worried about time or a deadline -> show_plan: spread the work over the days before the deadline in small daily chunks (never more than ~2-3 hours a day unless they say so), today's item small and first. Headline = one reassuring sentence about why the plan is enough.
- Just wants to get moving, overwhelmed, no hard deadline -> give_steps: 3-6 tiny concrete steps; the first takes under 2 minutes and is physical ("Open the document called ..."). sprintMinutes 10-15 unless they ask for more. Frame it as "do as much as you can in the sprint", never "finish it".
- Already knows the exact task -> start_focus_session with a tiny firstStep.
Never say you saved anything — the app asks them first.`

const STEPS_PROMPT = `Break the task into 3-5 tiny, concrete next actions for someone who feels stuck. The first must take under 2 minutes. Return ONLY a JSON array of strings, no markdown. Example: ["Open the notes file", "Read the first heading", "Write one sentence summary"]`

// ---------------------------------------------------------------------------
// Context: a compact, id-bearing snapshot of the owner's data
// ---------------------------------------------------------------------------

const cut = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

/**
 * `ctx` is what the apps send (see buildAIContext in aiActions.js):
 * { today, weekday, examDate, sections:[{id,title,done,total,tasks:[{id,name,category,steps}]}],
 *   calendar:{date:[text]}, blocksToday:[{startTime,endTime,count}] }
 * Everything is re-capped here — never trust client sizes.
 */
function buildContext(ctx) {
    if (!ctx || typeof ctx !== 'object') return ''
    const lines = ['', '--- Current data ---']
    lines.push(`Today: ${cut(ctx.today, 10) || new Date().toISOString().slice(0, 10)} (${cut(ctx.weekday, 12)})`)
    if (ctx.examDate) lines.push(`Deadline/countdown: ${cut(ctx.examDate, 16)}`)

    let taskBudget = 150
    const sections = Array.isArray(ctx.sections) ? ctx.sections.slice(0, 30) : []
    lines.push(sections.length ? 'Sections:' : 'Sections: none yet')
    for (const s of sections) {
        lines.push(`- [${cut(s.id, 60)}] ${cut(s.title, 60)} — ${Number(s.done) || 0}/${Number(s.total) || 0} done`)
        const tasks = Array.isArray(s.tasks) ? s.tasks.slice(0, Math.min(25, taskBudget)) : []
        taskBudget -= tasks.length
        for (const t of tasks) {
            const cat = t.category ? ` (${cut(t.category, 30)})` : ''
            const steps = t.steps ? ` [${cut(t.steps, 10)} steps]` : ''
            lines.push(`   · [${cut(t.id, 60)}] ${cut(t.name, 120)}${cat}${steps}`)
        }
        if ((Number(s.total) || 0) - (Number(s.done) || 0) > tasks.length) lines.push('   · …more not shown')
    }

    const cal = ctx.calendar && typeof ctx.calendar === 'object' ? Object.entries(ctx.calendar).slice(0, 14) : []
    if (cal.length) {
        lines.push('Calendar (upcoming):')
        for (const [d, items] of cal) {
            const list = (Array.isArray(items) ? items : []).slice(0, 8).map((x) => cut(x, 80)).join('; ')
            if (list) lines.push(`- ${cut(d, 10)}: ${list}`)
        }
    }
    const blocks = Array.isArray(ctx.blocksToday) ? ctx.blocksToday.slice(0, 12) : []
    if (blocks.length) {
        lines.push('Time blocks today: ' + blocks.map((b) => `${cut(b.startTime, 5)}-${cut(b.endTime, 5)}`).join(', '))
    }
    lines.push('--- End ---')
    return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Message hygiene — only well-formed chat/tool turns reach the provider
// ---------------------------------------------------------------------------

function sanitizeMessages(messages) {
    const out = []
    for (const m of (Array.isArray(messages) ? messages : []).slice(-MAX_HISTORY * 2)) {
        if (!m || typeof m !== 'object') continue
        if (m.role === 'user') {
            out.push({ role: 'user', content: cut(m.content, 2000) })
        } else if (m.role === 'assistant') {
            const msg = { role: 'assistant', content: cut(m.content, 2000) }
            const calls = Array.isArray(m.tool_calls) ? m.tool_calls : []
            const valid = calls
                .filter((c) => c?.id && isKnownTool(c?.function?.name))
                .map((c) => ({
                    id: cut(c.id, 100),
                    type: 'function',
                    function: { name: c.function.name, arguments: cut(c.function.arguments, 4000) || '{}' },
                }))
            if (valid.length) msg.tool_calls = valid
            if (msg.content || msg.tool_calls) out.push(msg)
        } else if (m.role === 'tool' && m.tool_call_id) {
            out.push({ role: 'tool', tool_call_id: cut(m.tool_call_id, 100), content: cut(m.content, 500) || 'ok' })
        }
    }
    // Keep only the last MAX_HISTORY turns, but never start on an orphan tool result.
    let trimmed = out.slice(-MAX_HISTORY)
    while (trimmed.length && trimmed[0].role === 'tool') trimmed = trimmed.slice(1)
    // A tool result whose assistant call was trimmed away would be rejected by the provider.
    const callIds = new Set(trimmed.flatMap((m) => (m.tool_calls || []).map((c) => c.id)))
    return trimmed.filter((m) => m.role !== 'tool' || callIds.has(m.tool_call_id))
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

async function callOpenRouter({ system, messages, tools, maxTokens, temperature }) {
    const body = {
        model: OPENROUTER_MODELS[0],
        models: OPENROUTER_MODELS,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature,
        max_tokens: maxTokens,
        reasoning: { enabled: false },
        usage: { include: true },
    }
    if (tools?.length) {
        body.tools = tools
        body.tool_choice = 'auto'
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': OPENROUTER_REFERER,
            'X-Title': 'Study Tracker - Tachycardia',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.error) {
        throw new Error(data.error?.message || `OpenRouter error: ${response.status}`)
    }
    const message = data.choices?.[0]?.message || {}
    const toolCalls = (message.tool_calls || [])
        .filter((c) => isKnownTool(c?.function?.name))
        .map((c) => ({ id: c.id, name: c.function.name, arguments: c.function.arguments || '{}' }))
    if (!message.content && !toolCalls.length) throw new Error('Empty provider response')
    return {
        reply: plain(message.content),
        toolCalls,
        model: data.model,
        costUsd: Number(data.usage?.cost) || 0,
    }
}

// Both apps render replies as plain text, so strip the markdown models add anyway.
const plain = (text) => String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim()

// Text-only fallbacks: flatten tool turns into plain text.
const flatten = (messages) => messages
    .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
    .map((m) => ({ role: m.role, content: m.content }))

async function callMistral({ system, messages, maxTokens, temperature }) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MISTRAL_API_KEY}` },
        body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: [{ role: 'system', content: system }, ...flatten(messages)],
            temperature, max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(45000),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || `Mistral error: ${response.status}`)
    const reply = data.choices?.[0]?.message?.content
    if (!reply) throw new Error('Empty Mistral response')
    return { reply, toolCalls: [], model: 'mistral-small', costUsd: 0 }
}

async function callGemini({ system, messages, maxTokens, temperature }) {
    const contents = flatten(messages).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }))
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction: { parts: [{ text: system }] },
                generationConfig: { temperature, maxOutputTokens: maxTokens },
            }),
            signal: AbortSignal.timeout(45000),
        }
    )
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error?.message || `Gemini error: ${response.status}`)
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!reply) throw new Error('Empty Gemini response')
    return { reply, toolCalls: [], model: GEMINI_MODEL, costUsd: 0 }
}

async function runCascade(opts) {
    const attempts = []
    if (OPENROUTER_API_KEY) attempts.push(['openrouter', callOpenRouter])
    if (MISTRAL_API_KEY) attempts.push(['mistral', callMistral])
    if (GEMINI_API_KEY) attempts.push(['gemini', callGemini])
    if (!attempts.length) {
        const err = new Error('No AI provider configured')
        err.code = 'NO_PROVIDER'
        throw err
    }
    let lastError
    for (const [name, call] of attempts) {
        try {
            return { ...(await call(opts)), provider: name }
        } catch (error) {
            lastError = error
            console.warn(`[ai] ${name} failed:`, error.message)
        }
    }
    throw lastError
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isConfigured() {
    return !!(OPENROUTER_API_KEY || MISTRAL_API_KEY || GEMINI_API_KEY)
}

/** Chat with Tachycardia. Returns { reply, toolCalls:[{id,name,arguments}], costUsd, model }. */
export async function chat({ messages, context }) {
    return runCascade({
        system: CHAT_PROMPT + buildContext(context),
        messages: sanitizeMessages(messages),
        tools: APP_TOOLS,
        maxTokens: 700,
        temperature: 0.4,
    })
}

/** The Focus-mode coach. Same shape as chat(), with the focus tools. */
export async function focus({ messages, context }) {
    return runCascade({
        system: FOCUS_PROMPT + buildContext(context),
        messages: sanitizeMessages(messages),
        tools: FOCUS_TOOLS,
        maxTokens: 700,
        temperature: 0.5,
    })
}

/** Break a task into 3-5 tiny steps. Returns { steps: string[], costUsd }. */
export async function generateSteps({ taskName, context }) {
    const result = await runCascade({
        system: STEPS_PROMPT + buildContext(context),
        messages: [{ role: 'user', content: `Task: "${cut(taskName, 200)}"` }],
        maxTokens: 300,
        temperature: 0.5,
    })
    let steps = []
    try {
        const text = result.reply.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim()
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) steps = parsed.map((s) => cut(s, 200)).filter(Boolean).slice(0, 6)
    } catch {
        steps = result.reply.split('\n').map((s) => s.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 5)
    }
    return { steps: steps.length ? steps : ['Open what you need for this task'], costUsd: result.costUsd }
}
