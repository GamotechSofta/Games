import { useEffect, useState } from 'react';

const CallSummaryBox = ({
    savedValue = '',
    onSave,
    saving = false,
    disabled = false,
}) => {
    const [draft, setDraft] = useState(savedValue);
    const [savedFeedback, setSavedFeedback] = useState(false);

    useEffect(() => {
        setDraft(savedValue);
        setSavedFeedback(false);
    }, [savedValue]);

    const dirty = draft !== savedValue;

    const handleSave = async () => {
        if (!onSave || disabled || saving) return;
        try {
            await onSave(draft);
            setSavedFeedback(true);
            window.setTimeout(() => setSavedFeedback(false), 2000);
        } catch {
            /* parent sets syncError */
        }
    };

    return (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <label htmlFor="call-summary" className="block text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1.5">
                What the player said
            </label>
            <textarea
                id="call-summary"
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={disabled || saving}
                placeholder="Note deposit plans, complaints, callback time, or anything they told you on this call…"
                className="w-full rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:opacity-60 resize-y min-h-[88px]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <p className="text-[11px] text-amber-800/70">
                    {savedFeedback
                        ? 'Saved.'
                        : dirty
                            ? 'Unsaved changes — tap Save.'
                            : 'Only you and admin can see this note.'}
                </p>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled || saving || !dirty}
                    className="shrink-0 px-4 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    );
};

export default CallSummaryBox;
