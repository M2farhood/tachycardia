/**
 * Study Tracker API server
 * --------------------------------------------------------------------------
 * Holds AI provider keys server-side and exposes /api/ai/* to the client, so
 * secrets never ship in the browser bundle. On a VPS this single process can
 * also serve the built frontend (set SERVE_STATIC=true), or you can put nginx
 * in front and run this for /api only.
 */

import 'dotenv/config'
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chat, generateSubtasks, parsePlan, isConfigured } from './ai.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8787

app.use(express.json({ limit: '1mb' }))

// Optional CORS — only needed if the API is served from a different origin than
// the frontend (e.g. api.example.com). Same-origin / nginx setups don't need it.
const CORS_ORIGIN = process.env.CORS_ORIGIN
if (CORS_ORIGIN) {
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        if (req.method === 'OPTIONS') return res.sendStatus(204)
        next()
    })
}

// --- Health & status -------------------------------------------------------

app.get('/api/health', (req, res) => {
    res.json({ ok: true })
})

app.get('/api/ai/status', (req, res) => {
    res.json({ isConfigured: isConfigured() })
})

// --- AI endpoints ----------------------------------------------------------

// Wrap an async route so thrown errors hit the error middleware.
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

app.post('/api/ai/chat', asyncRoute(async (req, res) => {
    const { messages, studyData, tools } = req.body || {}
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' })
    }
    const result = await chat({ messages, studyData, tools })
    res.json(result)
}))

app.post('/api/ai/subtasks', asyncRoute(async (req, res) => {
    const { taskName, studyData } = req.body || {}
    if (!taskName || typeof taskName !== 'string') {
        return res.status(400).json({ error: 'taskName is required' })
    }
    const subtasks = await generateSubtasks({ taskName, studyData })
    res.json({ subtasks })
}))

app.post('/api/ai/parse-plan', asyncRoute(async (req, res) => {
    const { planText } = req.body || {}
    if (!planText || typeof planText !== 'string') {
        return res.status(400).json({ error: 'planText is required' })
    }
    const tasks = await parsePlan({ planText })
    res.json({ tasks })
}))

// --- Static frontend (optional, for single-process VPS deploys) ------------

if (process.env.SERVE_STATIC === 'true') {
    const distDir = join(__dirname, '..', 'dist')
    if (existsSync(distDir)) {
        app.use(express.static(distDir))
        // SPA fallback: any non-API route returns index.html.
        app.get(/^(?!\/api).*/, (req, res) => {
            res.sendFile(join(distDir, 'index.html'))
        })
        console.log(`📦 Serving static frontend from ${distDir}`)
    } else {
        console.warn('⚠️  SERVE_STATIC=true but dist/ not found. Run `npm run build` first.')
    }
}

// --- Error handling --------------------------------------------------------

app.use((err, req, res, next) => {
    console.error('[api] error:', err.message)
    if (err.code === 'NO_PROVIDER') {
        return res.status(503).json({ error: 'AI is not configured on the server.' })
    }
    res.status(502).json({ error: err.message || 'Upstream AI request failed' })
})

app.listen(PORT, () => {
    console.log(`💓 Study Tracker API listening on :${PORT}`)
    console.log(`   AI configured: ${isConfigured()}`)
})
