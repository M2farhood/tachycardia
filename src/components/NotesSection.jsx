import { Edit3 } from 'lucide-react'

const NotesSection = ({ notes, onChange }) => {
    return (
        <div className="px-6 pb-32 no-print">
            <div className="glass-panel rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Edit3 size={16} className="text-white/40" />
                    <h3 className="text-sm font-medium text-white/60">Quick Notes</h3>
                </div>

                <textarea
                    value={notes}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Jot down key concepts, formulas, or reminders..."
                    className="
            w-full h-32 p-0
            bg-transparent border-none
            text-white/80 text-sm leading-relaxed
            placeholder:text-white/20
            focus:outline-none resize-none
          "
                />
            </div>
        </div>
    )
}

export default NotesSection
