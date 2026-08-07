import { useState } from 'react'
import { X, FileText, Check, AlertCircle, Download, Loader2, Sparkles } from 'lucide-react'
import { parsePlan, tasksToTopics } from '@study/core'
import { parsePlanWithAI, isAIAvailable } from '../services/aiService'

const PlanImporterModal = ({ isOpen, onClose, tabs, onImportTasks }) => {
    const [planText, setPlanText] = useState('')
    const [parsedTasks, setParsedTasks] = useState([])
    const [selectedTabId, setSelectedTabId] = useState(tabs?.[0]?.id || '')
    const [isParsed, setIsParsed] = useState(false)
    const [isParsing, setIsParsing] = useState(false)
    const [error, setError] = useState('')
    const [parsingMethod, setParsingMethod] = useState('') // 'ai' or 'regex'

    if (!isOpen) return null

    const handleParse = async () => {
        setError('')
        setIsParsing(true)
        setParsingMethod('')

        let tasks = []

        // Try AI parsing first (more flexible and accurate)
        if (isAIAvailable()) {
            try {
                tasks = await parsePlanWithAI(planText)
                setParsingMethod('ai')
            } catch (aiError) {
                console.warn('AI parsing failed, falling back to regex:', aiError.message)
            }
        }

        // Fallback to regex parsing if AI failed or unavailable
        if (tasks.length === 0) {
            tasks = parsePlan(planText)
            if (tasks.length > 0) {
                setParsingMethod('regex')
            }
        }

        setIsParsing(false)

        if (tasks.length === 0) {
            setError('No tasks found. Try a different format or check the example below.')
            return
        }

        setParsedTasks(tasks)
        setIsParsed(true)
    }

    const handleToggleTask = (taskId) => {
        setParsedTasks(prev =>
            prev.map(t => t.id === taskId ? { ...t, selected: !t.selected } : t)
        )
    }

    const handleSelectAll = () => {
        const allSelected = parsedTasks.every(t => t.selected)
        setParsedTasks(prev => prev.map(t => ({ ...t, selected: !allSelected })))
    }

    const handleImport = () => {
        const topics = tasksToTopics(parsedTasks)
        if (topics.length === 0) {
            setError('Please select at least one task to import.')
            return
        }

        onImportTasks(selectedTabId, topics)
        handleClose()
    }

    const handleClose = () => {
        setPlanText('')
        setParsedTasks([])
        setIsParsed(false)
        setError('')
        onClose()
    }

    const handleBack = () => {
        setIsParsed(false)
        setParsedTasks([])
        setError('')
        setParsingMethod('')
    }

    const selectedCount = parsedTasks.filter(t => t.selected).length

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl surface flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[var(--surface-2)]">
                            <FileText size={20} className="text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Import Study Plan</h2>
                            <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                                {isParsing ? (
                                    <><Loader2 size={12} className="animate-spin" /> Analyzing with AI...</>
                                ) : isParsed ? (
                                    <>
                                        {parsedTasks.length} tasks found
                                        {parsingMethod === 'ai' && (
                                            <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px]">
                                                <Sparkles size={10} /> AI
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    'Paste your AI-generated plan'
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-[var(--surface-2)] transition-colors"
                    >
                        <X size={20} className="text-[var(--text-secondary)]" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {!isParsed ? (
                        /* Input View */
                        <div className="space-y-4">
                            <textarea
                                value={planText}
                                onChange={(e) => setPlanText(e.target.value)}
                                placeholder={`Paste your study plan here...

Example formats:
📅 Jan 15: Biology Chapter 1 - 2h
📅 Jan 16: Genetics Review - 1.5h

Day 1 (Jan 15): Study Physics - 2 hours
Day 2 (Jan 16): Practice Problems - 1.5 hours

- Complete Chapter 5 (2h)
- Review Notes (1h)`}
                                className="w-full h-56 p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-glow)] text-[13px]"
                            />

                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20">
                                    <AlertCircle size={16} className="text-[var(--color-danger)]" />
                                    <span className="text-sm text-[var(--color-danger)]">{error}</span>
                                </div>
                            )}

                            <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] text-[var(--text-secondary)]">💡 <b>Generate Plan with AI</b></p>
                                    <button
                                        onClick={() => {
                                            const prompt = `Create a detailed study plan for [SUBJECT].
IMPORTANT: If I have provided a blueprint/syllabus below, strictly follow its weighting structure.
Blueprint: [PASTE BLUEPRINT HERE IF AVAILABLE]

Format specific requirements:
- Use emojis for dates (📅)
- Include topic name
- Include estimated duration
- (Optional) Include Weight/Value % if known: (Weight: 20%)

Example format:
📅 Jan 15: Ortho Lecture 1 - 2h (Weight: 5%)
- Review Anatomy (1h) [Weight: 2%]

Please generate the plan now.`
                                            navigator.clipboard.writeText(prompt)
                                            // Brief visual feedback could go here
                                        }}
                                        className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-accent transition-colors"
                                    >
                                        Copy Prompt
                                    </button>
                                </div>
                                <p className="text-[11px] text-[var(--text-tertiary)]">
                                    Copy this prompt to ChatGPT/Claude to get the perfect format.
                                    <b> Paste your exam blueprint/syllabus</b> into the prompt so the AI assigns the correct weights!
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Preview View */
                        <div className="space-y-4">
                            {/* Tab Selector */}
                            <div>
                                <label className="block text-[11px] text-[var(--text-tertiary)] mb-2">Add to section:</label>
                                <select
                                    value={selectedTabId}
                                    onChange={(e) => setSelectedTabId(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-glow)]"
                                >
                                    {tabs?.map(tab => (
                                        <option key={tab.id} value={tab.id}>
                                            {tab.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Select All */}
                            <button
                                onClick={handleSelectAll}
                                className="text-sm text-accent hover:opacity-80 transition-opacity"
                            >
                                {parsedTasks.every(t => t.selected) ? 'Deselect All' : 'Select All'}
                            </button>

                            {/* Task List */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {parsedTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleToggleTask(task.id)}
                                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${task.selected
                                            ? 'bg-accent/10 border border-accent/40'
                                            : 'bg-[var(--surface-1)] border border-[var(--border-subtle)] opacity-50'
                                            }`}
                                    >
                                        <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center ${task.selected
                                            ? 'bg-accent text-white'
                                            : 'bg-[var(--surface-2)]'
                                            }`}>
                                            {task.selected && <Check size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] text-[var(--text-primary)] truncate">{task.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {task.dateFormatted && (
                                                    <span className="text-[11px] text-accent">{task.dateFormatted}</span>
                                                )}
                                                {task.durationFormatted && (
                                                    <span className="text-[11px] text-[var(--text-tertiary)]">{task.durationFormatted}</span>
                                                )}
                                                {task.weight && (
                                                    <span className="text-[11px] text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                                                        Weight: {task.weight}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20">
                                    <AlertCircle size={16} className="text-[var(--color-danger)]" />
                                    <span className="text-sm text-[var(--color-danger)]">{error}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[var(--border-subtle)] flex gap-3">
                    {!isParsed ? (
                        <>
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 px-4 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-3)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleParse}
                                disabled={!planText.trim() || isParsing}
                                className="flex-1 py-3 px-4 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isParsing ? (
                                    <><Loader2 size={18} className="animate-spin" /> Parsing...</>
                                ) : (
                                    <><Sparkles size={18} /> Parse with AI</>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleBack}
                                className="flex-1 py-3 px-4 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-3)] transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={selectedCount === 0}
                                className="flex-1 py-3 px-4 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                Import {selectedCount} Task{selectedCount !== 1 ? 's' : ''}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PlanImporterModal
