import { Plus, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createEmptyTab } from '../utils/templates'
import ConfirmDialog from './ConfirmDialog'

// Icon/emoji mapping for tabs
const getEmojiForTab = (title) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('neuro')) return '🧠'
    if (lowerTitle.includes('cardio') || lowerTitle.includes('heart')) return '❤️'
    if (lowerTitle.includes('ped') || lowerTitle.includes('baby') || lowerTitle.includes('child')) return '👶'
    if (lowerTitle.includes('uro')) return '💧'
    if (lowerTitle.includes('surgery') || lowerTitle.includes('surg')) return '🔬'
    if (lowerTitle.includes('language') || lowerTitle.includes('lang')) return '🌍'
    return '📚'
}

const SegmentControl = ({ tabs, activeTabId, onTabChange, onTabAdd, onTabDelete, onTabUpdate }) => {
    const [menuTabId, setMenuTabId] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const menuRef = useRef(null)

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuTabId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleAddSection = () => {
        const newTab = createEmptyTab()
        newTab.title = `Section ${tabs.length + 1}`
        newTab.emoji = '📚'
        onTabAdd(newTab)
        onTabChange(newTab.id)
    }

    const handleRename = (tab) => {
        const newName = prompt('Enter section name:', tab.title)
        if (newName && newName.trim()) {
            onTabUpdate(tab.id, {
                title: newName.trim(),
                emoji: getEmojiForTab(newName.trim())
            })
        }
        setMenuTabId(null)
    }

    const confirmDelete = () => {
        if (deleteConfirm) {
            onTabDelete(deleteConfirm)
            setDeleteConfirm(null)
        }
    }

    return (
        <>
            <div className="px-6 no-print">
                <div className="segment-control w-full overflow-x-auto flex items-center gap-1">
                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId
                        const emoji = tab.emoji || getEmojiForTab(tab.title)

                        return (
                            <div key={tab.id} className="relative flex-shrink-0 flex items-center">
                                <button
                                    onClick={() => onTabChange(tab.id)}
                                    onDoubleClick={() => handleRename(tab)}
                                    className={`segment-btn liquid-press whitespace-nowrap ${isActive ? 'active' : ''}`}
                                >
                                    <span>{emoji}</span>
                                    <span className="hidden sm:inline max-w-[100px] truncate">{tab.title}</span>
                                </button>

                                {/* Menu button - only show for active tab */}
                                {isActive && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setMenuTabId(menuTabId === tab.id ? null : tab.id)
                                        }}
                                        className="p-1.5 -ml-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                                    >
                                        <MoreVertical size={14} />
                                    </button>
                                )}

                                {/* Dropdown Menu */}
                                {menuTabId === tab.id && (
                                    <div
                                        ref={menuRef}
                                        className="absolute top-full left-0 mt-2 glass-panel rounded-xl py-1 min-w-[130px] z-50 animate-fade-in shadow-xl"
                                    >
                                        <button
                                            onClick={() => handleRename(tab)}
                                            className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 flex items-center gap-3"
                                        >
                                            <Edit2 size={14} />
                                            Rename
                                        </button>
                                        {tabs.length > 1 && (
                                            <button
                                                onClick={() => {
                                                    setDeleteConfirm(tab.id)
                                                    setMenuTabId(null)
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3"
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Add Section Button */}
                    <button
                        onClick={handleAddSection}
                        className="segment-btn liquid-press flex-shrink-0 !text-white/30 hover:!text-white/60 !px-3"
                        title="Add Section"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <p className="text-[10px] text-white/20 mt-2 text-center">
                    Double-click to rename • Click ⋮ for options
                </p>
            </div>

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={confirmDelete}
                title="Delete Section?"
                message="This will delete all topics and notes in this section."
                confirmText="Delete"
                isDangerous={true}
            />
        </>
    )
}

export default SegmentControl
