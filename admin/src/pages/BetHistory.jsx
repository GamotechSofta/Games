import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { clearAdminAuth } from '../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

const RANGES = [
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

const BetHistory = () => {
    const navigate = useNavigate();
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const { startDate, endDate, label } = getDateRange(dateRange, customStart, customEnd);

    useEffect(() => {
        fetchBets();
    }, [dateRange, customStart, customEnd]);

    const fetchBets = async () => {
        try {
            setLoading(true);
            const admin = JSON.parse(localStorage.getItem('admin'));
            const password = localStorage.getItem('adminPassword') || sessionStorage.getItem('adminPassword') || '';
            const params = new URLSearchParams();
            if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }

            const url = params.toString() ? `${API_BASE_URL}/bets/history?${params}` : `${API_BASE_URL}/bets/history`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Basic ${btoa(`${admin.username}:${password}`)}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                setBets(data.data);
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
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Player</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Market</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Bet Type</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {bets.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-4 text-center text-gray-400">
                                                No bets found
                                            </td>
                                        </tr>
                                    ) : (
                                        bets.map((bet) => (
                                            <tr key={bet._id} className="hover:bg-gray-700">
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">{bet._id.slice(-8)}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">{bet.userId?.username || bet.userId}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">{bet.marketId?.marketName || bet.marketId}</td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">{bet.betType}</td>
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
                                        ))
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}
        </AdminLayout>
    );
};

export default BetHistory;
