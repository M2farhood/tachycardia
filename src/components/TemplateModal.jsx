import { getInitialState } from '../utils/templates'

const TemplateModal = ({ onSelect, onClose }) => {
    const templateOptions = [
        { key: 'medical', name: 'Medical Studies', emoji: '🏥', description: 'Surgery, anatomy modules' },
        { key: 'academic', name: 'General Academic', emoji: '📚', description: 'University coursework' },
        { key: 'language', name: 'Language Learning', emoji: '🌍', description: 'Vocabulary, grammar' },
        { key: 'blank', name: 'Start Fresh', emoji: '✨', description: 'Empty template' }
    ]

    const handleSelect = (templateKey) => {
        const initialState = getInitialState(templateKey)
        onSelect(initialState)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 modal-backdrop animate-fade-in">
            <div className="surface rounded-2xl shadow-2xl max-w-md w-full animate-slide-up">
                {/* Header */}
                <div className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Welcome! 👋</h2>
                    <p className="text-[var(--text-secondary)] text-[13px] mt-2">Pick a template to start tracking your studies</p>
                </div>

                {/* Template Grid */}
                <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 gap-3">
                        {templateOptions.map(({ key, name, emoji, description }) => (
                            <button
                                key={key}
                                onClick={() => handleSelect(key)}
                                className="text-left p-4 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--surface-3)] hover:border-[var(--border)] transition-all liquid-press group"
                            >
                                <div className="text-2xl mb-2">{emoji}</div>
                                <h3 className="font-semibold text-[var(--text-primary)] text-[13px] group-hover:text-accent transition-colors">
                                    {name}
                                </h3>
                                <p className="text-[var(--text-tertiary)] text-[11px] mt-0.5">{description}</p>
                            </button>
                        ))}
                    </div>

                    <p className="text-center text-[var(--text-tertiary)] text-[11px] mt-5">
                        You can customize everything later
                    </p>
                </div>
            </div>
        </div>
    )
}

export default TemplateModal
