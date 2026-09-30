import { ShieldCheck } from 'lucide-react'
import { grantAIConsent } from '../hooks/useAIConsent'

/** Plain-words disclosure shown before the first AI request. */
const AIConsentCard = ({ onDecline, compact = false }) => (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 space-y-3 max-w-xl">
        <p className="flex items-center gap-2 text-[17px] font-bold text-[var(--text-primary)]">
            <ShieldCheck size={20} className="text-[var(--color-accent)]" /> Before Tachycardia helps
        </p>
        <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
            To answer, Tachycardia sends what you type and the names of your lists, tasks and calendar items to the
            Study Tracker server, which passes them to an AI service (DeepSeek, through OpenRouter).
        </p>
        {!compact && (
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
                It is used only to reply to you — not for ads and not sold. Nothing in your lists changes unless you
                tap Apply. Please don’t share private medical or patient details. You can turn Tachycardia off any
                time in Settings → Advanced. <a href="/privacy" target="_blank" rel="noreferrer" className="underline">Privacy policy</a>
            </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={grantAIConsent} className="px-4 py-2.5 rounded-xl bg-[var(--color-accent)] text-[var(--on-accent)] text-[14px] font-semibold">
                I agree, turn it on
            </button>
            {onDecline && (
                <button onClick={onDecline} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[14px] text-[var(--text-secondary)]">
                    Not now
                </button>
            )}
        </div>
    </div>
)

export default AIConsentCard
