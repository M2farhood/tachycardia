import { useState, useRef } from 'react'
import { Plus, Check, Play, Trash2, GripVertical, ChevronRight, ChevronDown, Percent, Clock, CalendarDays, X } from 'lucide-react'
import DayPicker from './DayPicker'
import { parseLocalDateKey } from '../utils/dateKeys'
import { generateId } from '../utils/templates'

const DIFFICULTY_CYCLE = [null, 'easy', 'medium', 'hard']
const DIFFICULTY_COLOR = { easy: '#34d399', medium: '#f59e0b', hard: '#f87171' }
const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

// Returns days until next spaced-rep review, or null if not due
const getReviewDue = (topic) => {
    if (!topic.completed || !topic.completedAt) return null
    const intervals = [1, 3, 7, 14, 30]
    const daysSince = (Date.now() - new Date(topic.completedAt).getTime()) / 86_400_000
    const stage = topic.reviewStage || 0
    const nextInterval = intervals[Math.min(stage, intervals.length - 1)]
    const daysLeft = nextInterval - daysSince
    return daysLeft <= 0 ? 0 : Math.ceil(daysLeft)
}

const TopicList = ({
    tab,
    timerSession,
    defaultDuration,
    onTopicUpdate,
    onTopicAdd,
    onTopicDelete,
    onTimerStart,
    onReorderTopics,
    onSubtaskAdd,
    onSubtaskUpdate,
    onSubtaskDelete,
    onSectionComplete,
    spacedRepetitionEnabled = false,
    hideCompleted = false,
}) => {
    const [showDone, setShowDone] = useState(false)
    // The day chosen in the day circles for the NEXT task (null = no day).
    const [newDueDate, setNewDueDate] = useState(null)
    // The existing task whose own day circles are open (null = none).
    const [datePickerId, setDatePickerId] = useState(null)
    const [newTopicName, setNewTopicName] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [expandedId, setExpandedId] = useState(null)
    const [expandedSubtasks, setExpandedSubtasks] = useState({})
    const [editValue, setEditValue] = useState('')
    const [draggedIndex, setDraggedIndex] = useState(null)
    const [dragOverIndex, setDragOverIndex] = useState(null)
    const [newSubtaskName, setNewSubtaskName] = useState({})
    const [editingWeightId, setEditingWeightId] = useState(null)
    const [weightValue, setWeightValue] = useState('')
    const dragNode = useRef(null)
    const inputRef = useRef(null)

    const handleAddTopic = () => {
        if (newTopicName.trim()) {
            onTopicAdd(tab.id, {
                id: generateId(),
                name: newTopicName.trim(),
                category: '',
                completed: false,
                timeEstimate: defaultDuration,
                subtasks: [],
                // Added 2026-09-30 (DATA-CONTRACT.md): optional day; also shows in the calendar.
                ...(newDueDate ? { dueDate: newDueDate } : {})
            })
            setNewTopicName('')
            setNewDueDate(null)
            // Re-focus input for rapid entry
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }

    const handleToggleComplete = (topic) => {
        const completing = !topic.completed
        onTopicUpdate(tab.id, topic.id, {
            completed: completing,
            completedAt: completing ? new Date().toISOString() : null,
            reviewStage: completing ? (topic.reviewStage || 0) : 0,
        })
        // Detect section reaching 100%
        if (completing && onSectionComplete) {
            const others = tab.topics.filter(t => t.id !== topic.id)
            if (others.length > 0 && others.every(t => t.completed)) {
                setTimeout(onSectionComplete, 200)
            }
        }
    }

    const cycleDifficulty = (topic, e) => {
        e.stopPropagation()
        const idx = DIFFICULTY_CYCLE.indexOf(topic.difficulty || null)
        const next = DIFFICULTY_CYCLE[(idx + 1) % DIFFICULTY_CYCLE.length]
        onTopicUpdate(tab.id, topic.id, { difficulty: next })
    }

    const startEdit = (topic) => {
        setEditingId(topic.id)
        setEditValue(topic.name)
        setExpandedId(null)
    }

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id)
    }

    const toggleSubtasksExpand = (topicId, e) => {
        e.stopPropagation()
        setExpandedSubtasks(prev => ({
            ...prev,
            [topicId]: !prev[topicId]
        }))
    }

    const saveEdit = () => {
        if (editValue.trim() && editingId) {
            onTopicUpdate(tab.id, editingId, { name: editValue.trim() })
        }
        setEditingId(null)
    }

    const handleAddSubtask = (topicId) => {
        const name = newSubtaskName[topicId]?.trim()
        if (name) {
            onSubtaskAdd(tab.id, topicId, {
                id: generateId(),
                name,
                completed: false
            })
            setNewSubtaskName(prev => ({ ...prev, [topicId]: '' }))
        }
    }

    const handleToggleSubtask = (topicId, subtaskId, completed) => {
        onSubtaskUpdate(tab.id, topicId, subtaskId, { completed: !completed })
    }

    const handleDeleteSubtask = (topicId, subtaskId) => {
        onSubtaskDelete(tab.id, topicId, subtaskId)
    }

    // Weight editing handlers
    const startWeightEdit = (topic) => {
        setEditingWeightId(topic.id)
        setWeightValue(topic.weight?.toString() || '')
    }

    const saveWeight = (topicId) => {
        const weight = parseFloat(weightValue) || 0
        onTopicUpdate(tab.id, topicId, { weight: weight > 0 ? weight : null })
        setEditingWeightId(null)
        setWeightValue('')
    }

    // Drag and drop handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index)
        dragNode.current = e.target
        e.target.classList.add('dragging')
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging')

        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            // Reorder the topics
            const newTopics = [...tab.topics]
            const [draggedItem] = newTopics.splice(draggedIndex, 1)
            newTopics.splice(dragOverIndex, 0, draggedItem)

            // Update all topics with new order
            if (onReorderTopics) {
                onReorderTopics(tab.id, newTopics)
            }
        }

        setDraggedIndex(null)
        setDragOverIndex(null)
        dragNode.current = null
    }

    const handleDragOver = (e, index) => {
        e.preventDefault()
        if (draggedIndex === null) return

        if (index !== dragOverIndex) {
            setDragOverIndex(index)
        }
    }

    const handleDragLeave = () => {
        // Don't clear immediately to prevent flicker
    }

    const isActiveTimer = (topicId) => {
        return timerSession?.topicId === topicId && timerSession?.tabId === tab.id
    }

    const getSubtaskProgress = (topic) => {
        const subtasks = topic.subtasks || []
        if (subtasks.length === 0) return null
        const completed = subtasks.filter(s => s.completed).length
        return { completed, total: subtasks.length }
    }

    const doneCount = tab.topics.filter(t => t.completed).length
    const todoCount = tab.topics.length - doneCount
    const hiding = hideCompleted && !showDone

    // One row. `index` is the position in tab.topics, so drag-reorder keeps
    // working even though the rows are split into To do / Done columns.
    const renderTopic = (topic, index) => {
        const isActive = isActiveTimer(topic.id)
        const isDragging = draggedIndex === index
        const isDragOver = dragOverIndex === index && draggedIndex !== index
        const isExpanded = expandedId === topic.id
        const isSubtasksExpanded = expandedSubtasks[topic.id]
        const subtaskProgress = getSubtaskProgress(topic)

        return (
            <div key={topic.id} className="flex flex-col border-b border-[var(--border-subtle)]">
                <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    className={`topic-item flex items-center gap-3 sm:gap-4 group transition-all ${topic.completed ? 'completed' : ''
                        } ${isDragging ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'border-t-2 border-accent -mt-[2px] pt-[14px]' : ''
                        }`}
                >
                    {/* Expand/Collapse Chevron */}
                    <button
                        onClick={(e) => toggleSubtasksExpand(topic.id, e)}
                        className="p-1 rounded transition-all hover:bg-[var(--surface-2)] text-[var(--text-tertiary)] flex-shrink-0"
                    >
                        {isSubtasksExpanded ? (
                            <ChevronDown size={16} />
                        ) : (
                            <ChevronRight size={16} />
                        )}
                    </button>

                    {/* Drag Handle - hidden on mobile */}
                    <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 transition-opacity touch-none hidden sm:block">
                        <GripVertical size={16} className="text-[var(--text-tertiary)]" />
                    </div>

                    {/* Checkbox */}
                    <button
                        onClick={() => handleToggleComplete(topic)}
                        className={`custom-checkbox flex-shrink-0 ${topic.completed ? 'checked' : ''}`}
                    >
                        {topic.completed && <Check size={16} className="text-on-accent" />}
                    </button>

                    {/* Topic Content */}
                    <div className="flex-1 min-w-0">
                        {editingId === topic.id ? (
                            <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit()
                                    if (e.key === 'Escape') setEditingId(null)
                                }}
                                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] text-[15px] sm:text-lg focus:outline-none focus:border-accent"
                                autoFocus
                            />
                        ) : (
                            <p
                                onClick={() => toggleExpand(topic.id)}
                                onDoubleClick={() => startEdit(topic)}
                                title="Tap to expand, double-tap to edit"
                                className={`topic-name text-[var(--text-primary)] font-medium text-[15px] sm:text-lg cursor-pointer transition-all ${isExpanded ? 'whitespace-normal break-words text-lg sm:text-xl py-2' : 'truncate'
                                    } ${topic.completed ? 'line-through text-[var(--text-tertiary)]' : ''}`}
                            >
                                {topic.name}
                            </p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {subtaskProgress && (
                                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${subtaskProgress.completed === subtaskProgress.total
                                    ? 'text-[var(--color-success)] bg-[var(--color-success)]/15 border-[var(--color-success)]/20'
                                    : 'text-accent bg-accent/20 border-accent/20'
                                    }`}>
                                    {subtaskProgress.completed}/{subtaskProgress.total}
                                </span>
                            )}
                            {/* Weight Badge/Button */}
                            {editingWeightId === topic.id ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="number"
                                        value={weightValue}
                                        onChange={(e) => setWeightValue(e.target.value)}
                                        onBlur={() => saveWeight(topic.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveWeight(topic.id)
                                            if (e.key === 'Escape') {
                                                setEditingWeightId(null)
                                                setWeightValue('')
                                            }
                                        }}
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                        className="w-14 px-1.5 py-0.5 text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                                        autoFocus
                                    />
                                    <span className="text-xs text-accent">%</span>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        startWeightEdit(topic)
                                    }}
                                    className={`text-[11px] font-medium px-1.5 py-0.5 rounded border transition-all flex items-center gap-1 ${topic.weight > 0
                                        ? 'text-accent bg-accent/15 border-accent/30 hover:bg-accent/25'
                                        : 'text-[var(--text-tertiary)] bg-[var(--surface-1)] border-[var(--border-subtle)] hover:bg-[var(--surface-2)] hover:text-[var(--text-secondary)]'
                                        }`}
                                    title="Set weight percentage"
                                >
                                    {topic.weight > 0 ? (
                                        <>{topic.weight}%</>
                                    ) : (
                                        <>
                                            <Percent size={10} />
                                        </>
                                    )}
                                </button>
                            )}
                            {/* Difficulty dot — tap to cycle, always present as dim dot */}
                            <button
                                onClick={(e) => cycleDifficulty(topic, e)}
                                title={topic.difficulty ? DIFFICULTY_LABEL[topic.difficulty] : 'Set difficulty'}
                                className="w-[14px] h-[14px] rounded-full flex-shrink-0 transition-all hover:scale-125 focus:outline-none"
                                style={{
                                    backgroundColor: topic.difficulty
                                        ? DIFFICULTY_COLOR[topic.difficulty]
                                        : 'var(--border)',
                                    opacity: topic.difficulty ? 1 : 0.4,
                                }}
                            />
                            {/* Spaced rep review badge */}
                            {spacedRepetitionEnabled && topic.completed && (() => {
                                const due = getReviewDue(topic)
                                if (due === null) return null
                                return (
                                    <>
                                    <span className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                                        due === 0
                                            ? 'text-[var(--color-danger)] bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20'
                                            : 'text-[var(--text-tertiary)] bg-[var(--surface-2)] border-[var(--border-subtle)]'
                                    }`}>
                                        <Clock size={9} />
                                        {due === 0 ? 'Review' : `${due}d`}
                                    </span>
                                    {due === 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onTopicUpdate(tab.id, topic.id, {
                                                    reviewStage: (topic.reviewStage || 0) + 1,
                                                    completedAt: new Date().toISOString(),
                                                })
                                            }}
                                            className="flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                                            title="Mark this review as done"
                                        >
                                            <Check size={10} />
                                            Reviewed
                                        </button>
                                    )}
                                    </>
                                )
                            })()}
                            {/* The task's day — tap to open its own day circles */}
                            {(() => {
                                const open = datePickerId === topic.id
                                const toggle = (e) => { e.stopPropagation(); setDatePickerId(open ? null : topic.id) }
                                if (!topic.dueDate) {
                                    return (
                                        <button
                                            onClick={toggle}
                                            aria-expanded={open}
                                            aria-label={`Give ${topic.name} a day`}
                                            title="Give it a day"
                                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border transition-colors ${open
                                                ? 'text-accent border-accent/40 bg-accent/10'
                                                : 'text-[var(--text-tertiary)] border-[var(--border-subtle)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}`}
                                        >
                                            <CalendarDays size={11} />
                                            <span className={open ? '' : 'hidden sm:inline'}>Day</span>
                                        </button>
                                    )
                                }
                                const label = parseLocalDateKey(topic.dueDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
                                return (
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium pl-1.5 pr-1 py-0.5 rounded border ${open ? 'border-accent/40 bg-accent/10 text-accent' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                                        <button onClick={toggle} aria-expanded={open} aria-label={`Change the day of ${topic.name}`} title="Change the day" className="inline-flex items-center gap-1 hover:text-[var(--text-primary)]">
                                            <CalendarDays size={11} />
                                            {label}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onTopicUpdate(tab.id, topic.id, { dueDate: null }); setDatePickerId(null) }}
                                            aria-label={`Remove the day from ${topic.name}`}
                                            title="Remove the day"
                                            className="ml-0.5 text-[var(--text-tertiary)] hover:text-[var(--color-danger)]"
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                )
                            })()}
                                    {topic.category && (
                                <span className="text-[13px] text-[var(--text-tertiary)] hidden sm:inline">{topic.category}</span>
                            )}
                        </div>
                    </div>

                    {/* Actions - always visible on mobile */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {!topic.completed && (
                            <button
                                onClick={() => onTimerStart(tab.id, topic.id)}
                                className={`p-2 rounded-full transition-all mobile-visible ${isActive
                                    ? 'bg-accent ring-2 ring-accent ring-opacity-50'
                                    : 'hover:bg-[var(--surface-2)] sm:opacity-0 sm:group-hover:opacity-100 opacity-60'
                                    }`}
                            >
                                <Play size={14} className="text-[var(--text-primary)]" />
                            </button>
                        )}
                        <button
                            onClick={() => onTopicDelete(tab.id, topic.id)}
                            className="p-2 rounded-full hover:bg-[var(--color-danger)]/20 sm:opacity-0 sm:group-hover:opacity-100 opacity-40 transition-all mobile-visible"
                        >
                            <Trash2 size={14} className="text-[var(--color-danger)]/80" />
                        </button>
                    </div>
                </div>

                {/* This task's own day circles */}
                {datePickerId === topic.id && (
                    <div className="ml-10 sm:ml-14 pb-2">
                        <DayPicker
                            size="sm"
                            label={`Day for ${topic.name}`}
                            value={topic.dueDate || null}
                            onChange={(key) => { onTopicUpdate(tab.id, topic.id, { dueDate: key }); setDatePickerId(null) }}
                        />
                    </div>
                )}

                {/* Subtasks Section */}
                {isSubtasksExpanded && (
                    <div className="ml-10 sm:ml-14 pl-4 border-l border-[var(--border-subtle)] mb-2">
                        {/* Subtask List */}
                        {(topic.subtasks || []).map(subtask => (
                            <div
                                key={subtask.id}
                                className="flex items-center gap-3 py-2 group/subtask"
                            >
                                <button
                                    onClick={() => handleToggleSubtask(topic.id, subtask.id, subtask.completed)}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${subtask.completed
                                        ? 'bg-[var(--color-success)] border-[var(--color-success)]'
                                        : 'border-[var(--border)] hover:border-[var(--border-subtle)]'
                                        }`}
                                >
                                    {subtask.completed && <Check size={12} className="text-white" />}
                                </button>
                                <span className={`flex-1 text-[13px] ${subtask.completed
                                    ? 'text-[var(--text-tertiary)] line-through'
                                    : 'text-[var(--text-secondary)]'
                                    }`}>
                                    {subtask.name}
                                </span>
                                <button
                                    onClick={() => handleDeleteSubtask(topic.id, subtask.id)}
                                    className="p-1 rounded hover:bg-[var(--color-danger)]/20 sm:opacity-0 sm:group-hover/subtask:opacity-100 opacity-40 transition-all mobile-visible"
                                >
                                    <Trash2 size={12} className="text-[var(--color-danger)]/60" />
                                </button>
                            </div>
                        ))}

                        {/* Add Subtask Input */}
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="text"
                                value={newSubtaskName[topic.id] || ''}
                                onChange={(e) => setNewSubtaskName(prev => ({ ...prev, [topic.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(topic.id)}
                                placeholder="Add subtask..."
                                className="flex-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-accent/50"
                            />
                            <button
                                onClick={() => handleAddSubtask(topic.id)}
                                disabled={!newSubtaskName[topic.id]?.trim()}
                                className="p-1.5 bg-accent/20 hover:bg-accent/30 disabled:opacity-30 text-accent rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const rows = (wantDone) => tab.topics
        .map((topic, index) => ({ topic, index }))
        .filter(({ topic }) => (wantDone ? topic.completed : !topic.completed))
        .map(({ topic, index }) => renderTopic(topic, index))

    return (
        <div className="px-6 pb-10">
            {/* The task line — right under the band, full width, never floating */}
            <div className="flex items-center gap-3 border-b border-[var(--border)] focus-within:border-[var(--color-accent)] transition-colors">
                <Plus size={20} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                    placeholder="Type a task and press Enter"
                    autoFocus={tab.topics.length === 0}
                    aria-label="New task"
                    className="task-line-input flex-1 min-w-0 bg-transparent py-4 text-[17px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none"
                />
                <button
                    onClick={handleAddTopic}
                    disabled={!newTopicName.trim()}
                    className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--on-accent)] text-[14px] font-medium disabled:opacity-0 transition-opacity"
                >
                    Add
                </button>
            </div>
            {/* Day circles for the new task: only while typing (leave them = no day) */}
            {(newTopicName.trim() || newDueDate) && (
                <div className="flex items-center gap-3 animate-fade-in">
                    <span className="hidden sm:inline text-[12px] text-[var(--text-tertiary)] whitespace-nowrap">Day (optional)</span>
                    <DayPicker value={newDueDate} onChange={(key) => { setNewDueDate(key); inputRef.current?.focus() }} />
                </div>
            )}

            <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
                <section aria-label="To do">
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
                        To do <span className="font-normal text-[var(--text-tertiary)] tabular-nums">{todoCount}</span>
                    </h3>
                    <div className="border-t border-[var(--border-subtle)]">
                        {todoCount > 0 ? rows(false) : (
                            <p className="py-6 text-[14px] text-[var(--text-tertiary)]">
                                {tab.topics.length === 0 ? 'Nothing here yet — type your first task above.' : 'All clear. Nice work.'}
                            </p>
                        )}
                    </div>
                </section>

                <section aria-label="Done" className="mt-8 lg:mt-0">
                    <div className="flex items-baseline justify-between mb-1">
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                            Done <span className="font-normal text-[var(--text-tertiary)] tabular-nums">{doneCount}</span>
                        </h3>
                        {hideCompleted && doneCount > 0 && (
                            <button
                                onClick={() => setShowDone(v => !v)}
                                className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                            >
                                {showDone ? 'Hide' : 'Show'}
                            </button>
                        )}
                    </div>
                    <div className="border-t border-[var(--border-subtle)]">
                        {doneCount === 0 ? (
                            <p className="py-6 text-[14px] text-[var(--text-tertiary)]">Finished tasks land here.</p>
                        ) : hiding ? (
                            <p className="py-6 text-[14px] text-[var(--text-tertiary)]">{doneCount} finished {doneCount === 1 ? 'task' : 'tasks'} hidden.</p>
                        ) : rows(true)}
                    </div>
                </section>
            </div>
        </div>
    )
}

export default TopicList
