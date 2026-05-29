import { Edit3 } from 'lucide-react'

const NotesSection = ({ notes, onChange }) => {
    return (
        <div className="px-6 pb-32 no-print">
            <div className="border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center gap-2 mb-3">
                    <Edit3 size={14} className="text-[var(--text-tertiary)]" />
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Quick Notes</h3>
                </div>

                <textarea
                    value={notes}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Jot down key concepts, formulas, or reminders..."
                    className="
            w-full h-32 p-0
            bg-transparent border-none
            text-[var(--text-secondary)] text-[15px] leading-relaxed
            placeholder:text-[var(--text-tertiary)]
            focus:outline-none resize-none
          "
                />
            </div>
        </div>
    )
}

export default NotesSection
