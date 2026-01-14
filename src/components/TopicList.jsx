import { useState, useRef } from 'react'
import { Plus, Check, Play, Trash2, GripVertical } from 'lucide-react'
import { generateId } from '../utils/templates'

const TopicList = ({
    tab,
    timerSession,
    defaultDuration,
    onTopicUpdate,
    onTopicAdd,
    onTopicDelete,
    onTimerStart,
    onReorderTopics
}) => {
    const [newTopicName, setNewTopicName] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [expandedId, setExpandedId] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [draggedIndex, setDraggedIndex] = useState(null)
    const [dragOverIndex, setDragOverIndex] = useState(null)
    const dragNode = useRef(null)

    const handleAddTopic = () => {
        if (newTopicName.trim()) {
            onTopicAdd(tab.id, {
                id: generateId(),
                name: newTopicName.trim(),
                category: '',
                completed: false,
                timeEstimate: defaultDuration
            })
            setNewTopicName('')
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

    const saveEdit = () => {
        if (editValue.trim() && editingId) {
            onTopicUpdate(tab.id, editingId, { name: editValue.trim() })
        }
        setEditingId(null)
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

                        return (
                            <div
                                key={topic.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                className={`topic-item flex items-center gap-4 group transition-all ${topic.completed ? 'completed' : ''
                                    } ${isDragging ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'border-t-2 border-blue-500 -mt-[2px] pt-[18px]' : ''
                                    }`}
                            >
                                {/* Drag Handle */}
                                <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 transition-opacity touch-none">
                                    <GripVertical size={16} className="text-white/40" />
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
                                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-lg focus:outline-none focus:border-blue-500"
                                            autoFocus
                                        />
                                    ) : (
                                        <p
                                            onClick={() => toggleExpand(topic.id)}
                                            onDoubleClick={() => startEdit(topic)}
                                            title="Click to expand, double-click to edit"
                                            className={`topic-name text-white font-medium text-lg cursor-pointer transition-all ${isExpanded ? 'whitespace-normal break-words text-xl py-2' : 'truncate'
                                                } ${topic.completed ? 'line-through text-white/40' : ''}`}
                                        >
                                            {topic.name}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {topic.weight > 0 && (
                                            <span className="text-xs font-medium text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/20">
                                                {topic.weight}%
                                            </span>
                                        )}
                                        {topic.category && (
                                            <span className="text-sm text-white/40">{topic.category}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Time / Timer Button */}
                                <div className="flex items-center gap-2">
                                    {!topic.completed && (
                                        <button
                                            onClick={() => onTimerStart(tab.id, topic.id)}
                                            className={`p-2 rounded-full transition-all ${isActive
                                                ? 'bg-blue-500 glow-blue animate-pulse-glow'
                                                : 'hover:bg-white/10 opacity-0 group-hover:opacity-100'
                                                }`}
                                        >
                                            <Play size={14} className="text-white" />
                                        </button>
                                    )}
                                    <span className="text-sm text-white/30 tabular-nums w-12 text-right">
                                        {topic.timeEstimate || defaultDuration}m
                                    </span>
                                </div>

                                {/* Delete */}
                                <button
                                    onClick={() => onTopicDelete(tab.id, topic.id)}
                                    className="p-2 rounded-full hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16} className="text-red-400/60" />
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* Add Topic */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                            placeholder="Add a topic..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-base"
                        />
                        <button
                            onClick={handleAddTopic}
                            disabled={!newTopicName.trim()}
                            className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 disabled:hover:bg-blue-500/20 text-blue-400 rounded-xl transition-colors liquid-press"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TopicList
