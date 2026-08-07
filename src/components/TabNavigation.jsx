import { useState, useRef, useEffect } from 'react'
import { Plus, X, MoreVertical, Trash2, Edit3 } from 'lucide-react'
import { createEmptyTab } from '../utils/templates'
import ConfirmDialog from './ConfirmDialog'

const TabNavigation = ({
    tabs,
    activeTabId,
    onTabChange,
    onTabUpdate,
    onTabAdd,
    onTabDelete
}) => {
    const [editingTabId, setEditingTabId] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [menuTabId, setMenuTabId] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const inputRef = useRef(null)
    const scrollRef = useRef(null)

    // Focus input when editing starts
    useEffect(() => {
        if (editingTabId && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [editingTabId])

    // Close menu when clicking outside
    useEffect(() => {
        const handleClick = () => setMenuTabId(null)
        if (menuTabId) {
            document.addEventListener('click', handleClick)
            return () => document.removeEventListener('click', handleClick)
        }
    }, [menuTabId])

    const startEditing = (tab) => {
        setEditingTabId(tab.id)
        setEditValue(tab.title)
        setMenuTabId(null)
    }

    const saveEdit = () => {
        if (editValue.trim() && editingTabId) {
            onTabUpdate(editingTabId, { title: editValue.trim() })
        }
        setEditingTabId(null)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveEdit()
        } else if (e.key === 'Escape') {
            setEditingTabId(null)
        }
    }

    const handleAddTab = () => {
        const newTab = createEmptyTab()
        onTabAdd(newTab)
        // Scroll to end
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
            }
        }, 100)
    }

    const handleDeleteTab = (tabId) => {
        setDeleteConfirm(tabId)
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
            <div className="bg-slate-100 border-b border-slate-200 no-print">
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={`
                relative flex-shrink-0 
                ${activeTabId === tab.id
                                    ? 'bg-white border-b-2 border-indigo-600'
                                    : 'border-b-2 border-transparent hover:bg-slate-200'
                                }
              `}
                        >
                            {editingTabId === tab.id ? (
                                <div className="px-4 py-3">
                                    <input
                                        ref={inputRef}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={saveEdit}
                                        onKeyDown={handleKeyDown}
                                        className="px-2 py-1 text-sm font-semibold bg-white border border-indigo-400 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 min-w-[100px]"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <button
                                        onClick={() => onTabChange(tab.id)}
                                        onDoubleClick={() => startEditing(tab)}
                                        className={`
                      px-4 md:px-6 py-3.5
                      text-xs md:text-sm font-bold uppercase tracking-wider
                      whitespace-nowrap transition-colors
                      ${activeTabId === tab.id
                                                ? 'text-indigo-800'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }
                    `}
                                    >
                                        {tab.title}
                                    </button>

                                    {/* Tab Menu */}
                                    <div className="relative pr-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setMenuTabId(menuTabId === tab.id ? null : tab.id)
                                            }}
                                            className="p-1.5 hover:bg-slate-300 rounded opacity-50 hover:opacity-100 transition-all"
                                        >
                                            <MoreVertical size={14} />
                                        </button>

                                        {menuTabId === tab.id && (
                                            <div className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-lg border border-slate-200 py-1 z-30 min-w-[140px] animate-fade-in">
                                                <button
                                                    onClick={() => startEditing(tab)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Edit3 size={14} />
                                                    Rename
                                                </button>
                                                {tabs.length > 1 && (
                                                    <button
                                                        onClick={() => handleDeleteTab(tab.id)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Tab Button */}
                    <button
                        onClick={handleAddTab}
                        className="flex-shrink-0 px-4 py-3.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 transition-colors flex items-center gap-1"
                        title="Add Section"
                    >
                        <Plus size={18} />
                        <span className="text-xs font-medium hidden sm:inline">Add Section</span>
                    </button>
                </div>
            </div>

            {/* Print Tabs */}
            <div className="hidden print:flex gap-4 px-4 py-2 border-b border-slate-200">
                {tabs.map((tab) => (
                    <span
                        key={tab.id}
                        className={`text-sm ${activeTabId === tab.id ? 'font-bold' : 'text-slate-500'}`}
                    >
                        {tab.title}
                    </span>
                ))}
            </div>

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={confirmDelete}
                title="Delete Section?"
                message={`This will delete "${tabs.find(t => t.id === deleteConfirm)?.title}" and all its topics. This cannot be undone.`}
                confirmText="Delete Section"
                isDangerous={true}
            />
        </>
    )
}

export default TabNavigation
