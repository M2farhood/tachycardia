import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Circle, Play, Pause, RotateCcw, Trash2 } from 'lucide-react'

const TopicRow = ({
    topic,
    isActiveTimer,
    timerTime,
    isTimerRunning,
    defaultDuration,
    onToggleComplete,
    onUpdate,
    onDelete,
    onTimerStart,
    onTimerPause,
    onTimerReset
}) => {
    const [isEditingName, setIsEditingName] = useState(false)
    const [isEditingCategory, setIsEditingCategory] = useState(false)
    const [editName, setEditName] = useState(topic.name)
    const [editCategory, setEditCategory] = useState(topic.category)
    const [showDeleteBtn, setShowDeleteBtn] = useState(false)

    const nameInputRef = useRef(null)
    const categoryInputRef = useRef(null)

    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus()
            nameInputRef.current.select()
        }
    }, [isEditingName])

    useEffect(() => {
        if (isEditingCategory && categoryInputRef.current) {
            categoryInputRef.current.focus()
            categoryInputRef.current.select()
        }
    }, [isEditingCategory])

    const saveName = () => {
        if (editName.trim() && editName !== topic.name) {
            onUpdate({ name: editName.trim() })
        } else {
            setEditName(topic.name)
        }
        setIsEditingName(false)
    }

    const saveCategory = () => {
        if (editCategory.trim() && editCategory !== topic.category) {
            onUpdate({ category: editCategory.trim() })
        } else {
            setEditCategory(topic.category)
        }
        setIsEditingCategory(false)
    }

    const handleKeyDown = (e, saveFunc) => {
        if (e.key === 'Enter') {
            saveFunc()
        } else if (e.key === 'Escape') {
            setEditName(topic.name)
            setEditCategory(topic.category)
            setIsEditingName(false)
            setIsEditingCategory(false)
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <tr
            onMouseEnter={() => setShowDeleteBtn(true)}
            onMouseLeave={() => setShowDeleteBtn(false)}
            className={`
        border-b border-slate-100 transition-colors group
        ${topic.completed ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}
        ${isActiveTimer ? 'bg-amber-50/40 border-l-4 !border-l-amber-400' : ''}
        print:bg-white print:border-slate-200
      `}
        >
            {/* Checkbox */}
            <td className="p-4 text-center w-16">
                <button
                    onClick={() => onToggleComplete(!topic.completed)}
                    className="focus:outline-none checkbox-custom no-print"
                >
                    {topic.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-indigo-600 fill-indigo-100" />
                    ) : (
                        <Circle className="w-6 h-6 text-slate-300 hover:text-indigo-400" />
                    )}
                </button>
                {/* Print checkbox */}
                <span className="hidden print:block text-xl">
                    {topic.completed ? '☑' : '☐'}
                </span>
            </td>

            {/* Timer */}
            <td className="p-2 border-l border-slate-100 w-32 no-print">
                <div className={`
          flex items-center justify-between px-2 py-1.5 rounded-lg
          ${isActiveTimer
                        ? 'bg-amber-100 text-amber-900 shadow-inner'
                        : 'bg-slate-100 text-slate-400'
                    }
        `}>
                    <span className="text-xs font-mono font-bold">
                        {isActiveTimer ? formatTime(timerTime) : `${defaultDuration}:00`}
                    </span>

                    <div className="flex gap-0.5">
                        {isActiveTimer && isTimerRunning ? (
                            <button
                                onClick={onTimerPause}
                                className="p-1 rounded hover:bg-white/50 text-amber-600 animate-pulse-soft"
                                title="Pause"
                            >
                                <Pause size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={onTimerStart}
                                className="p-1 rounded hover:bg-white/50 text-slate-500 hover:text-indigo-600"
                                title={isActiveTimer ? 'Resume' : 'Start'}
                            >
                                <Play size={14} />
                            </button>
                        )}

                        {isActiveTimer && (
                            <button
                                onClick={onTimerReset}
                                className="p-1 rounded hover:bg-white/50 text-slate-500"
                                title="Reset"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </td>

            {/* Topic Name */}
            <td className={`
        p-4 border-l border-slate-100 print:border-none
        ${topic.completed
                    ? 'text-slate-400 line-through decoration-indigo-300 print:no-underline print:text-black'
                    : 'text-slate-900'
                }
      `}>
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={saveName}
                        onKeyDown={(e) => handleKeyDown(e, saveName)}
                        className="w-full px-2 py-1 font-bold bg-white border border-indigo-400 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                ) : (
                    <span
                        onClick={() => setIsEditingName(true)}
                        className="inline-editable font-bold cursor-text"
                    >
                        {topic.name}
                    </span>
                )}
            </td>

            {/* Category */}
            <td className={`
        p-4 border-l border-slate-100 print:border-none w-1/4 relative
        ${topic.completed
                    ? 'text-slate-300 print:text-slate-600'
                    : 'text-indigo-800 print:text-slate-800'
                }
      `}>
                <div className="flex items-center justify-between">
                    {isEditingCategory ? (
                        <input
                            ref={categoryInputRef}
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            onBlur={saveCategory}
                            onKeyDown={(e) => handleKeyDown(e, saveCategory)}
                            className="w-full px-2 py-1 text-xs font-semibold uppercase bg-white border border-indigo-400 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    ) : (
                        <span
                            onClick={() => setIsEditingCategory(true)}
                            className="inline-editable text-xs font-semibold uppercase tracking-wide cursor-text"
                        >
                            {topic.category}
                        </span>
                    )}

                    {/* Delete Button */}
                    <button
                        onClick={onDelete}
                        className={`
              p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all no-print
              ${showDeleteBtn ? 'opacity-100' : 'opacity-0 md:opacity-0'}
              touch:opacity-100
            `}
                        title="Delete topic"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    )
}

export default TopicRow
