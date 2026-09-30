// Authentication Service
// Handles Google Sign-In and auth state management

import {
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    reload,
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

// --- Email + password ------------------------------------------------------
// Firebase Auth stores and checks the password (salted, hashed, rate-limited
// server-side). This app never stores, logs or sends a password anywhere else.
// Error messages are deliberately vague about WHICH part was wrong, so the
// sign-in form can't be used to find out whether an email has an account.

export const MIN_PASSWORD_LENGTH = 8

const EMAIL_ERRORS = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/invalid-email': 'That email address doesn\'t look right.',
    'auth/missing-password': 'Enter your password.',
    'auth/weak-password': `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    'auth/password-does-not-meet-requirements': `Use at least ${MIN_PASSWORD_LENGTH} characters, with letters and numbers.`,
    // Sign-up with an email that already exists. Saying so is unavoidable at
    // sign-up, but we point to sign-in rather than confirming anything else.
    'auth/email-already-in-use': 'Couldn\'t create the account. If you already have one, sign in instead (or reset your password).',
    'auth/account-exists-with-different-credential': 'This email is linked to Google — use “Continue with Google”.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
    'auth/operation-not-allowed': 'Email sign-in is turned off for this app.',
}
const emailError = (error) => EMAIL_ERRORS[error?.code] || 'Something went wrong. Please try again.'

const toUser = (u) => u && ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    emailVerified: u.emailVerified,
    provider: u.providerData?.[0]?.providerId || null,
})

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())

/** Create an account; sends a verification email. */
export const signUpWithEmail = async ({ email, password }) => {
    if (!isFirebaseConfigured() || !auth) return { user: null, error: 'Sign-in is not available right now.' }
    if (!validEmail(email)) return { user: null, error: EMAIL_ERRORS['auth/invalid-email'] }
    if (String(password || '').length < MIN_PASSWORD_LENGTH) return { user: null, error: EMAIL_ERRORS['auth/weak-password'] }
    try {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
        try { await sendEmailVerification(user) } catch { /* can be resent from Settings */ }
        return { user: toUser(user), error: null }
    } catch (error) {
        return { user: null, error: emailError(error) }
    }
}

export const signInWithEmail = async ({ email, password }) => {
    if (!isFirebaseConfigured() || !auth) return { user: null, error: 'Sign-in is not available right now.' }
    if (!validEmail(email) || !password) return { user: null, error: EMAIL_ERRORS['auth/invalid-credential'] }
    try {
        const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
        return { user: toUser(user), error: null }
    } catch (error) {
        return { user: null, error: emailError(error) }
    }
}

/** Always reports success for a well-formed email — never reveals whether an account exists. */
export const resetPassword = async (email) => {
    if (!isFirebaseConfigured() || !auth) return { error: 'Sign-in is not available right now.' }
    if (!validEmail(email)) return { error: EMAIL_ERRORS['auth/invalid-email'] }
    try {
        await sendPasswordResetEmail(auth, email.trim())
    } catch (error) {
        if (error?.code === 'auth/too-many-requests' || error?.code === 'auth/network-request-failed') {
            return { error: emailError(error) }
        }
    }
    return { error: null }
}

export const resendVerification = async () => {
    if (!auth?.currentUser) return { error: 'Sign in first.' }
    try {
        await sendEmailVerification(auth.currentUser)
        return { error: null }
    } catch (error) {
        return { error: emailError(error) }
    }
}

/** Re-read the account (e.g. after they clicked the verification link). */
export const refreshCurrentUser = async () => {
    if (!auth?.currentUser) return null
    try {
        await reload(auth.currentUser)
        // A fresh ID token carries the new email_verified claim to the server.
        await auth.currentUser.getIdToken(true)
    } catch { /* offline — keep the old state */ }
    return toUser(auth.currentUser)
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
            callback(toUser(firebaseUser))
        } else {
            callback(null)
        }
    })
}

