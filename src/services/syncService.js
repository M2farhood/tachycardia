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
import { migrate } from '../utils/migrations'

const COLLECTION_NAME = 'study_tracker_users'

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
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export const pullFromCloud = async (userId) => {
    if (!isFirebaseConfigured() || !db) {
        return { data: null, error: 'Firebase not configured' }
    }

    try {
        const docRef = getUserDocRef(userId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            // Cloud data may be from a device on an older schema — upgrade it.
            return { data: migrate(docSnap.data().data), error: null }
        }

        return { data: null, error: null } // No data in cloud yet
    } catch (error) {
        console.error('Pull from cloud error:', error)
        return { data: null, error: error.message }
    }
}

/**
 * Subscribe to real-time changes from Firestore
 * @param {string} userId - User's UID
 * @param {function} callback - Called with updated data
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
            callback(migrate(cloudData.data), cloudData.updatedAt)
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
