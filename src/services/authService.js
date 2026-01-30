// Authentication Service
// Handles Google Sign-In and auth state management

import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase'

/**
 * Sign in with Google
 * @returns {Promise<{user: object, error: string|null}>}
 */
export const signInWithGoogle = async () => {
    if (!isFirebaseConfigured()) {
        return {
            user: null,
            error: 'Firebase not configured. Please add Firebase credentials to .env'
        }
    }

    try {
        const result = await signInWithPopup(auth, googleProvider)
        return {
            user: {
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
            },
            error: null
        }
    } catch (error) {
        console.error('Sign in error:', error)

        // Handle specific error cases
        if (error.code === 'auth/popup-closed-by-user') {
            return { user: null, error: null } // User cancelled, not an error
        }
        if (error.code === 'auth/popup-blocked') {
            return { user: null, error: 'Popup was blocked. Please allow popups for this site.' }
        }

        return { user: null, error: error.message }
    }
}

/**
 * Sign out the current user
 * @returns {Promise<{error: string|null}>}
 */
export const signOut = async () => {
    if (!isFirebaseConfigured() || !auth) {
        return { error: null }
    }

    try {
        await firebaseSignOut(auth)
        return { error: null }
    } catch (error) {
        console.error('Sign out error:', error)
        return { error: error.message }
    }
}

/**
 * Subscribe to auth state changes
 * @param {function} callback - Called with user object or null
 * @returns {function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
    if (!isFirebaseConfigured() || !auth) {
        // If Firebase isn't configured, call with null immediately
        callback(null)
        return () => { } // No-op unsubscribe
    }

    return onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            callback({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL
            })
        } else {
            callback(null)
        }
    })
}

/**
 * Get the current user synchronously
 * @returns {object|null}
 */
export const getCurrentUser = () => {
    if (!isFirebaseConfigured() || !auth || !auth.currentUser) {
        return null
    }

    const user = auth.currentUser
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
    }
}
