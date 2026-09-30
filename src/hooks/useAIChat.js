import { useState, useCallback, useEffect, useRef } from 'react'
import { sendChat } from '../services/aiService'
import { normalizeCall, DISPLAY_TOOLS } from '../utils/aiActions'

const CHAT_STORAGE_KEY = 'tachycardia_chat_history'
const MAX_STORED = 60
const MAX_SENT = 24

/**
 * Stored message shapes (OpenAI style, plus UI bookkeeping):
 *   user       { id, role:'user', content }
 *   assistant  { id, role:'assistant', content, tool_calls?, status? }
 * `status` maps tool-call id -> { state: 'pending'|'applied'|'skipped'|'failed', error? }.
 * Tool-result messages are not stored: they are rebuilt from `status` when a
 * request is made. Messages saved by older versions only have role/content.
 */
const load = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]')
        if (!Array.isArray(stored)) return []
        const kept = stored.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && !m.isError && typeof m.content === 'string')
        const last = kept.length - 1
        return kept.map((m, i) => ({
            ...m,
            id: m.id || `msg-${i}-${m.role}`,
            // Proposals on the latest reply stay open across a reload (the owner
            // hasn't answered yet); anything older that was never answered counts
            // as skipped.
            status: m.tool_calls
                ? Object.fromEntries(
                      m.tool_calls.map((c) => {
                          const s = m.status?.[c.id]
                          if (s && s.state !== 'pending') return [c.id, s]
                          return [c.id, { state: i === last ? 'pending' : 'skipped' }]
                      })
                  )
                : undefined,
        }))
    } catch (e) {
        console.error('Error loading chat history:', e)
        return []
    }
}

const toolResultText = (call, entry) => {
    const name = call.function?.name
    if (DISPLAY_TOOLS.includes(name)) return 'shown to the user'
    switch (entry?.state) {
        case 'applied': return 'applied'
        case 'failed': return `failed: ${entry.error || 'could not be applied'}`
        default: return 'skipped by the user'
    }
}

/** Turn stored messages into the request list, answering every tool call. */
const buildRequest = (messages) => {
    const out = []
    for (const m of messages) {
        if (m.role === 'user') {
            out.push({ role: 'user', content: m.content })
        } else if (m.tool_calls?.length) {
            out.push({ role: 'assistant', content: m.content || '', tool_calls: m.tool_calls })
            m.tool_calls.forEach((c) => {
                out.push({ role: 'tool', tool_call_id: c.id, content: toolResultText(c, m.status?.[c.id]) })
            })
        } else {
            out.push({ role: 'assistant', content: m.content })
        }
    }
    return out
}

const toStoredCall = (raw) => {
    const c = normalizeCall(raw)
    return { id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args) } }
}

const errorInfo = (err) => {
    switch (err?.code) {
        case 'AUTH_REQUIRED': return { code: 'AUTH_REQUIRED', message: 'Sign in to talk to Tachycardia.' }
        case 'USER_LIMIT':
        case 'BUDGET': return { code: 'LIMIT', message: "Tachycardia has reached today's limit. Try again tomorrow." }
        case 'NETWORK': return { code: 'NETWORK', message: "Can't reach Tachycardia. Check your connection and try again." }
        default: return { code: 'OTHER', message: 'Something went wrong on my side. Please try again.' }
    }
}

/**
 * The Tachycardia conversation. The AI only proposes: each proposal is a card
 * the owner applies or skips. `onApplyAction(call)` applies it to the live
 * document and returns `{ ok: true }` or `{ ok: false, error }`.
 */
export const useAIChat = ({ data, signedIn = true, onApplyAction }) => {
    const [messages, setMessages] = useState(load)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const messagesRef = useRef(messages)

    useEffect(() => {
        messagesRef.current = messages
        try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)))
        } catch (e) {
            console.error('Error saving chat history:', e)
        }
    }, [messages])

    const request = useCallback(async (history) => {
        setIsLoading(true)
        setError(null)
        try {
            let req = buildRequest(history).slice(-MAX_SENT)
            while (req.length && req[0].role !== 'user') req = req.slice(1) // never start mid-exchange
            const res = await sendChat(req, data)
            const calls = (Array.isArray(res.toolCalls) ? res.toolCalls : []).map(toStoredCall)
            const assistant = {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: res.reply || '',
                timestamp: Date.now(),
                ...(calls.length
                    ? { tool_calls: calls, status: Object.fromEntries(calls.map((c) => [c.id, { state: 'pending' }])) }
                    : {}),
            }
            setMessages((prev) => [...prev, assistant])
        } catch (err) {
            console.error('AI error:', err)
            setError(errorInfo(err))
        } finally {
            setIsLoading(false)
        }
    }, [data])

    const sendMessage = useCallback(async (text) => {
        const t = String(text || '').trim()
        if (!t || isLoading) return
        if (!signedIn) {
            setError(errorInfo({ code: 'AUTH_REQUIRED' }))
            return
        }
        // Anything still pending is now skipped.
        const settled = messagesRef.current.map((m) =>
            m.tool_calls
                ? { ...m, status: Object.fromEntries(m.tool_calls.map((c) => [c.id, m.status?.[c.id]?.state === 'pending' ? { state: 'skipped' } : m.status?.[c.id] || { state: 'skipped' }])) }
                : m
        )
        const next = [...settled, { id: `msg-${Date.now()}-user`, role: 'user', content: t, timestamp: Date.now() }]
        messagesRef.current = next
        setMessages(next)
        await request(next)
    }, [isLoading, signedIn, request])

    const retry = useCallback(() => {
        if (isLoading || !signedIn) return
        const last = messagesRef.current[messagesRef.current.length - 1]
        if (last?.role === 'user') request(messagesRef.current)
    }, [isLoading, signedIn, request])

    const setStatus = (messageId, callId, entry) =>
        setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, status: { ...m.status, [callId]: entry } } : m))
        )

    const applyProposal = useCallback(async (messageId, callId) => {
        const msg = messagesRef.current.find((m) => m.id === messageId)
        const call = msg?.tool_calls?.find((c) => c.id === callId)
        if (!call || msg.status?.[callId]?.state === 'applied') return
        let result
        try {
            result = await onApplyAction?.(call)
        } catch (e) {
            result = { ok: false, error: e?.message }
        }
        if (result?.ok) setStatus(messageId, callId, { state: 'applied' })
        else setStatus(messageId, callId, { state: 'failed', error: result?.error || 'That could not be applied.' })
    }, [onApplyAction])

    const skipProposal = useCallback((messageId, callId) => {
        setStatus(messageId, callId, { state: 'skipped' })
    }, [])

    const clearChat = useCallback(() => {
        messagesRef.current = []
        setMessages([])
        setError(null)
        try { localStorage.removeItem(CHAT_STORAGE_KEY) } catch { /* ignore */ }
    }, [])

    return { messages, isLoading, error, sendMessage, retry, applyProposal, skipProposal, clearChat }
}
