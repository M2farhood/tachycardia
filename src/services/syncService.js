// Cloud Sync Service
// Handles syncing data between localStorage and Firestore

import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../config/firebase'
import { migrate, isFutureSchemaError, isFutureSchema } from '../utils/migrations'

const COLLECTION_NAME = 'study_tracker_users'

/**
 * Migrate a cloud document, tolerating one written by a NEWER client.
 * Returns { data, futureSchema }. On a future document the RAW data is handed
 * back (so the app can still display it) with futureSchema = true, which the
 * caller must turn into read-only mode. See DATA-CONTRACT.md rule 4.
 */
const migrateCloudDoc = (raw) => {
    try {
        return { data: migrate(raw), futureSchema: false }
    } catch (error) {
        if (isFutureSchemaError(error)) {
            console.warn('Cloud data is from a newer version of the app — entering read-only mode.', error)
            return { data: raw, futureSchema: true }
        }
        throw error
    }
}

/**
 * Get the user's document reference
 */
const getUserDocRef = (userId) => {
    if (!db) return null
    return doc(db, COLLECTION_NAME, userId)
}

/**
 * Save data to Firestore
 * @param {string} userId - User's UID
 * @param {object} data - Study tracker data
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const syncToCloud = async (userId, data) => {
    if (!isFirebaseConfigured() || !db) {
        return { success: false, error: 'Firebase not configured' }
    }

    // Last line of defence: never push a document this client does not fully
    // understand. The UI already blocks this via read-only mode; this guard means
    // a missed code path degrades into "sync paused", not "newer data clobbered".
    if (isFutureSchema(data)) {
        return { success: false, error: 'Data is newer than this version of the app — update to keep syncing.' }
    }

    try {
        const docRef = getUserDocRef(userId)
        await setDoc(docRef, {
            data: data,
            lastUpdated: serverTimestamp(),
            updatedAt: new Date().toISOString() // Client timestamp for merging
        }, { merge: true })

        return { success: true, error: null }
    } catch (error) {
        console.error('Sync to cloud error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Pull data from Firestore
 * @param {string} userId - User's UID
 * @returns {Promise<{data: object|null, error: string|null, futureSchema: boolean}>}
 */
export const pullFromCloud = async (userId) => {
    if (!isFirebaseConfigured() || !db) {
        return { data: null, error: 'Firebase not configured', futureSchema: false }
    }

    try {
        const docRef = getUserDocRef(userId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            // Cloud data may be from a device on an older schema — upgrade it.
            // It may also be from a NEWER one — then we display, never write.
            const { data, futureSchema } = migrateCloudDoc(docSnap.data().data)
            return { data, error: null, futureSchema }
        }

        return { data: null, error: null, futureSchema: false } // No data in cloud yet
    } catch (error) {
        console.error('Pull from cloud error:', error)
        return { data: null, error: error.message, futureSchema: false }
    }
}

/**
 * Subscribe to real-time changes from Firestore
 * @param {string} userId - User's UID
 * @param {function} callback - Called with (data, updatedAt, { futureSchema })
 * @returns {function} Unsubscribe function
 */
export const subscribeToChanges = (userId, callback) => {
    if (!isFirebaseConfigured() || !db) {
        return () => { } // No-op unsubscribe
    }

    const docRef = getUserDocRef(userId)

    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const cloudData = docSnap.data()
            const { data, futureSchema } = migrateCloudDoc(cloudData.data)
            callback(data, cloudData.updatedAt, { futureSchema })
        }
    }, (error) => {
        console.error('Snapshot error:', error)
    })
}

// Per-entity merge lives in a pure, Firebase-free module (so it is unit-testable).
export { mergeData } from '../utils/syncMerge'

/**
 * Check if cloud sync is available
 */
export const isSyncAvailable = () => {
    return isFirebaseConfigured() && db !== null
}
