import { useEffect, useState } from 'react'

/**
 * One-time consent before anything is sent to the AI — same rule as the phone
 * app (App Store 5.1.2(i)): say what goes to a third-party AI and get an OK
 * first. Stored per browser; every component listening updates together.
 */
const KEY = 'tachycardia_ai_consent_v1'
const EVENT = 'tachycardia-ai-consent'

const read = () => {
    try { return !!localStorage.getItem(KEY) } catch { return false }
}

export function grantAIConsent() {
    try { localStorage.setItem(KEY, new Date().toISOString()) } catch { /* private mode: this tab only */ }
    window.dispatchEvent(new Event(EVENT))
}

export function useAIConsent() {
    const [consented, setConsented] = useState(read)
    useEffect(() => {
        const sync = () => setConsented(read())
        window.addEventListener(EVENT, sync)
        window.addEventListener('storage', sync)
        return () => {
            window.removeEventListener(EVENT, sync)
            window.removeEventListener('storage', sync)
        }
    }, [])
    return consented
}
