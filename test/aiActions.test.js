import test from 'node:test'
import assert from 'node:assert/strict'

import { applyAction, describeAction, buildAIContext, normalizeCall, ActionError } from '../src/utils/aiActions.js'
import { getInitialState } from '../src/utils/templates.js'
import { mergeData } from '../src/utils/syncMerge.js'

/*
 * aiActions.js is a twin file (web src/utils ⇄ mobile src/data). These tests
 * pin the one promise that matters for a shared document: an AI change is an
 * ordinary, well-stamped edit — no invented fields, tombstones on delete, and
 * a bad call fails loudly instead of half-writing.
 */

const seed = () => {
  const data = getInitialState('blank')
  data.tabs[0].topics.push({ id: 't1', name: 'Read chapter 1', category: '', completed: false, subtasks: [], updatedAt: data.updatedAt })
  return data
}
const call = (name, args) => ({ id: 'c1', name, arguments: JSON.stringify(args) })

test('add_section creates a named section with tasks', () => {
  const data = seed()
  const next = applyAction(data, call('add_section', { name: 'Hospital', tasks: [{ name: 'Ward round notes' }] }))
  assert.equal(next.tabs.length, data.tabs.length + 1)
  const tab = next.tabs.at(-1)
  assert.equal(tab.title, 'Hospital')
  assert.equal(tab.topics[0].name, 'Ward round notes')
  assert.ok(tab.updatedAt && tab.topics[0].updatedAt)
  assert.deepEqual(Object.keys(tab).sort(), ['emoji', 'id', 'notes', 'subtitle', 'title', 'topics', 'updatedAt'])
})

test('add_tasks, add_subtasks and complete_task edit the right task', () => {
  let data = seed()
  const tabId = data.tabs[0].id
  data = applyAction(data, call('add_tasks', { sectionId: tabId, tasks: [{ name: 'A' }, { name: 'B', category: 'x' }] }))
  assert.equal(data.tabs[0].topics.length, 3)
  data = applyAction(data, call('add_subtasks', { sectionId: tabId, taskId: 't1', steps: ['open book', ' '] }))
  assert.deepEqual(data.tabs[0].topics[0].subtasks.map((s) => s.name), ['open book'])
  data = applyAction(data, call('complete_task', { sectionId: tabId, taskId: 't1' }))
  assert.equal(data.tabs[0].topics[0].completed, true)
  assert.ok(data.tabs[0].topics[0].completedAt)
})

test('delete_task leaves a tombstone so the deletion syncs', () => {
  const data = seed()
  const next = applyAction(data, call('delete_task', { sectionId: data.tabs[0].id, taskId: 't1' }))
  assert.equal(next.tabs[0].topics.length, 0)
  assert.ok(next.deleted.t1)
  // And a merge with the old copy does not resurrect it.
  const merged = mergeData(next, data)
  assert.equal(merged.tabs[0].topics.find((t) => t.id === 't1'), undefined)
})

test('calendar, block and countdown tools write existing shapes', () => {
  let data = seed()
  data = applyAction(data, call('schedule_day_task', { date: '2026-10-02', text: 'Revise' }))
  assert.equal(data.calendar['2026-10-02'][0].text, 'Revise')
  data = applyAction(data, call('create_block', { date: '2026-10-02', startTime: '09:00', endTime: '10:30', taskIds: ['t1', 'nope'] }))
  assert.deepEqual(data.blocks['2026-10-02'][0].taskIds, ['t1'])
  data = applyAction(data, call('set_exam_date', { date: '2026-11-01' }))
  assert.equal(data.settings.examDate, '2026-11-01T09:00')
})

test('bad calls throw ActionError and leave data untouched', () => {
  const data = seed()
  const before = JSON.stringify(data)
  assert.throws(() => applyAction(data, call('add_tasks', { sectionId: 'missing', tasks: [{ name: 'x' }] })), ActionError)
  assert.throws(() => applyAction(data, call('schedule_day_task', { date: 'tomorrow', text: 'x' })), ActionError)
  assert.throws(() => applyAction(data, call('drop_database', {})), ActionError)
  assert.equal(JSON.stringify(data), before)
})

test('display-only tools never change data', () => {
  const data = seed()
  assert.equal(applyAction(data, call('show_plan', { headline: 'ok', items: [] })), data)
  assert.equal(applyAction(data, call('give_steps', { taskName: 'x', steps: ['a'], sprintMinutes: 10 })), data)
})

test('describeAction uses the owner’s names and never throws', () => {
  const data = seed()
  const tabId = data.tabs[0].id
  assert.match(describeAction(data, call('add_tasks', { sectionId: tabId, tasks: [{ name: 'a' }, { name: 'b' }] })), /Add 2 tasks to “My Section”/)
  assert.match(describeAction(data, call('complete_task', { sectionId: 'x', taskId: 'y' })), /unknown task/)
  assert.equal(normalizeCall({ name: 'x', arguments: 'not json' }).args && typeof normalizeCall({ name: 'x', arguments: 'not json' }).args, 'object')
})

test('buildAIContext is compact and id-bearing', () => {
  const data = seed()
  data.calendar = { '2020-01-01': [{ id: 'old', text: 'past', completed: false }], '2030-01-01': [{ id: 'f', text: 'future', completed: false }] }
  const ctx = buildAIContext(data, '2026-09-30')
  assert.equal(ctx.today, '2026-09-30')
  assert.equal(ctx.sections[0].tasks[0].id, 't1')
  assert.deepEqual(Object.keys(ctx.calendar), ['2030-01-01'])
})
