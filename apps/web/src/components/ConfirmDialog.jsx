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
            <div className="surface rounded-2xl shadow-2xl max-w-sm w-full animate-slide-up">
                <div className="p-6">
                    {/* Icon */}
                    {isDangerous && (
                        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 bg-[var(--color-danger)]/20 rounded-full">
                            <AlertTriangle className="w-7 h-7 text-[var(--color-danger)]" />
                        </div>
                    )}

                    {/* Title */}
                    <h3 className="text-xl font-bold text-center text-[var(--text-primary)] mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-[var(--text-secondary)] text-center text-[13px] mb-5">
                        {message}
                    </p>

                    {/* Typing requirement */}
                    {requireTyping && (
                        <div className="mb-5">
                            <p className="text-[11px] text-[var(--text-tertiary)] mb-2 text-center">
                                Type <span className="font-mono font-bold text-[var(--color-danger)]">{requireTyping}</span> to confirm:
                            </p>
                            <input
                                type="text"
                                value={typedValue}
                                onChange={(e) => setTypedValue(e.target.value)}
                                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-center text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-danger)]"
                                placeholder={requireTyping}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex border-t border-[var(--border-subtle)]">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-4 text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-2)] transition-colors rounded-bl-2xl"
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
                        className={`flex-1 px-4 py-4 font-medium transition-colors rounded-br-2xl ${isDangerous
                                ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:text-[var(--color-danger)]/30 disabled:cursor-not-allowed'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
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
