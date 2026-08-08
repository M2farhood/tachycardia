/**
 * Schema migration engine
 * --------------------------------------------------------------------------
 * The app's data shape evolves over time. To upgrade existing localStorage /
 * cloud data safely, every stored object carries an integer `schemaVersion`.
 *
 * `migrate(data)` walks the data forward from whatever version it is at to
 * CURRENT_SCHEMA_VERSION, applying each registered migration in order. It is:
 *   - idempotent  — running it on already-current data is a no-op
 *   - additive    — migrations only add/normalize fields, never drop user data
 *   - total       — legacy data with no `schemaVersion` is treated as v0
 *
 * To introduce a schema change: bump CURRENT_SCHEMA_VERSION and add a migration
 * keyed by the new version number that transforms v(N-1) data into v(N) data.
 *
 * Data from the FUTURE (schemaVersion > CURRENT_SCHEMA_VERSION) is refused, not
 * guessed at: `migrate` throws a FutureSchemaError. The web app deploys in
 * seconds while an App Store release takes days, so the two clients WILL be on
 * different schema versions at some point; the older one must show the data and
 * stop writing rather than silently round-trip fields it does not understand.
 */

// Bump this whenever the data shape changes, and add a matching migration below.
export const CURRENT_SCHEMA_VERSION = 7

/**
 * Thrown by `migrate()` when it is handed data written by a NEWER client.
 * Callers must detect this by `err.code === 'FUTURE_SCHEMA'` (or `instanceof`),
 * never by matching the message text.
 */
export class FutureSchemaError extends Error {
    constructor(found, expected = CURRENT_SCHEMA_VERSION) {
        super(
            `Data is at schema version ${found}, but this client only understands ${expected}. ` +
            'Update the app to keep syncing.'
        )
        this.name = 'FutureSchemaError'
        this.code = 'FUTURE_SCHEMA'
        this.foundVersion = found
        this.expectedVersion = expected
    }
}

/** True if `err` is the future-schema refusal (structural check, never string matching). */
export const isFutureSchemaError = (err) =>
    !!err && (err instanceof FutureSchemaError || err.code === 'FUTURE_SCHEMA')

/**
 * Migrations keyed by the version they PRODUCE.
 * migrations[N] receives data already at version N-1 and returns data at N.
 * `migrate` stamps `schemaVersion` itself, so migrations needn't set it.
 *
 * @type {Record<number, (data: object) => object>}
 */
const migrations = {
    // v0 (legacy / unversioned) -> v1: baseline normalization.
    // Guarantees every field the app reads actually exists, with sane defaults,
    // without touching any data the user already has.
    1: (data) => {
        const settings = data.settings || {}
        return {
            ...data,
            version: data.version || '1.0.0',
            settings: {
                timerDuration: 25,
                isMuted: false,
                createdAt: new Date().toISOString(),
                ...settings, // anything already saved wins over the defaults above
            },
            tabs: (data.tabs || []).map((tab) => ({
                ...tab,
                notes: tab.notes || '',
                topics: (tab.topics || []).map((topic) => ({
                    ...topic,
                    completed: !!topic.completed,
                    subtasks: (topic.subtasks || []).map((s) => ({
                        ...s,
                        completed: !!s.completed,
                    })),
                })),
            })),
            timerSession: data.timerSession ?? null,
        }
    },

    // v1 -> v2: per-entity sync metadata. Stamps `updatedAt` on the root and on
    // every tab/topic/subtask, and adds a `deleted` tombstone map. This is what
    // lets the cloud merge resolve conflicts per-item instead of clobbering the
    // whole document. Existing items are backfilled from createdAt (or now).
    2: (data) => {
        const stamp = data.settings?.createdAt || new Date().toISOString()
        return {
            ...data,
            updatedAt: data.updatedAt || stamp,
            deleted: data.deleted || {},
            tabs: (data.tabs || []).map((tab) => ({
                ...tab,
                updatedAt: tab.updatedAt || stamp,
                topics: (tab.topics || []).map((topic) => ({
                    ...topic,
                    updatedAt: topic.updatedAt || stamp,
                    subtasks: (topic.subtasks || []).map((s) => ({
                        ...s,
                        updatedAt: s.updatedAt || stamp,
                    })),
                })),
            })),
        }
    },

    // v2 -> v3: calendar moves into the main data object so it syncs to the
    // cloud (it used to live in a separate, un-synced localStorage key). This
    // step just ensures the `calendar` field exists and stamps updatedAt on any
    // entries already present; the one-time import of the legacy localStorage
    // key happens at load time in useLocalStorage (a migration can't read it).
    3: (data) => {
        const stamp = data.updatedAt || data.settings?.createdAt || new Date().toISOString()
        const calendar = {}
        for (const [dateKey, list] of Object.entries(data.calendar || {})) {
            calendar[dateKey] = (list || []).map((task) => ({
                ...task,
                updatedAt: task.updatedAt || stamp,
                subtasks: (task.subtasks || []).map((s) => ({
                    ...s,
                    updatedAt: s.updatedAt || stamp,
                })),
            }))
        }
        return { ...data, calendar }
    },

    // v3 -> v4: real, date-based study streak. `studyDates` holds the YYYY-MM-DD
    // of every day the user logged study time; the streak is derived from it
    // instead of the old fake "completed topics / 3" formula.
    4: (data) => ({
        ...data,
        studyDates: data.studyDates || [],
    }),

    // v4 -> v5: day blocks planner. `blocks` holds time blocks per day, each
    // with a start/end time and a list of task IDs assigned to that block.
    5: (data) => ({
        ...data,
        blocks: data.blocks || {},
    }),

    // v5 -> v6: block templates + spaced repetition setting
    6: (data) => ({
        ...data,
        blockTemplates: data.blockTemplates || [],
        settings: {
            ...data.settings,
            spacedRepetition: data.settings?.spacedRepetition ?? false,
        },
    }),

    // v6 -> v7: study time becomes syncable. `timeLog` is { 'YYYY-MM-DD': seconds }
    // and the all-time total is simply the sum of its values.
    //
    // This step may ONLY add the field. The legacy device-local localStorage keys
    // (`study_tracker_daily_time` / `study_tracker_total_time`) stay exactly where
    // they are and keep being written, so an older client loses nothing; the
    // one-time backfill from those keys happens at load time in useLocalStorage
    // (a migration is shared with the iOS app and must never touch localStorage).
    7: (data) => ({
        ...data,
        timeLog: data.timeLog || {},
    }),
}

/**
 * Read the schema version off a stored object. Legacy data (string `version`
 * field or nothing at all) is treated as v0 so the baseline migration runs.
 * @param {object} data
 * @returns {number}
 */
export const getSchemaVersion = (data) => {
    if (data && typeof data.schemaVersion === 'number') return data.schemaVersion
    return 0
}

/**
 * True if the data was written by a newer client than this one.
 * @param {object|null} data
 * @returns {boolean}
 */
export const isFutureSchema = (data) => {
    if (!data || typeof data !== 'object') return false
    return getSchemaVersion(data) > CURRENT_SCHEMA_VERSION
}

/**
 * Upgrade a data object to the current schema version.
 * Safe to call on any input: null/non-objects are returned unchanged.
 * @param {object|null} data
 * @returns {object|null}
 * @throws {FutureSchemaError} if the data is newer than this client understands.
 */
export const migrate = (data) => {
    if (!data || typeof data !== 'object') return data

    let working = data
    const from = getSchemaVersion(working)

    // Refuse data from the future. Returning it unchanged (the old behaviour)
    // meant this client would happily re-write a document it does not fully
    // understand, dropping whatever the newer client added.
    if (from > CURRENT_SCHEMA_VERSION) {
        throw new FutureSchemaError(from, CURRENT_SCHEMA_VERSION)
    }

    for (let v = from + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
        const step = migrations[v]
        if (step) working = step(working)
        working = { ...working, schemaVersion: v }
    }

    return working
}

/**
 * True if the data is behind the current schema and would change on migrate().
 * Useful for deciding whether to re-persist after loading.
 * @param {object|null} data
 * @returns {boolean}
 */
export const needsMigration = (data) => {
    if (!data || typeof data !== 'object') return false
    return getSchemaVersion(data) < CURRENT_SCHEMA_VERSION
}
