import { useState, useRef, useEffect } from 'react'
import { Plus, Edit3 } from 'lucide-react'
import TopicRow from './TopicRow'
import ProgressCircle from './ProgressCircle'
import ConfirmDialog from './ConfirmDialog'
import { createEmptyTopic } from '../utils/templates'

const TopicTable = ({
    tab,
    timerSession,
    timerTimeLeft,
    defaultDuration,
    onTopicUpdate,
    onTopicAdd,
    onTopicDelete,
    onTabUpdate,
    onTimerStart,
    onTimerPauseResume,
    onTimerReset
}) => {
    const [isEditingSubtitle, setIsEditingSubtitle] = useState(false)
    const [editSubtitle, setEditSubtitle] = useState(tab.subtitle)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const subtitleRef = useRef(null)

    const completedCount = tab.topics.filter(t => t.completed).length
    const totalCount = tab.topics.length

    useEffect(() => {
        if (isEditingSubtitle && subtitleRef.current) {
            subtitleRef.current.focus()
            subtitleRef.current.select()
        }
    }, [isEditingSubtitle])

    const saveSubtitle = () => {
        if (editSubtitle.trim() && editSubtitle !== tab.subtitle) {
            onTabUpdate(tab.id, { subtitle: editSubtitle.trim() })
        } else {
            setEditSubtitle(tab.subtitle)
        }
        setIsEditingSubtitle(false)
    }

    const handleAddTopic = () => {
        const newTopic = createEmptyTopic()
        onTopicAdd(tab.id, newTopic)
    }

    const handleDeleteClick = (topicId) => {
        setDeleteConfirm(topicId)
    }

    const confirmDelete = () => {
        if (deleteConfirm) {
            onTopicDelete(tab.id, deleteConfirm)
            setDeleteConfirm(null)
        }
    }

    return (
        <div className="p-4 md:p-8 print:p-0">
            {/* Tab Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4 print:mb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isEditingSubtitle ? (
                            <input
                                ref={subtitleRef}
                                value={editSubtitle}
                                onChange={(e) => setEditSubtitle(e.target.value)}
                                onBlur={saveSubtitle}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveSubtitle()
                                    if (e.key === 'Escape') {
                                        setEditSubtitle(tab.subtitle)
                                        setIsEditingSubtitle(false)
                                    }
                                }}
                                className="px-2 py-0.5 text-xs font-bold uppercase bg-white border border-indigo-400 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 w-32"
                            />
                        ) : (
                            <span
                                onClick={() => setIsEditingSubtitle(true)}
                                className="inline-editable bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-md text-xs uppercase cursor-text print:border print:border-slate-300"
                            >
                                {tab.subtitle}
                            </span>
                        )}

                        <h2 className="text-xl md:text-2xl font-black text-slate-900">
                            {tab.title}
                        </h2>
                    </div>
                    <p className="text-slate-500 text-sm">Total Topics: {totalCount}</p>
                </div>

                <div className="no-print">
                    <ProgressCircle completed={completedCount} total={totalCount} />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm print:overflow-visible print:border-none print:shadow-none">
                <table className="w-full text-left border-collapse min-w-[600px] print:min-w-0">
                    <thead>
                        <tr className="bg-slate-800 text-white print:bg-white print:text-black print:border-b-2 print:border-black">
                            <th className="p-4 w-16 text-center text-[10px] uppercase font-black tracking-widest print:text-black">
                                Done
                            </th>
                            <th className="p-4 w-32 text-center text-[10px] uppercase font-black tracking-widest border-l border-slate-600 no-print">
                                Timer
                            </th>
                            <th className="p-4 text-[10px] uppercase font-black tracking-widest border-l border-slate-600 print:border-none print:text-black">
                                Topic
                            </th>
                            <th className="p-4 w-1/4 text-[10px] uppercase font-black tracking-widest border-l border-slate-600 print:border-none print:text-black">
                                Category / Lecturer
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {tab.topics.map((topic) => {
                            const isActiveTimer = timerSession?.tabId === tab.id && timerSession?.topicId === topic.id

                            return (
                                <TopicRow
                                    key={topic.id}
                                    topic={topic}
                                    isActiveTimer={isActiveTimer}
                                    timerTime={isActiveTimer ? timerTimeLeft : 0}
                                    isTimerRunning={isActiveTimer && timerSession?.isRunning}
                                    defaultDuration={defaultDuration}
                                    onToggleComplete={(completed) => onTopicUpdate(tab.id, topic.id, { completed })}
                                    onUpdate={(updates) => onTopicUpdate(tab.id, topic.id, updates)}
                                    onDelete={() => handleDeleteClick(topic.id)}
                                    onTimerStart={() => onTimerStart(tab.id, topic.id)}
                                    onTimerPause={onTimerPauseResume}
                                    onTimerReset={onTimerReset}
                                />
                            )
                        })}
                    </tbody>
                </table>

                {/* Add Topic Button */}
                <button
                    onClick={handleAddTopic}
                    className="w-full py-4 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 border-t border-slate-200 no-print"
                >
                    <Plus size={18} />
                    <span className="font-medium">Add Topic</span>
                </button>
            </div>

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={confirmDelete}
                title="Delete Topic?"
                message={`Are you sure you want to delete "${tab.topics.find(t => t.id === deleteConfirm)?.name}"?`}
                confirmText="Delete"
                isDangerous={true}
            />
        </div>
    )
}

export default TopicTable
