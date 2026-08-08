import { AlertTriangle } from 'lucide-react'

// Shown when the stored/cloud document was written by a NEWER version of the
// app than the one running. The data is displayed, but nothing is written —
// not to localStorage, not to Firestore (see DATA-CONTRACT.md rule 4).
//
// Visual language follows CountdownWidget: a hairline-separated strip inside
// the app container, existing CSS variables only, no new surfaces.
const ReadOnlyBanner = ({ visible }) => {
    if (!visible) return null

    return (
        <div
            role="status"
            className="relative animate-fade-in no-print border-t border-[var(--border-subtle)]"
        >
            <div className="px-0 py-3 flex items-center gap-3">
                <AlertTriangle
                    size={13}
                    style={{ color: 'var(--color-danger)' }}
                    className="flex-shrink-0"
                />

                <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                        className="text-[11px] font-medium uppercase tracking-wider"
                        style={{ color: 'var(--color-danger)' }}
                    >
                        Update the app to keep syncing
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] leading-snug">
                        Your data was saved by a newer version. It is shown here read-only —
                        changes will not be saved until this app is updated.
                    </span>
                </div>
            </div>

            {/* Bottom urgency line — mirrors CountdownWidget */}
            <div
                className="absolute bottom-0 left-0 right-0 h-[1px] rounded-full"
                style={{ backgroundColor: 'var(--color-danger)', opacity: 0.25 }}
            />
        </div>
    )
}

export default ReadOnlyBanner
