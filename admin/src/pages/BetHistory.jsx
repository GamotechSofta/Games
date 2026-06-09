import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';
import PaginationBar from '../components/PaginationBar';

const RANGES = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'last_week', label: 'Last Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'custom', label: 'Custom' },
];

function getDateRange(rangeId, customStart = '', customEnd = '') {
    const toYMD = (d) => d.toISOString().slice(0, 10);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (rangeId === 'all') {
        return { startDate: '', endDate: '', label: 'All' };
    }
    if (rangeId === 'custom') {
        if (customStart && customEnd) {
            const end = new Date(customEnd);
            end.setDate(end.getDate() + 1);
            return { startDate: customStart, endDate: toYMD(end), label: `${customStart} to ${customEnd}` };
        }
        return { startDate: '', endDate: '', label: 'Custom' };
    }

    switch (rangeId) {
        case 'today':
            return { startDate: toYMD(today), endDate: toYMD(tomorrow), label: 'Today' };
        case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return { startDate: toYMD(yesterday), endDate: toYMD(today), label: 'Yesterday' };
        }
        case 'this_week': {
            const day = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
            return { startDate: toYMD(monday), endDate: toYMD(tomorrow), label: 'This Week' };
        }
        case 'last_week': {
            const day = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
            const lastMonday = new Date(monday);
            lastMonday.setDate(monday.getDate() - 7);
            return { startDate: toYMD(lastMonday), endDate: toYMD(monday), label: 'Last Week' };
        }
        case 'this_month': {
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            return { startDate: toYMD(first), endDate: toYMD(nextMonth), label: 'This Month' };
        }
        case 'last_month': {
            const firstThis = new Date(today.getFullYear(), today.getMonth(), 1);
            const firstLast = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            return { startDate: toYMD(firstLast), endDate: toYMD(firstThis), label: 'Last Month' };
        }
        default:
            return { startDate: toYMD(today), endDate: toYMD(tomorrow), label: 'Today' };
    }
}

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open Bets' },
    { id: 'close', label: 'Close Bets' },
    { id: 'startline', label: 'Startline' },
    { id: 'king', label: 'King Bazaar' },
];

const getBetCategory = (bet) => {
    const mt = bet.marketId?.marketType || 'main';
    if (mt === 'startline') return 'startline';
    if (mt === 'king') return 'king';
    return bet.betOn === 'close' ? 'close' : 'open';
};

const BetHistory = () => {
    const navigate = useNavigate();
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [filter, setFilter] = useState('all');
    const [searchBetId, setSearchBetId] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 50 });

    const { startDate, endDate, label } = getDateRange(dateRange, customStart, customEnd);

    const filteredBets = filter === 'all'
        ? bets
        : bets.filter((b) => getBetCategory(b) === filter);

    const searchFilteredBets = searchBetId.trim()
        ? filteredBets.filter((b) => (b._id || '').toLowerCase().includes(searchBetId.trim().toLowerCase()))
        : filteredBets;

    const sortedBets = [...searchFilteredBets].sort((a, b) => {
        const catA = getBetCategory(a);
        const catB = getBetCategory(b);
        const order = { open: 1, close: 2, startline: 3, king: 4 };
        if (order[catA] !== order[catB]) return (order[catA] || 0) - (order[catB] || 0);
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    useEffect(() => {
        setPage(1);
    }, [dateRange, customStart, customEnd, filter]);

    useEffect(() => {
        fetchBets(page);
    }, [dateRange, customStart, customEnd, page]);

    const fetchBets = async (pageNum = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(pageNum),
                limit: '50',
            });
            if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }

            const response = await adminFetch(`${API_BASE_URL}/bets/history?${params}`);
            const data = await response.json();
            if (data.success) {
                setBets(data.data || []);
                if (data.pagination) setPagination(data.pagination);
            }
        } catch (err) {
            console.error('Error fetching bets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Bet History">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Bet History</h1>

                    {/* Date range */}
                    <div className="bg-gray-800 rounded-lg p-4 mb-4 sm:mb-6 border border-gray-700">
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Date range</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {RANGES.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setDateRange(r.id)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        dateRange === r.id
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-700 text-white hover:bg-gray-600'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        {dateRange === 'custom' && (
                            <div className="flex flex-wrap gap-3 items-center mb-3">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                                />
                            </div>
                        )}
                        <p className="text-gray-400 text-sm">
                            Showing data for: <span className="text-orange-500 font-medium">{dateRange === 'custom' && customStart && customEnd ? `${customStart} to ${customEnd}` : label}</span>
                        </p>
                    </div>

                    {/* Search by Bet ID */}
                    <div className="bg-gray-800 rounded-lg p-4 mb-4 sm:mb-6 border border-gray-700">
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Search by Bet ID</p>
                        <input
                            type="text"
                            placeholder="Enter bet ID to search..."
                            value={searchBetId}
                            onChange={(e) => setSearchBetId(e.target.value)}
                            className="w-full max-w-md px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* Filter tabs */}
                    <div className="bg-gray-800 rounded-lg p-4 mb-4 sm:mb-6 border border-gray-700">
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Filter by market</p>
                        <div className="flex flex-wrap gap-2">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setFilter(f.id)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        filter === f.id
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-700 text-white hover:bg-gray-600'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bet Table */}
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400">Loading bets...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <div className="bg-gray-800 rounded-lg overflow-hidden min-w-[640px]">
                            <table className="w-full text-sm sm:text-base">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Category</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Player</th>
                                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Market</th>
                                        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Bet Type</th>
                                        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Bet No</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {sortedBets.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="px-6 py-4 text-center text-gray-400">
                                                No bets found
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedBets.map((bet) => {
                                            const cat = getBetCategory(bet);
                                            const catLabel = cat === 'open' ? 'Open' : cat === 'close' ? 'Close' : cat === 'startline' ? 'Startline' : 'King Bazaar';
                                            return (
                                            <tr key={bet._id} className="hover:bg-gray-700">
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        cat === 'open' ? 'bg-blue-600/80' :
                                                        cat === 'close' ? 'bg-purple-600/80' :
                                                        cat === 'startline' ? 'bg-amber-600/80' :
                                                        'bg-teal-600/80'
                                                    }`}>{catLabel}</span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">{bet._id.slice(-8)}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">{bet.userId?.username || bet.userId}</td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm">{bet.marketId?.marketName || bet.marketId}</td>
                                                <td className="px-2 sm:px-3 py-3 sm:py-4 text-sm">{bet.betType}</td>
                                                <td className="px-2 sm:px-3 py-3 sm:py-4 text-sm font-mono text-amber-300">{bet.betNumber || '-'}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">₹{bet.amount}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        bet.status === 'won' ? 'bg-green-600' :
                                                        bet.status === 'lost' ? 'bg-red-600' :
                                                        bet.status === 'pending' ? 'bg-yellow-600' :
                                                        bet.status === 'cancelled' ? 'bg-orange-600' :
                                                        'bg-gray-600'
                                                    }`}>
                                                        {bet.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                                                    {new Date(bet.createdAt).toLocaleString()}
                                                </td>
                                            </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}

                    <PaginationBar pagination={pagination} onPageChange={setPage} />
        </AdminLayout>
    );
};

export default BetHistory;
