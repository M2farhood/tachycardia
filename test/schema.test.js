import test from 'node:test'
import assert from 'node:assert/strict'

import {
  migrate,
  needsMigration,
  getSchemaVersion,
  isFutureSchemaError,
  FutureSchemaError,
  CURRENT_SCHEMA_VERSION,
} from '../src/utils/migrations.js'
import { templates, getInitialState } from '../src/utils/templates.js'
import { mergeData } from '../src/utils/syncMerge.js'

const templateKeys = Object.keys(templates)

/*
 * These tests exist because the web app and the iOS app write to the SAME
 * Firestore document. Anything that lets the two disagree about the shape of
 * that document is a data-loss bug, so the invariants are pinned here.
 *
 * The same file lives in the mobile repo (see DATA-CONTRACT.md). It must run on
 * plain Node with `node --test` — no bundler, no jsdom, no extra dependency.
 */

test('every template key produces a state object', () => {
  assert.ok(templateKeys.length > 0, 'expected at least one template')
  for (const key of templateKeys) {
    const state = getInitialState(key)
    assert.ok(state && typeof state === 'object', `${key} produced no state`)
    assert.ok(Array.isArray(state.tabs), `${key} has no tabs array`)
  }
})

test('fresh state claims the current schema version', () => {
  for (const key of templateKeys) {
    assert.equal(
      getSchemaVersion(getInitialState(key)),
      CURRENT_SCHEMA_VERSION,
      `${key} does not claim v${CURRENT_SCHEMA_VERSION}`,
    )
  }
})

test('fresh state actually CONFORMS to the version it claims', () => {
  // A fresh document already says schemaVersion N, so migrate() short-circuits
  // and can never repair it. Comparing migrate(fresh) to fresh is therefore
  // vacuous — it passes even when fields are missing.
  //
  // The honest check: force the same object through the FULL migration ladder
  // from v0 and compare the resulting field sets. Anything the ladder adds that
  // getInitialState doesn't emit is a field new users will never receive.
  for (const key of templateKeys) {
    const fresh = getInitialState(key)

    assert.equal(
      needsMigration(fresh),
      false,
      `${key}: fresh state reports that it still needs migrating`,
    )

    const fullyMigrated = migrate({ ...structuredClone(fresh), schemaVersion: 0 })

    assert.deepEqual(
      Object.keys(fresh).sort(),
      Object.keys(fullyMigrated).sort(),
      `${key}: fresh state is missing top-level fields that its own schemaVersion promises`,
    )

    assert.deepEqual(
      Object.keys(fresh.settings).sort(),
      Object.keys(fullyMigrated.settings).sort(),
      `${key}: fresh settings are missing fields that its own schemaVersion promises`,
    )
  }
})

test('migrate is idempotent', () => {
  for (const key of templateKeys) {
    const once = migrate(structuredClone(getInitialState(key)))
    const twice = migrate(structuredClone(once))
    assert.deepEqual(twice, once, `${key}: migrating twice differs from once`)
  }
})

test('legacy documents migrate up to the current version', () => {
  const ancient = { tabs: [{ id: 'a', title: 'Old', topics: [] }] }
  const migrated = migrate(ancient)
  assert.equal(getSchemaVersion(migrated), CURRENT_SCHEMA_VERSION)
  assert.equal(needsMigration(migrated), false)
})

test('migrate REFUSES data from the future', () => {
  // A web deploy lands in seconds; an App Store release takes days. The older
  // client must stop, not guess: silently returning the document unchanged made
  // it re-writable, which drops whatever the newer client added.
  const fromTheFuture = {
    ...getInitialState(templateKeys[0]),
    schemaVersion: CURRENT_SCHEMA_VERSION + 1,
  }

  assert.throws(
    () => migrate(fromTheFuture),
    (err) => {
      assert.ok(err instanceof FutureSchemaError, 'not a FutureSchemaError')
      assert.equal(err.code, 'FUTURE_SCHEMA', 'error is not identifiable by .code')
      assert.ok(isFutureSchemaError(err), 'isFutureSchemaError did not recognise it')
      assert.equal(err.foundVersion, CURRENT_SCHEMA_VERSION + 1)
      return true
    },
  )

  // Callers must never have to string-match the message.
  assert.equal(isFutureSchemaError(new Error('anything')), false)
  assert.equal(isFutureSchemaError(null), false)
})

test('merging identical documents returns the SAME reference (stops the sync loop)', () => {
  // This is the property that terminates the write -> snapshot -> write loop.
  // mergeData must return its first argument unchanged when nothing differs,
  // so the caller can skip dispatching and the loop dies.
  const local = migrate(getInitialState(templateKeys[0]))
  const cloud = structuredClone(local)
  assert.equal(
    mergeData(local, cloud),
    local,
    'merging equal documents produced a new object — a two-device sync loop is possible',
  )
})

test('merging is stable when re-applied (convergence)', () => {
  const local = migrate(getInitialState(templateKeys[0]))
  const cloud = structuredClone(local)
  const first = mergeData(local, cloud)
  const second = mergeData(first, cloud)
  assert.equal(second, first, 'a second merge of the same cloud doc kept changing state')
})

test('merging never silently drops a tab', () => {
  const base = migrate(getInitialState(templateKeys[0]))
  const local = structuredClone(base)
  const cloud = structuredClone(base)

  cloud.tabs = [
    ...cloud.tabs,
    {
      id: 'only-in-cloud',
      title: 'Added elsewhere',
      emoji: '📌',
      subtitle: '',
      topics: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    },
  ]

  const merged = mergeData(local, cloud)
  const ids = merged.tabs.map((t) => t.id)
  assert.ok(ids.includes('only-in-cloud'), 'a tab present only in the cloud was lost')
  for (const tab of local.tabs) {
    assert.ok(ids.includes(tab.id), `local tab ${tab.id} was lost in the merge`)
  }
})

test('merge is symmetric — both sides converge on the same document', () => {
  const base = migrate(getInitialState(templateKeys[0]))
  const stamp = new Date().toISOString()

  const local = structuredClone(base)
  local.tabs[0].topics = [
    { id: 'topic-local', name: 'From the laptop', completed: false, subtasks: [], updatedAt: stamp },
  ]

  const cloud = structuredClone(base)
  cloud.tabs[0].topics = [
    { id: 'topic-cloud', name: 'From the phone', completed: false, subtasks: [], updatedAt: stamp },
  ]

  const a = mergeData(structuredClone(local), structuredClone(cloud))
  const b = mergeData(structuredClone(cloud), structuredClone(local))

  const idsOf = (doc) => doc.tabs[0].topics.map((t) => t.id).sort()
  assert.deepEqual(idsOf(a), ['topic-cloud', 'topic-local'])
  assert.deepEqual(idsOf(a), idsOf(b), 'the two devices disagree about which topics survive')
})

test('a tombstone deletes on the other device, and a later edit resurrects', () => {
  const base = migrate(getInitialState(templateKeys[0]))
  const early = '2026-01-01T00:00:00.000Z'
  const late = '2026-01-02T00:00:00.000Z'
  const later = '2026-01-03T00:00:00.000Z'

  const withTopic = structuredClone(base)
  withTopic.tabs[0].topics = [
    { id: 'doomed', name: 'Delete me', completed: false, subtasks: [], updatedAt: early },
  ]

  // Deleted on the other device, after the last edit → stays deleted.
  const deletedElsewhere = structuredClone(base)
  deletedElsewhere.tabs[0].topics = []
  deletedElsewhere.deleted = { doomed: late }

  const merged = mergeData(structuredClone(withTopic), structuredClone(deletedElsewhere))
  assert.equal(
    merged.tabs[0].topics.find((t) => t.id === 'doomed'),
    undefined,
    'a tombstone newer than the edit failed to delete the topic',
  )
  assert.equal(merged.deleted.doomed, late, 'the tombstone itself was lost in the merge')

  // Edited AFTER the deletion → last-write-wins resurrects it.
  const editedAfter = structuredClone(withTopic)
  editedAfter.tabs[0].topics[0].updatedAt = later
  const resurrected = mergeData(structuredClone(editedAfter), structuredClone(deletedElsewhere))
  assert.ok(
    resurrected.tabs[0].topics.some((t) => t.id === 'doomed'),
    'an edit newer than the deletion should resurrect the topic',
  )
})

test('timerSession is never adopted from the cloud (it is device-local)', () => {
  const base = migrate(getInitialState(templateKeys[0]))

  const local = structuredClone(base)
  local.timerSession = null

  const cloud = structuredClone(base)
  cloud.updatedAt = new Date(Date.now() + 60_000).toISOString() // cloud is newer
  cloud.timerSession = { tabId: 't', topicId: 'x', startTime: Date.now(), totalSeconds: 1500, isRunning: true }

  const merged = mergeData(local, cloud)
  assert.equal(
    merged.timerSession,
    null,
    'a running timer from another device leaked into this one',
  )
})

test('timeLog merges per day by keeping the larger value', () => {
  const base = migrate(getInitialState(templateKeys[0]))

  const local = structuredClone(base)
  local.timeLog = { '2026-08-01': 1800, '2026-08-02': 600 }

  const cloud = structuredClone(base)
  cloud.timeLog = { '2026-08-02': 3000, '2026-08-03': 900 }

  const merged = mergeData(local, cloud)
  assert.deepEqual(merged.timeLog, {
    '2026-08-01': 1800, // only local knew about it
    '2026-08-02': 3000, // both knew; the larger value wins (never summed)
    '2026-08-03': 900,  // only the cloud knew about it
  })

  // Merging again must not keep growing the numbers.
  const again = mergeData(merged, cloud)
  assert.deepEqual(again.timeLog, merged.timeLog, 'timeLog is not stable across repeated merges')
})

test('fresh state is complete — no field the app reads is missing', () => {
  // Fields with live consumers in App.jsx / the components. If one of these is
  // ever dropped from getInitialState, new users hit undefined at runtime.
  const requiredTop = [
    'version', 'schemaVersion', 'updatedAt', 'deleted', 'calendar', 'blocks',
    'blockTemplates', 'studyDates', 'timeLog', 'settings', 'tabs', 'timerSession',
  ]
  const requiredSettings = ['timerDuration', 'isMuted', 'spacedRepetition', 'createdAt']

  for (const key of templateKeys) {
    const fresh = getInitialState(key)
    for (const field of requiredTop) {
      assert.ok(field in fresh, `${key}: fresh state is missing top-level "${field}"`)
    }
    for (const field of requiredSettings) {
      assert.ok(field in fresh.settings, `${key}: fresh settings are missing "${field}"`)
    }
    for (const tab of fresh.tabs) {
      assert.ok(tab.updatedAt, `${key}: a fresh tab has no updatedAt (it can never win a merge)`)
      assert.ok(Array.isArray(tab.topics), `${key}: a fresh tab has no topics array`)
    }
  }
})
