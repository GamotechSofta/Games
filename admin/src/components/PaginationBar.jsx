import React from 'react';

const PaginationBar = ({ pagination, onPageChange, className = '' }) => {
    const { page = 1, totalPages = 1, total = 0, limit = 50 } = pagination || {};
    if (!total || totalPages <= 1) return null;

    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return (
        <div className={`flex flex-wrap items-center justify-between gap-3 mt-4 ${className}`}>
            <p className="text-sm text-gray-400">
                Showing {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="px-3 py-1.5 rounded-lg bg-gray-700 text-sm text-white disabled:opacity-40 hover:bg-gray-600"
                >
                    Previous
                </button>
                <span className="text-sm text-gray-300 px-2">
                    Page {page} of {totalPages}
                </span>
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="px-3 py-1.5 rounded-lg bg-gray-700 text-sm text-white disabled:opacity-40 hover:bg-gray-600"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default PaginationBar;
