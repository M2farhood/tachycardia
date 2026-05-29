import { useState, useRef } from 'react'
import { Plus, Check, Play, Trash2, GripVertical, ChevronRight, ChevronDown, Percent } from 'lucide-react'
import { generateId } from '../utils/templates'

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
    onSubtaskDelete
}) => {
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
                subtasks: []
            })
            setNewTopicName('')
            // Re-focus input for rapid entry
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }

    const handleToggleComplete = (topic) => {
        onTopicUpdate(tab.id, topic.id, { completed: !topic.completed })
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

    // Empty state
    if (tab.topics.length === 0) {
        return (
            <div className="px-6 py-4">
                <div className="glass-panel rounded-2xl overflow-hidden">
                    {/* Empty state */}
                    <div className="py-12 px-6 text-center">
                        <div className="text-4xl mb-3">📝</div>
                        <p className="text-white/60 font-medium text-base mb-1">No tasks yet</p>
                        <p className="text-white/30 text-sm mb-6">Add your first task to get started</p>
                    </div>

                    {/* Add Topic - Prominent for empty state */}
                    <div className="p-4 border-t border-white/5">
                        <div className="flex gap-3">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newTopicName}
                                onChange={(e) => setNewTopicName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                                placeholder="Type a task and press Enter..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-accent/50 text-base"
                                autoFocus
                            />
                            <button
                                onClick={handleAddTopic}
                                disabled={!newTopicName.trim()}
                                className="px-5 py-3.5 bg-accent hover:opacity-90 disabled:opacity-30 disabled:bg-accent/20 text-white rounded-xl transition-colors liquid-press font-medium flex items-center gap-2"
                            >
                                <Plus size={20} />
                                <span className="hidden sm:inline">Add</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="px-6 py-4">
            <div className="glass-panel rounded-2xl overflow-hidden">
                {/* Topic Items */}
                <div className="divide-y divide-white/5">
                    {tab.topics.map((topic, index) => {
                        const isActive = isActiveTimer(topic.id)
                        const isDragging = draggedIndex === index
                        const isDragOver = dragOverIndex === index && draggedIndex !== index
                        const isExpanded = expandedId === topic.id
                        const isSubtasksExpanded = expandedSubtasks[topic.id]
                        const subtaskProgress = getSubtaskProgress(topic)

                        return (
                            <div key={topic.id} className="flex flex-col">
                                <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    className={`topic-item flex items-center gap-3 sm:gap-4 group transition-all ${topic.completed ? 'completed' : ''
                                        } ${isDragging ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'border-t-2 border-accent -mt-[2px] pt-[18px]' : ''
                                        }`}
                                >
                                    {/* Expand/Collapse Chevron */}
                                    <button
                                        onClick={(e) => toggleSubtasksExpand(topic.id, e)}
                                        className="p-1 rounded transition-all hover:bg-white/10 text-white/60 flex-shrink-0"
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
                                        {topic.completed && <Check size={16} className="text-white" />}
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
                                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-base sm:text-lg focus:outline-none focus:border-accent"
                                                autoFocus
                                            />
                                        ) : (
                                            <p
                                                onClick={() => toggleExpand(topic.id)}
                                                onDoubleClick={() => startEdit(topic)}
                                                title="Tap to expand, double-tap to edit"
                                                className={`topic-name text-white font-medium text-base sm:text-lg cursor-pointer transition-all ${isExpanded ? 'whitespace-normal break-words text-lg sm:text-xl py-2' : 'truncate'
                                                    } ${topic.completed ? 'line-through text-white/40' : ''}`}
                                            >
                                                {topic.name}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {subtaskProgress && (
                                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${subtaskProgress.completed === subtaskProgress.total
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
                                                        className="w-14 px-1.5 py-0.5 text-xs bg-[var(--color-accent-dim)] border border-[var(--color-accent-glow)] rounded text-accent focus:outline-none focus:border-[var(--color-accent)]"
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
                                                    className={`text-xs font-medium px-1.5 py-0.5 rounded border transition-all flex items-center gap-1 ${topic.weight > 0
                                                        ? 'text-accent bg-[var(--color-accent-dim)] border-[var(--color-accent-glow)] hover:opacity-90'
                                                        : 'text-white/40 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white/60'
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
                                            {topic.category && (
                                                <span className="text-sm text-white/40 hidden sm:inline">{topic.category}</span>
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
                                                    : 'hover:bg-white/10 sm:opacity-0 sm:group-hover:opacity-100 opacity-60'
                                                    }`}
                                            >
                                                <Play size={14} className="text-white" />
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

                                {/* Subtasks Section */}
                                {isSubtasksExpanded && (
                                    <div className="ml-10 sm:ml-14 pl-4 border-l border-white/10 mb-2">
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
                                                        : 'border-white/30 hover:border-white/50'
                                                        }`}
                                                >
                                                    {subtask.completed && <Check size={12} className="text-white" />}
                                                </button>
                                                <span className={`flex-1 text-sm ${subtask.completed
                                                    ? 'text-white/40 line-through'
                                                    : 'text-white/80'
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
                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
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
                    })}
                </div>

                {/* Add Topic - Always visible and prominent */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                            placeholder="Add a task..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent/50 text-base"
                        />
                        <button
                            onClick={handleAddTopic}
                            disabled={!newTopicName.trim()}
                            className="px-4 py-3 bg-accent/20 hover:bg-accent/30 disabled:opacity-30 disabled:hover:bg-accent/20 text-accent rounded-xl transition-colors liquid-press flex items-center gap-2"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline text-sm font-medium">Add</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TopicList
