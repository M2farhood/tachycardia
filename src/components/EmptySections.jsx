import { useState } from 'react'
import { Plus } from 'lucide-react'

// `suggestions` are the owner's own quick names (Settings → Advanced → Lists).
const EmptySections = ({ onCreate, suggestions = [] }) => {
    const [name, setName] = useState('')
    const trimmed = name.trim()

    const submit = () => {
        if (trimmed) onCreate(trimmed)
    }

    return (
        <div className="px-6 py-12 sm:py-20 no-print">
            <div className="max-w-sm mx-auto text-center">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                    Start your first list
                </h2>
                <p className="text-[14px] text-[var(--text-tertiary)] mb-6">
                    Each list is one project or one part of your life.
                </p>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="Name it"
                        autoFocus
                        className="flex-1 min-w-0 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <button
                        onClick={submit}
                        disabled={!trimmed}
                        className="px-4 py-3 rounded-xl bg-[var(--color-accent)] text-[var(--on-accent)] font-medium text-[15px] flex items-center gap-1.5 disabled:opacity-30 liquid-press"
                    >
                        <Plus size={16} />
                        Create
                    </button>
                </div>

                {suggestions.length > 0 && <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {suggestions.map(label => (
                        <button
                            key={label}
                            onClick={() => setName(label)}
                            className="px-3 py-1.5 rounded-full text-[13px] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            {label}
                        </button>
                    ))}
                </div>}
            </div>
        </div>
    )
}

export default EmptySections
