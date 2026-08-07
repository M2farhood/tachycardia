/**
 * @study/core — the shared brain.
 *
 * WHY THIS PACKAGE EXISTS
 * The web app and the iOS app sign in as the same Firebase user and read/write
 * the SAME Firestore document (`study_tracker_users/{uid}`). If the data shapes,
 * the migration ladder, or the merge rules ever differ between the two apps, real
 * study history gets silently corrupted. Sharing one copy makes that impossible.
 *
 * RULES FOR ANYTHING ADDED HERE
 *  1. No platform globals — no window, document, localStorage, navigator, alert,
 *     FileReader, Blob, AsyncStorage, Alert, import.meta, process.env.
 *     Anything from the environment arrives as a function argument.
 *  2. No renderer imports — no react-dom, no react-native, no icon libraries.
 *  3. Must run under `node --test` with no jsdom and no React Native preset.
 *
 * MIGRATIONS MAY ONLY EVER ADD.
 * Two independently-deployed clients live on one document, and an App Store
 * release takes days to reach users while a web deploy takes seconds. During that
 * window both versions are writing. So: never rename a field, never remove one,
 * never reshape one. Add, and read defensively.
 */

// Schema — the shape of the persisted document and the migration ladder.
export {
  CURRENT_SCHEMA_VERSION,
  getSchemaVersion,
  migrate,
  needsMigration,
} from './schema/migrations.js'

export {
  templates,
  generateId,
  createEmptyTopic,
  createEmptyTab,
  getInitialState,
} from './schema/templates.js'

// Sync — per-entity last-write-wins merge with tombstones.
export { deepEqual, mergeData } from './sync/syncMerge.js'

// Parsing — turns a pasted study plan into topics.
export { parsePlan, tasksToTopics } from './parse/planParser.js'
