/**
 * The actions Tachycardia may *propose*. Defined once, here, so the web app
 * and the phone app get exactly the same list. The apps apply them with the
 * twin file `aiActions.js` — keep names and argument shapes in step with it.
 *
 * Nothing here runs on the server. The model returns tool calls, the app shows
 * each as a card, and only the owner's Apply tap changes anything.
 */

const fn = (name, description, properties, required = []) => ({
    type: 'function',
    function: {
        name,
        description,
        parameters: { type: 'object', properties, required, additionalProperties: false },
    },
})

const str = (description) => ({ type: 'string', description })
const date = { type: 'string', description: 'Date as YYYY-MM-DD' }
const time = (d) => ({ type: 'string', description: `${d} as 24h HH:MM` })
const taskList = {
    type: 'array',
    description: 'Tasks to add, in order',
    items: {
        type: 'object',
        properties: {
            name: str('Short task name'),
            category: str('Optional short category label'),
            date: { type: 'string', description: 'Optional day for the task, YYYY-MM-DD (it then also shows in the calendar)' },
        },
        required: ['name'],
        additionalProperties: false,
    },
}

// Tools that change the owner's data (each needs an Apply tap).
export const APP_TOOLS = [
    fn('add_section', 'Create a new section (one to-do list per project or life area), optionally with first tasks.', {
        name: str('Section name, short'),
        tasks: taskList,
    }, ['name']),
    fn('rename_section', 'Rename an existing section.', {
        sectionId: str('Section id from the context'),
        name: str('New name'),
    }, ['sectionId', 'name']),
    fn('add_tasks', 'Add tasks to an existing section.', {
        sectionId: str('Section id from the context'),
        tasks: taskList,
    }, ['sectionId', 'tasks']),
    fn('complete_task', 'Mark a task as done.', {
        sectionId: str('Section id'),
        taskId: str('Task id'),
    }, ['sectionId', 'taskId']),
    fn('delete_task', 'Delete a task. Only when the user clearly asks to delete/remove it.', {
        sectionId: str('Section id'),
        taskId: str('Task id'),
    }, ['sectionId', 'taskId']),
    fn('add_subtasks', 'Add small steps (subtasks) under a task.', {
        sectionId: str('Section id'),
        taskId: str('Task id'),
        steps: { type: 'array', items: { type: 'string' }, description: '2-6 tiny, concrete steps' },
    }, ['sectionId', 'taskId', 'steps']),
    fn('schedule_day_task', 'Put an item on a specific calendar day.', {
        date,
        text: str('What to do that day, short'),
    }, ['date', 'text']),
    fn('create_block', 'Reserve a time block on a day, optionally linked to tasks.', {
        date,
        startTime: time('Start'),
        endTime: time('End'),
        taskIds: { type: 'array', items: { type: 'string' }, description: 'Task ids to work on in this block' },
    }, ['date', 'startTime', 'endTime']),
    fn('set_exam_date', 'Set the countdown/deadline date shown on the dashboard.', {
        date,
        time: time('Optional time'),
    }, ['date']),
]

// Focus-mode tools: they drive the screen and never change data on their own.
export const FOCUS_TOOLS = [
    fn('show_plan', 'Show the person a calm, dated plan that gets them to their deadline. Use when they are worried about time.', {
        headline: str('One reassuring sentence, e.g. "Two short sessions a day gets you there by Friday."'),
        items: {
            type: 'array',
            description: 'Dated plan items, soonest first, today first if possible',
            items: {
                type: 'object',
                properties: { date, text: str('What to do that day, short'), minutes: { type: 'number' } },
                required: ['date', 'text'],
                additionalProperties: false,
            },
        },
    }, ['headline', 'items']),
    fn('give_steps', 'Break one task into tiny steps and start a sprint. Use when they just need to get moving.', {
        taskName: str('The task being worked on'),
        sectionId: str('Section id if it is an existing task'),
        taskId: str('Task id if it is an existing task'),
        steps: { type: 'array', items: { type: 'string' }, description: '3-6 tiny steps; the first takes under 2 minutes' },
        sprintMinutes: { type: 'number', description: 'Sprint length, usually 10-25' },
    }, ['taskName', 'steps', 'sprintMinutes']),
    fn('start_focus_session', 'Start a focus timer on an existing task.', {
        sectionId: str('Section id'),
        taskId: str('Task id'),
        minutes: { type: 'number' },
        firstStep: str('The very first tiny action'),
    }, ['sectionId', 'taskId', 'minutes']),
]

const ALL_NAMES = new Set([...APP_TOOLS, ...FOCUS_TOOLS].map((t) => t.function.name))
export const isKnownTool = (name) => ALL_NAMES.has(name)
