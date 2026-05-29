// Per-entity merge (Option B) — pure, no Firebase dependency so it is unit-testable.
//
// Every tab/topic/subtask carries an `updatedAt`, and deletions are recorded in
// a flat `deleted` tombstone map (id -> ISO timestamp). The merge unions both
// sides by id and, per item, keeps the most recently updated version. A delete
// wins over an edit only if the deletion is newer than that edit (so editing an
// item on one device after deleting it on another "resurrects" it — standard
// last-write-wins). This survives concurrent edits on different devices, which
// the old whole-document strategy could not.

const tsOf = (v) => (v ? new Date(v).getTime() : 0)

/** Order-independent deep equality (used to detect "no real change"). */
export const deepEqual = (a, b) => {
    if (a === b) return true
    if (typeof a !== typeof b || a === null || b === null) return false
    if (typeof a !== 'object') return false
    if (Array.isArray(a) !== Array.isArray(b)) return false
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false
        return a.every((x, i) => deepEqual(x, b[i]))
    }
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    if (ka.length !== kb.length) return false
    return ka.every((k) => deepEqual(a[k], b[k]))
}

/** Merge two tombstone maps, keeping the newest deletion per id. */
const mergeTombstones = (a = {}, b = {}) => {
    const out = { ...a }
    for (const [id, t] of Object.entries(b)) {
        if (!out[id] || tsOf(t) > tsOf(out[id])) out[id] = t
    }
    return out
}

/** Of two versions of an entity, return the one updated more recently. */
const newerOf = (local, cloud) => (tsOf(cloud.updatedAt) > tsOf(local.updatedAt) ? cloud : local)

/**
 * Merge two arrays of {id, updatedAt} items by id.
 * @param mergeItem - (localItem, cloudItem) => merged, for items present in both
 * @param orderSource - the array whose ordering should take precedence
 */
const mergeById = (localArr = [], cloudArr = [], tombstones, mergeItem, orderSource) => {
    const localMap = new Map(localArr.map((i) => [i.id, i]))
    const cloudMap = new Map(cloudArr.map((i) => [i.id, i]))
    const ids = new Set([...localMap.keys(), ...cloudMap.keys()])

    const merged = new Map()
    for (const id of ids) {
        const l = localMap.get(id)
        const c = cloudMap.get(id)
        const item = l && c ? mergeItem(l, c) : l || c
        const del = tombstones[id]
        // Deleted unless an edit happened after the deletion.
        if (del && tsOf(del) >= tsOf(item.updatedAt)) continue
        merged.set(id, item)
    }

    // Ordering: follow orderSource, then append any items only the other side has.
    const ordered = []
    const seen = new Set()
    for (const i of orderSource || localArr) {
        if (merged.has(i.id) && !seen.has(i.id)) {
            ordered.push(merged.get(i.id))
            seen.add(i.id)
        }
    }
    for (const i of [...cloudArr, ...localArr]) {
        if (merged.has(i.id) && !seen.has(i.id)) {
            ordered.push(merged.get(i.id))
            seen.add(i.id)
        }
    }
    return ordered
}

const mergeTopic = (l, c, tombstones) => {
    const base = newerOf(l, c)
    const orderSource = base === c ? c.subtasks : l.subtasks
    return {
        ...base,
        subtasks: mergeById(l.subtasks || [], c.subtasks || [], tombstones, newerOf, orderSource),
    }
}

const mergeTab = (l, c, tombstones) => {
    const base = newerOf(l, c)
    const orderSource = base === c ? c.topics : l.topics
    return {
        ...base,
        topics: mergeById(l.topics || [], c.topics || [], tombstones, (a, b) => mergeTopic(a, b, tombstones), orderSource),
    }
}

// Calendar is { [dateKey]: Task[] }. Each day's task list merges by id (a calendar
// task has the same {id, completed, subtasks, updatedAt} shape as a topic), and
// empty days are dropped.
const mergeCalendar = (localCal = {}, cloudCal = {}, tombstones) => {
    const keys = new Set([...Object.keys(localCal || {}), ...Object.keys(cloudCal || {})])
    const out = {}
    for (const k of keys) {
        const merged = mergeById(
            localCal?.[k] || [],
            cloudCal?.[k] || [],
            tombstones,
            (a, b) => mergeTopic(a, b, tombstones),
            localCal?.[k]
        )
        if (merged.length) out[k] = merged
    }
    return out
}

/**
 * Merge local and cloud data per-entity.
 * Returns the SAME `localData` reference when the merge produces no real change,
 * so callers can cheaply skip re-rendering / re-syncing.
 * @param {object} localData
 * @param {object} cloudData - assumed already migrated to the current schema
 * @returns {object} merged data
 */
export const mergeData = (localData, cloudData) => {
    if (!localData) return cloudData
    if (!cloudData) return localData

    const tombstones = mergeTombstones(localData.deleted, cloudData.deleted)
    const primary = tsOf(cloudData.updatedAt) > tsOf(localData.updatedAt) ? cloudData : localData
    const other = primary === cloudData ? localData : cloudData

    const merged = {
        ...primary,
        settings: { ...other.settings, ...primary.settings },
        tabs: mergeById(
            localData.tabs || [],
            cloudData.tabs || [],
            tombstones,
            (l, c) => mergeTab(l, c, tombstones),
            primary.tabs
        ),
        calendar: mergeCalendar(localData.calendar, cloudData.calendar, tombstones),
        // Study days are append-only across devices — union and keep sorted.
        studyDates: [...new Set([...(localData.studyDates || []), ...(cloudData.studyDates || [])])].sort(),
        deleted: tombstones,
        // Timer is device-local; never adopt the other device's running timer.
        timerSession: localData.timerSession ?? null,
        updatedAt: primary.updatedAt,
    }

    // No meaningful change → hand back the original reference.
    if (deepEqual(merged, localData)) return localData
    return merged
}
