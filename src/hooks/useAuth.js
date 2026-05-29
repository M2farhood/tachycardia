// Authentication Hook
// Provides reactive auth state and sync functionality for React components

import { useState, useEffect, useCallback, useRef } from 'react'
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

export const useAuth = (localData, onDataSync) => {
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
    const localDataRef = useRef(localData)
    useEffect(() => {
        localDataRef.current = localData
    }, [localData])

    // Subscribe to cloud changes when signed in
    useEffect(() => {
        if (!user || !isSyncAvailable()) return

        const unsubscribe = subscribeToChanges(user.uid, (cloudData) => {
            if (!cloudData || !onDataSync) return
            // mergeData returns the same reference when nothing actually changed,
            // which prevents a write -> snapshot -> write feedback loop.
            const merged = mergeData(localDataRef.current, cloudData)
            if (merged !== localDataRef.current) {
                onDataSync(merged)
                setSyncStatus('synced')
            }
        })

        return () => unsubscribe()
    }, [user, onDataSync])

    // Sync local data to cloud when it changes (debounced)
    useEffect(() => {
        if (!user || !localData || !isSyncAvailable()) return

        const timeoutId = setTimeout(async () => {
            setIsSyncing(true)
            setSyncStatus('syncing')

            const { success, error } = await syncToCloud(user.uid, localData)

            setIsSyncing(false)
            setSyncStatus(success ? 'synced' : 'error')
            if (error) setError(error)
        }, 1000) // Debounce by 1 second

        return () => clearTimeout(timeoutId)
    }, [user, localData])

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
            // Pull cloud data and merge with local
            const { data: cloudData, error: pullError } = await pullFromCloud(authUser.uid)

            if (pullError) {
                console.warn('Could not pull cloud data:', pullError)
            }

            if (cloudData && localData && onDataSync) {
                // Merge cloud data with local data
                const merged = mergeData(localData, cloudData)
                onDataSync(merged)

                // Push merged data back to cloud
                await syncToCloud(authUser.uid, merged)
            } else if (!cloudData && localData) {
                // No cloud data, push local to cloud
                await syncToCloud(authUser.uid, localData)
            } else if (cloudData && !localData && onDataSync) {
                // No local data, use cloud
                onDataSync(cloudData)
            }

            setSyncStatus('synced')
        }

        setIsLoading(false)
        return { success: true, error: null }
    }, [localData, onDataSync])

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
        isFirebaseConfigured: isFirebaseConfigured()
    }
}
