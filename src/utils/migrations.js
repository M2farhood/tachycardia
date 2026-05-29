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
 */

// Bump this whenever the data shape changes, and add a matching migration below.
export const CURRENT_SCHEMA_VERSION = 4

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
 * Upgrade a data object to the current schema version.
 * Safe to call on any input: null/non-objects are returned unchanged.
 * @param {object|null} data
 * @returns {object|null}
 */
export const migrate = (data) => {
    if (!data || typeof data !== 'object') return data

    let working = data
    const from = getSchemaVersion(working)

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
