import { useState, useEffect, useCallback, useRef } from 'react'

export const useTimer = (session, onComplete, isMuted = false) => {
    const [timeLeft, setTimeLeft] = useState(0)
    const intervalRef = useRef(null)
    const audioContextRef = useRef(null)

    // Calculate time left based on timestamp
    const calculateTimeLeft = useCallback(() => {
        if (!session?.isRunning) return session?.totalSeconds || 0

        const now = Date.now()
        const elapsed = Math.floor((now - session.startTime) / 1000)
        return Math.max(0, session.totalSeconds - elapsed)
    }, [session])

    // Play notification sound
    const playSound = useCallback(() => {
        if (isMuted) return

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            if (!AudioContext) return

            const ctx = new AudioContext()
            audioContextRef.current = ctx

            // Create a pleasant completion sound
            const playTone = (freq, startTime, duration) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()

                osc.connect(gain)
                gain.connect(ctx.destination)

                osc.type = 'sine'
                osc.frequency.setValueAtTime(freq, startTime)

                gain.gain.setValueAtTime(0.3, startTime)
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

                osc.start(startTime)
                osc.stop(startTime + duration)
            }

            // Play a pleasant chime sequence
            const now = ctx.currentTime
            playTone(523.25, now, 0.2)        // C5
            playTone(659.25, now + 0.15, 0.2) // E5
            playTone(783.99, now + 0.3, 0.3)  // G5

        } catch (error) {
            console.error('Audio playback failed:', error)
        }
    }, [isMuted])

    // Show browser notification
    const showNotification = useCallback(() => {
        if (isMuted) return

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⏰ Study Session Complete!', {
                body: 'Great work! Time to take a break or review your notes.',
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: 'timer-complete',
                requireInteraction: true
            })
        }
    }, [isMuted])

    // Handle timer completion
    const handleComplete = useCallback(() => {
        playSound()
        showNotification()
        onComplete?.()
    }, [playSound, showNotification, onComplete])

    // Main timer effect
    useEffect(() => {
        if (session?.isRunning) {
            // Immediately calculate and set time left
            const remaining = calculateTimeLeft()
            setTimeLeft(remaining)

            if (remaining <= 0) {
                handleComplete()
                return
            }

            // Update every second
            intervalRef.current = setInterval(() => {
                const remaining = calculateTimeLeft()
                setTimeLeft(remaining)

                if (remaining <= 0) {
                    clearInterval(intervalRef.current)
                    handleComplete()
                }
            }, 1000)

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                }
            }
        } else {
            // Timer not running, show total time
            setTimeLeft(session?.totalSeconds || 0)

            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [session, calculateTimeLeft, handleComplete])

    // Cleanup audio context on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission()
        }
    }, [])

    // Format time as MM:SS
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }, [])

    return {
        timeLeft,
        formattedTime: formatTime(timeLeft),
        isRunning: session?.isRunning || false,
        requestNotificationPermission
    }
}
