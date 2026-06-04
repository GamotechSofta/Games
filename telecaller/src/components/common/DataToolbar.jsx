import { FaSearch, FaSync } from 'react-icons/fa';
import { SORT_OPTIONS } from '../../utils/playerSort';

const DataToolbar = ({
    search,
    onSearchChange,
    sortBy,
    onSortChange,
    onRefresh,
    loading,
    refreshing,
    sortOptions = SORT_OPTIONS,
}) => (
    <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search name or phone…"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none"
            />
        </div>
        <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm"
        >
            {sortOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
            ))}
        </select>
        <button
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
        >
            <FaSync className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
        </button>
    </div>
);

export default DataToolbar;
