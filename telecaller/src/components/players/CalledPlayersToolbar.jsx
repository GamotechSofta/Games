const CalledPlayersToolbar = ({ calledCount, total, onClearAll }) => (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-gray-500">
            Click a row for details. Tick <strong className="text-gray-700">Done</strong> after you call a player.
            {calledCount > 0 && (
                <span className="text-teal-700 font-medium">
                    {' '}
                    · {calledCount} of {total} marked done
                </span>
            )}
        </p>
        <button
            type="button"
            onClick={onClearAll}
            disabled={calledCount === 0}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
            Clear all
        </button>
    </div>
);

export default CalledPlayersToolbar;
