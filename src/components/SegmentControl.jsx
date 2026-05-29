import { Plus, MoreVertical, Trash2, Edit2, Heart, CalendarDays } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

const SegmentControl = ({ tabs, activeTabId, onTabChange, onTabAdd, onTabDelete, onTabUpdate, onTachycardiaClick, showTachycardia, onCalendarClick, showCalendar }) => {
    const [menuTabId, setMenuTabId] = useState(null)
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [editingTabId, setEditingTabId] = useState(null)
    const [editValue, setEditValue] = useState('')
    const menuRef = useRef(null)
    const editInputRef = useRef(null)

    // Focus + select the rename input when inline editing starts
    useEffect(() => {
        if (editingTabId && editInputRef.current) {
            editInputRef.current.focus()
            editInputRef.current.select()
        }
    }, [editingTabId])

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

    // Update menu position on scroll/resize
    useEffect(() => {
        const updatePos = () => setMenuTabId(null)
        window.addEventListener('resize', updatePos)
        window.addEventListener('scroll', updatePos, true)
        return () => {
            window.removeEventListener('resize', updatePos)
            window.removeEventListener('scroll', updatePos, true)
        }
    }, [])

    const handleAddSection = () => {
        const newTab = createEmptyTab()
        newTab.title = `Section ${tabs.length + 1}`
        newTab.emoji = '📚'
        onTabAdd(newTab)
        onTabChange(newTab.id)
    }

    const handleRename = (tab) => {
        setEditingTabId(tab.id)
        setEditValue(tab.title)
        setMenuTabId(null)
    }

    const commitRename = () => {
        const name = editValue.trim()
        if (editingTabId && name) {
            onTabUpdate(editingTabId, {
                title: name,
                emoji: getEmojiForTab(name)
            })
        }
        setEditingTabId(null)
        setEditValue('')
    }

    const cancelRename = () => {
        setEditingTabId(null)
        setEditValue('')
    }

    const confirmDelete = () => {
        if (deleteConfirm) {
            onTabDelete(deleteConfirm)
            setDeleteConfirm(null)
        }
    }

    const toggleMenu = (e, tabId) => {
        e.stopPropagation()
        if (menuTabId === tabId) {
            setMenuTabId(null)
        } else {
            const rect = e.currentTarget.getBoundingClientRect()
            setMenuPos({
                top: rect.bottom + 8,
                left: rect.left
            })
            setMenuTabId(tabId)
        }
    }

    return (
        <>
            <div className="px-6 no-print">
                <div className="segment-control w-full overflow-x-auto flex items-center gap-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId
                        const emoji = tab.emoji || getEmojiForTab(tab.title)

                        return (
                            <div key={tab.id} className="relative flex-shrink-0 flex items-center">
                                {editingTabId === tab.id ? (
                                    <span className={`segment-btn whitespace-nowrap ${isActive ? 'active' : ''}`}>
                                        <span>{emoji}</span>
                                        <input
                                            ref={editInputRef}
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={commitRename}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitRename()
                                                else if (e.key === 'Escape') cancelRename()
                                            }}
                                            className="bg-transparent outline-none text-xs sm:text-sm text-current"
                                            style={{ width: `${Math.max(editValue.length + 1, 5)}ch` }}
                                        />
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => onTabChange(tab.id)}
                                        onDoubleClick={() => handleRename(tab)}
                                        className={`segment-btn liquid-press whitespace-nowrap ${isActive ? 'active' : ''}`}
                                    >
                                        <span>{emoji}</span>
                                        <span className="max-w-[80px] sm:max-w-[100px] truncate text-xs sm:text-sm">{tab.title}</span>
                                    </button>
                                )}

                                {/* Menu button - only show for active tab */}
                                {isActive && (
                                    <button
                                        onClick={(e) => toggleMenu(e, tab.id)}
                                        className={`p-1.5 -ml-1 rounded-full hover:bg-[var(--surface-2)] transition-colors ${menuTabId === tab.id ? 'text-[var(--text-primary)] bg-[var(--surface-2)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
                                    >
                                        <MoreVertical size={14} />
                                    </button>
                                )}
                            </div>
                        )
                    })}

                    {/* Add Section Button */}
                    <button
                        onClick={handleAddSection}
                        className="segment-btn liquid-press flex-shrink-0 !text-[var(--text-tertiary)] hover:!text-[var(--text-secondary)] !px-3"
                        title="Add Section"
                    >
                        <Plus size={16} />
                    </button>

                    {/* Calendar Button */}
                    <button
                        onClick={onCalendarClick}
                        className={`relative flex-shrink-0 ml-2 px-3 py-2 rounded-xl flex items-center gap-2 transition-all ${showCalendar
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10 border border-white/10'
                            }`}
                        title="Calendar"
                    >
                        <CalendarDays size={16} />
                        <span className="text-sm font-medium hidden sm:inline">Calendar</span>
                    </button>

                    {/* Tachycardia AI Button */}
                    <button
                        onClick={onTachycardiaClick}
                        className={`flex-shrink-0 ml-1 px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${showTachycardia
                            ? 'bg-accent text-white'
                            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-3)]'
                            }`}
                        title="Tachycardia AI"
                    >
                        <Heart
                            size={16}
                            className={showTachycardia ? 'text-white' : ''}
                            fill={showTachycardia ? 'currentColor' : 'none'}
                        />
                        <span className="text-sm font-medium hidden sm:inline">Tachycardia</span>
                    </button>
                </div>


            </div>

            {/* Portal Menu */}
            {menuTabId && createPortal(
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        top: Math.min(menuPos.top, window.innerHeight - 100), // Prevent going off bottom
                        left: Math.min(menuPos.left, window.innerWidth - 140), // Prevent going off right
                    }}
                    className="surface rounded-xl py-1 min-w-[130px] z-50 animate-fade-in shadow-xl"
                >
                    <button
                        onClick={() => handleRename(tabs.find(t => t.id === menuTabId))}
                        className="w-full px-4 py-2.5 text-left text-[15px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] flex items-center gap-3"
                    >
                        <Edit2 size={14} />
                        Rename
                    </button>
                    {tabs.length > 1 && (
                        <button
                            onClick={() => {
                                setDeleteConfirm(menuTabId)
                                setMenuTabId(null)
                            }}
                            className="w-full px-4 py-2.5 text-left text-base text-red-400 hover:bg-red-500/10 flex items-center gap-3"
                        >
                            <Trash2 size={14} />
                            Delete
                        </button>
                    )}
                </div>,
                document.body
            )}

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
