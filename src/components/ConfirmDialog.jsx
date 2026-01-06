import React, { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    isDangerous = false,
    requireTyping = null
}) => {
    const [typedValue, setTypedValue] = useState('')

    useEffect(() => {
        if (!isOpen) {
            setTypedValue('')
        }
    }, [isOpen])

    if (!isOpen) return null

    const canConfirm = requireTyping ? typedValue === requireTyping : true

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
            <div className="glass-panel rounded-3xl shadow-2xl max-w-sm w-full animate-slide-up">
                <div className="p-6">
                    {/* Icon */}
                    {isDangerous && (
                        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 bg-red-500/20 rounded-full">
                            <AlertTriangle className="w-7 h-7 text-red-400" />
                        </div>
                    )}

                    {/* Title */}
                    <h3 className="text-xl font-bold text-center text-white mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-white/50 text-center text-sm mb-5">
                        {message}
                    </p>

                    {/* Typing requirement */}
                    {requireTyping && (
                        <div className="mb-5">
                            <p className="text-xs text-white/40 mb-2 text-center">
                                Type <span className="font-mono font-bold text-red-400">{requireTyping}</span> to confirm:
                            </p>
                            <input
                                type="text"
                                value={typedValue}
                                onChange={(e) => setTypedValue(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-center text-white focus:outline-none focus:border-red-500/50"
                                placeholder={requireTyping}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-4 text-white/60 font-medium hover:bg-white/5 transition-colors rounded-bl-3xl"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            if (canConfirm) {
                                onConfirm()
                                onClose()
                            }
                        }}
                        disabled={!canConfirm}
                        className={`flex-1 px-4 py-4 font-medium transition-colors rounded-br-3xl ${isDangerous
                                ? 'text-red-400 hover:bg-red-500/10 disabled:text-red-400/30 disabled:cursor-not-allowed'
                                : 'text-blue-400 hover:bg-blue-500/10'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmDialog
