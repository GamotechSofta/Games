const PaginationBar = ({
    page,
    totalPages,
    total,
    onPageChange,
    disabled,
}) => {
    if (!total || totalPages <= 1) return null;

    const prev = () => onPageChange(Math.max(1, page - 1));
    const next = () => onPageChange(Math.min(totalPages, page + 1));

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
                Page {page} of {totalPages} · {total} players total
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={prev}
                    disabled={disabled || page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                    Previous
                </button>
                <button
                    type="button"
                    onClick={next}
                    disabled={disabled || page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default PaginationBar;
