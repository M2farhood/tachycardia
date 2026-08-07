import test from 'node:test'
import assert from 'node:assert/strict'

import {
  templates,
  getInitialState,
  migrate,
  needsMigration,
  getSchemaVersion,
  CURRENT_SCHEMA_VERSION,
  mergeData,
} from '../src/index.js'

const templateKeys = Object.keys(templates)

/*
 * These tests exist because the web app and the iOS app write to the SAME
 * Firestore document. Anything that lets the two disagree about the shape of
 * that document is a data-loss bug, so the invariants are pinned here.
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
  // A fresh document already says schemaVersion 6, so migrate() short-circuits
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
