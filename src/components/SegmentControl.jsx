import { Plus, MoreVertical, Trash2, Edit2, Heart } from 'lucide-react'
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

const SegmentControl = ({ tabs, activeTabId, onTabChange, onTabAdd, onTabDelete, onTabUpdate, onTachycardiaClick, showTachycardia }) => {
    const [menuTabId, setMenuTabId] = useState(null)
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
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
                                        onClick={(e) => toggleMenu(e, tab.id)}
                                        className={`p-1.5 -ml-1 rounded-full hover:bg-white/10 transition-colors ${menuTabId === tab.id ? 'text-white bg-white/10' : 'text-white/40 hover:text-white/70'}`}
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
                        className="segment-btn liquid-press flex-shrink-0 !text-white/30 hover:!text-white/60 !px-3"
                        title="Add Section"
                    >
                        <Plus size={16} />
                    </button>

                    {/* Tachycardia AI Button */}
                    <button
                        onClick={onTachycardiaClick}
                        className={`relative flex-shrink-0 ml-2 px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${showTachycardia
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                                : 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 hover:from-pink-500/30 hover:to-rose-500/30 border border-pink-500/30'
                            }`}
                        title="Tachycardia AI"
                    >
                        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 opacity-0 hover:opacity-20 blur-lg transition-opacity" />
                        <Heart
                            size={16}
                            className={`${showTachycardia ? 'text-white' : 'text-pink-400'} ${!showTachycardia ? 'animate-pulse' : ''}`}
                            fill={showTachycardia ? 'currentColor' : 'none'}
                        />
                        <span className="text-sm font-medium hidden sm:inline">Tachycardia</span>
                    </button>
                </div>

                <p className="text-xs text-white/20 mt-2 text-center">
                    Double-click to rename • Click ⋮ for options
                </p>
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
                    className="glass-panel rounded-xl py-1 min-w-[130px] z-50 animate-fade-in shadow-xl"
                >
                    <button
                        onClick={() => handleRename(tabs.find(t => t.id === menuTabId))}
                        className="w-full px-4 py-2.5 text-left text-base text-white/80 hover:bg-white/10 flex items-center gap-3"
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
