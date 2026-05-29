import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Sparkles, Zap, Heart, Clock, ArrowLeft } from 'lucide-react'
import { useAIChat } from '../hooks/useAIChat'

const TachycardiaTab = ({ studyData, onBack, addTopic }) => {
    const { messages, isLoading, sendMessage, sendQuickAction, clearChat } = useAIChat(studyData, addTopic)
    const [input, setInput] = useState('')
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (input.trim() && !isLoading) {
            sendMessage(input)
            setInput('')
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    // Quick action buttons
    const quickActions = [
        { id: 'plan', label: 'Plan my week', icon: Sparkles },
        { id: 'next', label: "What's next?", icon: Zap },
        { id: 'motivate', label: 'Motivate me', icon: Heart },
        { id: 'progress', label: 'My progress', icon: Clock },
    ]

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] mx-4 mb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
                >
                    <ArrowLeft size={18} className="text-[var(--text-secondary)]" />
                    <span className="text-[13px] text-[var(--text-secondary)]">Back</span>
                </button>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]">
                        <Heart size={20} className="text-accent" fill="currentColor" />
                        <span className="font-semibold text-[var(--text-primary)]">Tachycardia</span>
                    </div>

                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="p-2 rounded-xl bg-[var(--surface-1)] hover:bg-red-500/20 text-[var(--text-tertiary)] hover:text-red-400 transition-all"
                            title="Clear chat"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto rounded-2xl surface p-4 space-y-4">
                {/* Welcome Message */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center">
                                <Heart size={40} className="text-white" fill="currentColor" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">
                            Hey there! I'm Tachycardia 💓
                        </h2>
                        <p className="text-[var(--text-secondary)] max-w-sm mb-8">
                            Your AI study companion. I know your tabs, topics, and progress.
                            Ask me anything about your studies!
                        </p>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {quickActions.map(action => (
                                <button
                                    key={action.id}
                                    onClick={() => sendQuickAction(action.id)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--color-accent)] text-[var(--text-primary)] transition-all disabled:opacity-50"
                                >
                                    <action.icon size={16} className="text-accent" />
                                    <span className="text-sm">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                ? 'bg-accent text-white'
                                : 'bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)]'
                                }`}
                        >
                            {message.role === 'assistant' && (
                                <div className="flex items-center gap-2 mb-1">
                                    <Heart size={14} className="text-accent" fill="currentColor" />
                                    <span className="text-xs text-accent font-medium">Tachycardia</span>
                                </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Heart size={14} className="text-accent" fill="currentColor" />
                                <span className="text-xs text-accent font-medium">Tachycardia</span>
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions (when chat has messages) */}
            {messages.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
                    {quickActions.map(action => (
                        <button
                            key={action.id}
                            onClick={() => sendQuickAction(action.id)}
                            disabled={isLoading}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--color-accent-glow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] transition-all disabled:opacity-50"
                        >
                            <action.icon size={12} className="text-accent" />
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="mt-3">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Tachycardia anything..."
                            rows={1}
                            disabled={isLoading}
                            className="w-full px-4 py-3 pr-12 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] focus:border-accent/50 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all disabled:opacity-50"
                            style={{ minHeight: '50px', maxHeight: '120px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="px-5 py-3 rounded-2xl bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    )
}

export default TachycardiaTab
