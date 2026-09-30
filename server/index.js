/**
 * Study Tracker API server
 * --------------------------------------------------------------------------
 * Holds AI provider keys server-side and exposes /api/ai/* to the web and phone
 * apps, so secrets never ship in a bundle. Every AI route needs a signed-in
 * user and respects the daily caps (see guard.js). On the VPS this single
 * process also serves the built frontend (SERVE_STATIC=true).
 */

import 'dotenv/config'
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chat, focus, generateSteps, isConfigured } from './ai.js'
import { requireUser, withinLimits, recordUsage, usageSummary } from './guard.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8787

app.disable('x-powered-by')
app.set('trust proxy', 'loopback')
app.use(express.json({ limit: '200kb' }))

// Optional CORS — only needed if the API is served from a different origin than
// the web app. The phone app is native, so it never needs CORS.
const CORS_ORIGIN = process.env.CORS_ORIGIN
if (CORS_ORIGIN) {
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        if (req.method === 'OPTIONS') return res.sendStatus(204)
        next()
    })
}

// --- Health & status -------------------------------------------------------

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.get('/api/ai/status', (req, res) => {
    const u = usageSummary()
    res.json({ isConfigured: isConfigured(), resting: u.costUsd >= u.budgetUsd })
})

// --- AI endpoints ----------------------------------------------------------

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
const ai = [requireUser, withinLimits]

app.post('/api/ai/chat', ai, asyncRoute(async (req, res) => {
    const { messages, context } = req.body || {}
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' })
    }
    const result = await chat({ messages, context })
    recordUsage(req.uid, result.costUsd)
    res.json({ reply: result.reply, toolCalls: result.toolCalls })
}))

app.post('/api/ai/focus', ai, asyncRoute(async (req, res) => {
    const { messages, context } = req.body || {}
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' })
    }
    const result = await focus({ messages, context })
    recordUsage(req.uid, result.costUsd)
    res.json({ reply: result.reply, toolCalls: result.toolCalls })
}))

app.post('/api/ai/steps', ai, asyncRoute(async (req, res) => {
    const { taskName, context } = req.body || {}
    if (!taskName || typeof taskName !== 'string') {
        return res.status(400).json({ error: 'taskName is required' })
    }
    const { steps, costUsd } = await generateSteps({ taskName, context })
    recordUsage(req.uid, costUsd)
    res.json({ steps })
}))

// --- Static frontend (single-process VPS deploys) --------------------------

if (process.env.SERVE_STATIC === 'true') {
    const distDir = join(__dirname, '..', 'dist')
    if (existsSync(distDir)) {
        app.use(express.static(distDir, { index: false, maxAge: '1h' }))
        app.get(/^(?!\/api).*/, (req, res) => {
            res.setHeader('Cache-Control', 'no-cache')
            // `root` keeps the path check relative to dist/, so a hidden folder
            // higher up the path (e.g. a .claude/ worktree) can't 404 the app.
            res.sendFile('index.html', { root: distDir })
        })
        console.log(`📦 Serving static frontend from ${distDir}`)
    } else {
        console.warn('⚠️  SERVE_STATIC=true but dist/ not found. Run `npm run build` first.')
    }
}

// --- Error handling --------------------------------------------------------

// Four arguments are what marks this as Express's error handler.
app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode
    if (status && status < 500) {
        return res.status(status).json({ error: status === 404 ? 'Not found' : 'Bad request' })
    }
    console.error('[api] error:', err.message)
    if (err.code === 'NO_PROVIDER') {
        return res.status(503).json({ error: 'AI is not configured on the server.' })
    }
    res.status(502).json({ error: 'Tachycardia could not answer just now. Try again in a moment.' })
})

app.listen(PORT, '127.0.0.1', () => {
    console.log(`💓 Study Tracker API listening on 127.0.0.1:${PORT}`)
    console.log(`   AI configured: ${isConfigured()}`)
})
