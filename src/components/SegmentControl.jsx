import { Plus, MoreVertical, Trash2, Edit2, Search, X as XIcon } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createEmptyTab } from '../utils/templates'
import ConfirmDialog from './ConfirmDialog'

const SegmentControl = ({ tabs, activeTabId, onTabChange, onTabAdd, onTabDelete, onTabUpdate }) => {
    const [menuTabId, setMenuTabId] = useState(null)
    const [showSearch, setShowSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const searchRef = useRef(null)

    const totalTopics = tabs.reduce((s, t) => s + (t.topics?.length || 0), 0)
    const searchEnabled = totalTopics > 10

    const searchResults = searchQuery.trim().length > 0
        ? tabs.flatMap(tab => tab.topics
            .filter(topic => topic.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(topic => ({ tab, topic }))
          ).slice(0, 8)
        : []

    useEffect(() => {
        if (showSearch) searchRef.current?.focus()
    }, [showSearch])
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [editingTabId, setEditingTabId] = useState(null)
    const [editValue, setEditValue] = useState('')
    const menuRef = useRef(null)
    const editInputRef = useRef(null)
    const [isAdding, setIsAdding] = useState(false)
    const [newName, setNewName] = useState('')
    const addInputRef = useRef(null)
    const addingRef = useRef(false)

    useEffect(() => {
        if (isAdding) addInputRef.current?.focus()
    }, [isAdding])

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

    const startAdd = () => {
        addingRef.current = true
        setNewName('')
        setIsAdding(true)
    }

    const commitAdd = () => {
        if (!addingRef.current) return // already handled (Enter then blur)
        addingRef.current = false
        const name = newName.trim()
        setIsAdding(false)
        setNewName('')
        if (!name) return
        const newTab = createEmptyTab()
        newTab.title = name
        newTab.emoji = ''
        onTabAdd(newTab)
        onTabChange(newTab.id)
    }

    const cancelAdd = () => {
        addingRef.current = false
        setIsAdding(false)
        setNewName('')
    }

    const handleRename = (tab) => {
        setEditingTabId(tab.id)
        setEditValue(tab.title)
        setMenuTabId(null)
    }

    const commitRename = () => {
        const name = editValue.trim()
        if (editingTabId && name) {
            onTabUpdate(editingTabId, { title: name })
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
                {/* Row 1: Scrollable section tabs */}
                <div className="segment-control w-full flex items-center gap-2">
                    {showSearch ? (
                        <div className="flex-1 relative">
                            <input
                                ref={searchRef}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Escape' && (setShowSearch(false), setSearchQuery(''))}
                                placeholder="Search topics…"
                                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--color-accent)]"
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 surface rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                                    {searchResults.map(({ tab, topic }) => (
                                        <button
                                            key={topic.id}
                                            onClick={() => { onTabChange(tab.id); setShowSearch(false); setSearchQuery('') }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] text-left transition-colors"
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${topic.completed ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)]/60'}`} />
                                            <span className="text-sm text-[var(--text-primary)] truncate flex-1">{topic.name}</span>
                                            <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">{tab.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                    <div className="flex-1 overflow-x-auto flex items-center gap-1 min-w-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                        {tabs.map((tab) => {
                            const isActive = tab.id === activeTabId

                            return (
                                <div key={tab.id} className="relative flex-shrink-0 flex items-center">
                                    {editingTabId === tab.id ? (
                                        <span className={`segment-btn whitespace-nowrap ${isActive ? 'active' : ''}`}>
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
                                            <span className="max-w-[80px] sm:max-w-[100px] truncate text-xs sm:text-sm">{tab.title}</span>
                                        </button>
                                    )}

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

                        {/* Add Section: inline name input, nothing is created without a name */}
                        {isAdding ? (
                            <span className="segment-btn active whitespace-nowrap flex-shrink-0">
                                <input
                                    ref={addInputRef}
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onBlur={commitAdd}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitAdd()
                                        else if (e.key === 'Escape') cancelAdd()
                                    }}
                                    placeholder="Name this section"
                                    className="bg-transparent outline-none text-xs sm:text-sm text-current placeholder:text-current placeholder:opacity-60"
                                    style={{ width: '15ch' }}
                                />
                            </span>
                        ) : (
                            <button
                                onClick={startAdd}
                                className="segment-btn liquid-press flex-shrink-0 !text-[var(--text-tertiary)] hover:!text-[var(--text-secondary)] !px-3"
                                title="Add Section"
                                aria-label="Add Section"
                            >
                                <Plus size={16} />
                            </button>
                        )}
                    </div>
                    )} {/* end search/tabs conditional */}

                    {/* Search toggle — appears only when > 10 topics */}
                    {searchEnabled && (
                        <button
                            onClick={() => { setShowSearch(v => !v); setSearchQuery('') }}
                            className={`p-2 rounded-xl flex-shrink-0 transition-all ${showSearch ? 'bg-[var(--color-accent)] text-[var(--on-accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}`}
                        >
                            {showSearch ? <XIcon size={15} /> : <Search size={15} />}
                        </button>
                    )}
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
                    <button
                        onClick={() => {
                            setDeleteConfirm(menuTabId)
                            setMenuTabId(null)
                        }}
                        className="w-full px-4 py-2.5 text-left text-base text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 flex items-center gap-3"
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
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
