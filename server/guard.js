/**
 * Who may spend the AI key, and how much.
 * --------------------------------------------------------------------------
 * 1. Sign-in: every /api/ai/* call must carry a Firebase ID token
 *    (`Authorization: Bearer <token>`). It is checked with firebase-admin using
 *    only the public project id — no service-account secret is needed to
 *    *verify* a token. `ALLOW_UNAUTH_AI=true` skips this for local testing
 *    only; never set it on the VPS.
 * 2. A per-person daily message cap and a global daily spend cap, read from
 *    OpenRouter's reported cost. Counters live in memory and are mirrored to
 *    a small JSON file so a restart doesn't reset the day.
 */

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'study-tracker-ec902'
const ALLOW_UNAUTH = process.env.ALLOW_UNAUTH_AI === 'true'
const USER_DAILY_LIMIT = Number(process.env.AI_USER_DAILY_LIMIT) || 80
const DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD) || 1

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_FILE = join(__dirname, 'data', 'usage.json')

initializeApp({ projectId: PROJECT_ID })

const today = () => new Date().toISOString().slice(0, 10)

const load = () => {
    try {
        const s = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
        if (s.day === today()) return s
    } catch {
        // No file yet, or unreadable — start the day fresh.
    }
    return { day: today(), costUsd: 0, calls: 0, perUser: {} }
}

let state = load()

const save = () => {
    try {
        if (!existsSync(dirname(STATE_FILE))) mkdirSync(dirname(STATE_FILE), { recursive: true })
        writeFileSync(STATE_FILE, JSON.stringify(state))
    } catch (e) {
        console.warn('[guard] could not save usage:', e.message)
    }
}

const rollDay = () => {
    if (state.day !== today()) state = { day: today(), costUsd: 0, calls: 0, perUser: {} }
}

/** Express middleware: sets req.uid or answers 401. */
export async function requireUser(req, res, next) {
    if (ALLOW_UNAUTH) {
        req.uid = 'local-dev'
        return next()
    }
    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/)
    if (!m) return res.status(401).json({ error: 'Sign in to talk to Tachycardia.', code: 'AUTH_REQUIRED' })
    try {
        const decoded = await getAuth().verifyIdToken(m[1])
        // Email+password accounts cost nothing to create, so they must confirm
        // their address before they can spend the AI budget. Google/Apple
        // accounts arrive already verified.
        if (decoded.firebase?.sign_in_provider === 'password' && !decoded.email_verified) {
            return res.status(403).json({ error: 'Confirm your email to use Tachycardia — open the link we sent you (Settings → Account).', code: 'EMAIL_UNVERIFIED' })
        }
        req.uid = decoded.uid
        next()
    } catch {
        res.status(401).json({ error: 'Your sign-in expired. Sign in again.', code: 'AUTH_REQUIRED' })
    }
}

/** Express middleware: refuses when today's caps are used up. */
export function withinLimits(req, res, next) {
    rollDay()
    if (state.costUsd >= DAILY_BUDGET_USD) {
        return res.status(429).json({ error: 'Tachycardia is resting for today. Try again tomorrow.', code: 'BUDGET' })
    }
    if ((state.perUser[req.uid] || 0) >= USER_DAILY_LIMIT) {
        return res.status(429).json({ error: `You've reached today's ${USER_DAILY_LIMIT} messages. See you tomorrow!`, code: 'USER_LIMIT' })
    }
    next()
}

/** Record one finished call. `costUsd` comes from OpenRouter's usage report. */
export function recordUsage(uid, costUsd = 0) {
    rollDay()
    state.calls += 1
    state.costUsd += Number(costUsd) || 0
    state.perUser[uid] = (state.perUser[uid] || 0) + 1
    save()
}

export function usageSummary() {
    rollDay()
    return {
        day: state.day,
        calls: state.calls,
        costUsd: Number(state.costUsd.toFixed(5)),
        budgetUsd: DAILY_BUDGET_USD,
        users: Object.keys(state.perUser).length,
    }
}
