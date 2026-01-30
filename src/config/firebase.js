// Firebase Configuration
// You need to create a Firebase project and get these values from:
// Firebase Console > Project Settings > Your apps > Web app

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Check if Firebase is configured
const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId
}

// Initialize Firebase only if configured
let app = null
let auth = null
let db = null
let googleProvider = null

if (isFirebaseConfigured()) {
    try {
        app = initializeApp(firebaseConfig)
        auth = getAuth(app)
        db = getFirestore(app)
        googleProvider = new GoogleAuthProvider()

        // Enable offline persistence for Firestore
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence failed: Multiple tabs open')
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence not available in this browser')
            }
        })

        console.log('🔥 Firebase initialized successfully')
    } catch (error) {
        console.error('Firebase initialization error:', error)
    }
} else {
    console.log('ℹ️ Firebase not configured - running in local-only mode')
}

export { app, auth, db, googleProvider, isFirebaseConfigured }
