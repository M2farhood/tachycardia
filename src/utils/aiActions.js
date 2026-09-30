/**
 * Tachycardia's hands — turn an AI tool call into a change to the document.
 * --------------------------------------------------------------------------
 * TWIN FILE. The web app keeps this at `src/utils/aiActions.js`, the phone app
 * at `src/data/aiActions.js`, byte-identical (see DATA-CONTRACT.md and
 * `npm run check-twins` in the mobile repo). It is deliberately
 * self-contained — no imports — so the two copies can never resolve different
 * helpers.
 *
 * The AI never writes anything itself. The server returns *proposed* tool
 * calls; the app shows each one as a card using `describeAction`, and only when
 * the owner taps Apply does `applyAction` produce the next document. Every
 * write here follows the same rules as the hand-written mutations in
 * useLocalStorage.js: stamp `updatedAt` on whatever changed, record a
 * tombstone for anything deleted, never add a field the schema doesn't have.
 *
 * Tool names and argument shapes are defined once, on the server
 * (server/tools.js). Keep the two in step.
 */

const now = () => new Date().toISOString()

const newId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/

const clean = (s, max = 200) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const list = (v) => (Array.isArray(v) ? v : [])

/** Tools that only drive the screen (Focus mode) — they never touch the document. */
export const DISPLAY_TOOLS = ['show_plan', 'give_steps', 'start_focus_session']

/** Tools that remove something. The UI must always ask before applying these. */
export const DESTRUCTIVE_TOOLS = ['delete_task']

export class ActionError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ActionError'
    }
}

const findTab = (data, sectionId) => (data?.tabs || []).find((t) => t.id === sectionId) || null
const findTopic = (tab, taskId) => (tab?.topics || []).find((t) => t.id === taskId) || null

const makeTopic = (task) => ({
    id: newId(),
    name: clean(task?.name ?? task, 200) || 'New task',
    category: clean(task?.category, 60),
    completed: false,
    subtasks: [],
    updatedAt: now(),
})

const makeSubtask = (name) => ({
    id: newId(),
    name: clean(name, 200),
    completed: false,
    updatedAt: now(),
})

/**
 * Parse a raw tool call from the API ({ id, name, args } where args may still
 * be a JSON string) into a normalised { id, name, args } object.
 */
export function normalizeCall(call) {
    let args = call?.args ?? call?.arguments ?? call?.function?.arguments ?? {}
    if (typeof args === 'string') {
        try {
            args = JSON.parse(args || '{}')
        } catch {
            args = {}
        }
    }
    return {
        id: call?.id || newId(),
        name: call?.name || call?.function?.name || '',
        args: args && typeof args === 'object' ? args : {},
    }
}

/**
 * One plain sentence describing what applying the call would do, using the
 * owner's own section and task names. Never throws — an unknown section or
 * task is described as such so the card can still render.
 */
export function describeAction(data, rawCall) {
    const { name, args } = normalizeCall(rawCall)
    const tab = findTab(data, args.sectionId)
    const tabName = tab ? `“${tab.title}”` : 'an unknown section'
    const topic = findTopic(tab, args.taskId)
    const topicName = topic ? `“${topic.name}”` : 'an unknown task'
    const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

    switch (name) {
        case 'add_section': {
            const tasks = list(args.tasks)
            return `Create the section “${clean(args.name, 60)}”${tasks.length ? ` with ${count(tasks.length, 'task')}` : ''}`
        }
        case 'rename_section':
            return `Rename ${tabName} to “${clean(args.name, 60)}”`
        case 'add_tasks':
            return `Add ${count(list(args.tasks).length, 'task')} to ${tabName}`
        case 'complete_task':
            return `Mark ${topicName} as done`
        case 'delete_task':
            return `Delete ${topicName} from ${tabName}`
        case 'add_subtasks':
            return `Add ${count(list(args.steps).length, 'step')} to ${topicName}`
        case 'schedule_day_task':
            return `Put “${clean(args.text, 80)}” on ${args.date}`
        case 'create_block':
            return `Block ${args.startTime}–${args.endTime} on ${args.date}${list(args.taskIds).length ? ` for ${count(list(args.taskIds).length, 'task')}` : ''}`
        case 'set_exam_date':
            return `Set your countdown date to ${args.date}`
        case 'show_plan':
            return `Show a plan: ${clean(args.headline, 80)}`
        case 'give_steps':
            return `Break “${clean(args.taskName, 80)}” into ${count(list(args.steps).length, 'step')}`
        case 'start_focus_session':
            return `Start a ${Number(args.minutes) || 25}-minute session on ${topicName}`
        default:
            return `Unknown action “${name}”`
    }
}

/**
 * Return the next document with the call applied. Throws ActionError (with a
 * plain-language message) if the call can't be applied — e.g. it names a
 * section that no longer exists. Display-only tools return `data` unchanged.
 */
export function applyAction(data, rawCall) {
    if (!data) throw new ActionError('There is nothing loaded to change yet.')
    const { name, args } = normalizeCall(rawCall)
    const stamp = now()

    const needTab = () => {
        const tab = findTab(data, args.sectionId)
        if (!tab) throw new ActionError('That section no longer exists.')
        return tab
    }
    const needTopic = (tab) => {
        const topic = findTopic(tab, args.taskId)
        if (!topic) throw new ActionError('That task no longer exists.')
        return topic
    }
    const needDate = (d) => {
        if (!DATE_RE.test(String(d || ''))) throw new ActionError('That date is not valid.')
        return d
    }
    const mapTab = (tabId, fn) => ({
        ...data,
        updatedAt: stamp,
        tabs: data.tabs.map((t) => (t.id === tabId ? fn(t) : t)),
    })

    switch (name) {
        case 'add_section': {
            const title = clean(args.name, 60)
            if (!title) throw new ActionError('A section needs a name.')
            const tab = {
                id: newId(),
                title,
                emoji: '',
                subtitle: '',
                topics: list(args.tasks).map(makeTopic),
                notes: '',
                updatedAt: stamp,
            }
            return { ...data, updatedAt: stamp, tabs: [...(data.tabs || []), tab] }
        }
        case 'rename_section': {
            const tab = needTab()
            const title = clean(args.name, 60)
            if (!title) throw new ActionError('A section needs a name.')
            return mapTab(tab.id, (t) => ({ ...t, title, updatedAt: stamp }))
        }
        case 'add_tasks': {
            const tab = needTab()
            const topics = list(args.tasks).map(makeTopic)
            if (!topics.length) throw new ActionError('There were no tasks to add.')
            return mapTab(tab.id, (t) => ({ ...t, updatedAt: stamp, topics: [...t.topics, ...topics] }))
        }
        case 'complete_task': {
            const tab = needTab()
            const topic = needTopic(tab)
            return mapTab(tab.id, (t) => ({
                ...t,
                topics: t.topics.map((x) =>
                    x.id === topic.id ? { ...x, completed: true, completedAt: stamp, updatedAt: stamp } : x
                ),
            }))
        }
        case 'delete_task': {
            const tab = needTab()
            const topic = needTopic(tab)
            return {
                ...mapTab(tab.id, (t) => ({ ...t, updatedAt: stamp, topics: t.topics.filter((x) => x.id !== topic.id) })),
                deleted: { ...(data.deleted || {}), [topic.id]: stamp },
            }
        }
        case 'add_subtasks': {
            const tab = needTab()
            const topic = needTopic(tab)
            const steps = list(args.steps).map((s) => clean(s)).filter(Boolean).map(makeSubtask)
            if (!steps.length) throw new ActionError('There were no steps to add.')
            return mapTab(tab.id, (t) => ({
                ...t,
                topics: t.topics.map((x) =>
                    x.id === topic.id ? { ...x, updatedAt: stamp, subtasks: [...(x.subtasks || []), ...steps] } : x
                ),
            }))
        }
        case 'schedule_day_task': {
            const date = needDate(args.date)
            const text = clean(args.text, 200)
            if (!text) throw new ActionError('The calendar item has no text.')
            const day = data.calendar?.[date] || []
            return {
                ...data,
                updatedAt: stamp,
                calendar: {
                    ...(data.calendar || {}),
                    [date]: [...day, { id: newId(), text, completed: false, subtasks: [], updatedAt: stamp }],
                },
            }
        }
        case 'create_block': {
            const date = needDate(args.date)
            if (!TIME_RE.test(String(args.startTime)) || !TIME_RE.test(String(args.endTime))) {
                throw new ActionError('The block times are not valid (use HH:MM).')
            }
            const known = new Set((data.tabs || []).flatMap((t) => t.topics.map((x) => x.id)))
            const taskIds = list(args.taskIds).filter((id) => known.has(id))
            const day = data.blocks?.[date] || []
            return {
                ...data,
                updatedAt: stamp,
                blocks: {
                    ...(data.blocks || {}),
                    [date]: [...day, { id: newId(), startTime: args.startTime, endTime: args.endTime, taskIds, updatedAt: stamp }],
                },
            }
        }
        case 'set_exam_date': {
            const date = needDate(args.date)
            const time = TIME_RE.test(String(args.time || '')) ? args.time : '09:00'
            return {
                ...data,
                updatedAt: stamp,
                // Same `YYYY-MM-DDTHH:MM` shape the settings screens write.
                settings: { ...(data.settings || {}), examDate: `${date}T${time}`, countdownVisible: true },
            }
        }
        case 'show_plan':
        case 'give_steps':
        case 'start_focus_session':
            return data
        default:
            throw new ActionError(`Tachycardia asked for something this app can't do (“${name}”).`)
    }
}

/**
 * The compact snapshot both apps send with every AI request — ids and names
 * only, incomplete tasks first, capped. The server re-caps it anyway.
 * `todayKey` is the device's local YYYY-MM-DD so "tomorrow" means the owner's
 * tomorrow, not the server's.
 */
export function buildAIContext(data, todayKey) {
    const today = todayKey || new Date().toISOString().slice(0, 10)
    const weekday = new Date(`${today}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
    const sections = (data?.tabs || []).map((tab) => {
        const topics = tab.topics || []
        const open = topics.filter((t) => !t.completed)
        return {
            id: tab.id,
            title: tab.title,
            done: topics.length - open.length,
            total: topics.length,
            tasks: open.slice(0, 25).map((t) => {
                const subs = t.subtasks || []
                return {
                    id: t.id,
                    name: t.name,
                    category: t.category || '',
                    steps: subs.length ? `${subs.filter((s) => s.completed).length}/${subs.length}` : '',
                }
            }),
        }
    })
    const calendar = {}
    Object.keys(data?.calendar || {})
        .filter((d) => d >= today)
        .sort()
        .slice(0, 14)
        .forEach((d) => {
            const items = (data.calendar[d] || []).filter((t) => !t.completed).map((t) => t.text)
            if (items.length) calendar[d] = items.slice(0, 8)
        })
    const blocksToday = (data?.blocks?.[today] || []).map((b) => ({ startTime: b.startTime, endTime: b.endTime }))
    return {
        today,
        weekday,
        examDate: data?.settings?.examDate || '',
        sections,
        calendar,
        blocksToday,
    }
}
