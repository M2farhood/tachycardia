// Authentication Hook
// Provides reactive auth state and sync functionality for React components

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import {
    signInWithGoogle as authSignIn,
    signOut as authSignOut,
    onAuthStateChange
} from '../services/authService'
import {
    syncToCloud,
    pullFromCloud,
    subscribeToChanges,
    mergeData,
    isSyncAvailable
} from '../services/syncService'
import { isFirebaseConfigured } from '../config/firebase'

/**
 * @param {object|null} localData - the current local document
 * @param {function} onDataSync - adopts a cloud merge WITHOUT re-stamping
 *   `updatedAt` (see useLocalStorage.adoptCloudData). Passing a re-stamping
 *   setter here makes two live devices ping-pong Firestore writes forever.
 * @param {{ readOnly?: boolean, onFutureSchema?: function }} [options]
 *   `readOnly` suppresses every push; `onFutureSchema` is called when the cloud
 *   document turns out to be newer than this client understands.
 */
export const useAuth = (localData, onDataSync, options = {}) => {
    const { readOnly = false, onFutureSchema } = options
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
    const [error, setError] = useState(null)

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChange((authUser) => {
            setUser(authUser)
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [])

    // Keep the latest local data in a ref so the cloud subscription can read it
    // without being torn down and recreated on every local edit.
    //
    // These are assigned in a LAYOUT effect, deliberately:
    //
    //   - Not during render. A render can be discarded or replayed, so a
    //     render-phase write can leave the merge base holding a document that
    //     was never committed — and mergeData would then resolve against state
    //     the user never actually reached.
    //   - Not in a passive `useEffect` either. Passive effects are flushed
    //     asynchronously, so a Firestore snapshot could land in the gap and
    //     merge against a document that is a full commit out of date, silently
    //     reverting the edit the user just made.
    //
    // Layout effects flush synchronously as part of the commit, so there is no
    // window in which the ref disagrees with the committed document.
    const localDataRef = useRef(localData)
    const readOnlyRef = useRef(readOnly)
    const onFutureSchemaRef = useRef(onFutureSchema)

    useLayoutEffect(() => {
        localDataRef.current = localData
        readOnlyRef.current = readOnly
        onFutureSchemaRef.current = onFutureSchema
    })

    // Subscribe to cloud changes when signed in
    useEffect(() => {
        if (!user || !isSyncAvailable()) return

        const unsubscribe = subscribeToChanges(user.uid, (cloudData, _updatedAt, meta) => {
            if (!cloudData || !onDataSync) return

            // The cloud document was written by a newer client. Show it, but stop
            // writing: adopt it as-is and flip the app into read-only mode.
            if (meta?.futureSchema) {
                onFutureSchemaRef.current?.()
                onDataSync(cloudData)
                setSyncStatus('offline')
                return
            }
            if (readOnlyRef.current) return

            // Merge against the CURRENT local document (see the ref note above).
            // mergeData returns the same reference when nothing actually changed,
            // which prevents a write -> snapshot -> write feedback loop.
            const base = localDataRef.current
            const merged = mergeData(base, cloudData)
            if (merged !== base) {
                // onDataSync must adopt WITHOUT re-stamping updatedAt, otherwise
                // this merge looks newer to the other device and the two ping-pong.
                onDataSync(merged)
                setSyncStatus('synced')
            }
        })

        return () => unsubscribe()
    }, [user, onDataSync])

    // Sync local data to cloud when it changes (debounced)
    useEffect(() => {
        if (!user || !localData || !isSyncAvailable()) return
        // Read-only mode: never write. Not once, not "just this field".
        if (readOnly) return

        const timeoutId = setTimeout(async () => {
            setIsSyncing(true)
            setSyncStatus('syncing')

            const { success, error } = await syncToCloud(user.uid, localData)

            setIsSyncing(false)
            setSyncStatus(success ? 'synced' : 'error')
            if (error) setError(error)
        }, 1000) // Debounce by 1 second

        return () => clearTimeout(timeoutId)
    }, [user, localData, readOnly])

    // Sign in with Google
    const signIn = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        const { user: authUser, error: authError } = await authSignIn()

        if (authError) {
            setError(authError)
            setIsLoading(false)
            return { success: false, error: authError }
        }

        if (authUser) {
            setSyncStatus('syncing')
            const { data: cloudData, error: pullError, futureSchema } = await pullFromCloud(authUser.uid)

            if (pullError) {
                console.warn('Could not pull cloud data:', pullError)
            }

            // The cloud document is newer than this client understands: show it,
            // never write it, and tell the app to put up the update banner.
            if (futureSchema) {
                onFutureSchemaRef.current?.()
                if (cloudData && onDataSync) onDataSync(cloudData)
                setSyncStatus('offline')
                setIsLoading(false)
                return { success: true, error: null }
            }

            let syncResult = { success: true }
            // `localDataRef.current` is the document as of this render — see the
            // note at its declaration; `localData` from the closure can be stale.
            const currentLocal = localDataRef.current
            if (cloudData && currentLocal && onDataSync) {
                const merged = mergeData(currentLocal, cloudData)
                onDataSync(merged)
                syncResult = readOnlyRef.current ? { success: true } : await syncToCloud(authUser.uid, merged)
            } else if (!cloudData && currentLocal && !readOnlyRef.current) {
                syncResult = await syncToCloud(authUser.uid, currentLocal)
            } else if (cloudData && !currentLocal && onDataSync) {
                onDataSync(cloudData)
            }

            setSyncStatus(syncResult.success ? 'synced' : 'error')
            if (!syncResult.success) {
                console.warn('Initial sync failed:', syncResult.error)
            }
        }

        setIsLoading(false)
        return { success: true, error: null }
    }, [onDataSync])

    // Sign out
    const signOut = useCallback(async () => {
        setIsLoading(true)
        const { error: signOutError } = await authSignOut()

        if (signOutError) {
            setError(signOutError)
        }

        setUser(null)
        setSyncStatus('idle')
        setIsLoading(false)

        return { success: !signOutError, error: signOutError }
    }, [])

    // Manual sync trigger
    const forceSync = useCallback(async () => {
        if (!user || !localData || !isSyncAvailable()) return
        if (readOnlyRef.current) return

        setIsSyncing(true)
        setSyncStatus('syncing')

        const { success, error } = await syncToCloud(user.uid, localData)

        setIsSyncing(false)
        setSyncStatus(success ? 'synced' : 'error')
        if (error) setError(error)
    }, [user, localData])

    return {
        user,
        isLoading,
        isSyncing,
        syncStatus,
        error,
        signIn,
        signOut,
        forceSync,
        readOnly,
        isFirebaseConfigured: isFirebaseConfigured()
    }
}
