import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaSyncAlt, FaSearch, FaTimes, FaClock } from 'react-icons/fa';
import { adminFetch, clearAdminAuth, API_BASE_URL } from '../utils/api';

const PRESETS = [
    { id: 'today', label: 'Today', getRange: () => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
        const from = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { from, to: from };
    }},
    { id: 'yesterday', label: 'Yesterday', getRange: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
        const from = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { from, to: from };
    }},
    { id: 'this_week', label: 'This Week', getRange: () => {
        const d = new Date();
        const day = d.getDay();
        const sun = new Date(d); sun.setDate(d.getDate() - day);
        const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
        const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { from: fmt(sun), to: fmt(sat) };
    }},
    { id: 'this_month', label: 'This Month', getRange: () => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth();
        const last = new Date(y, m + 1, 0);
        const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
        return { from, to };
    }},
];

const formatCurrency = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '\u20B90';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(num);
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DailySettlement = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [totals, setTotals] = useState({ commission: 0, paidCommission: 0, unpaidCommission: 0 });
    const [bookies, setBookies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingKey, setUpdatingKey] = useState('');
    const [dateRange, setDateRange] = useState(() => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { startDate: today, endDate: today };
    });
    const [activePreset, setActivePreset] = useState('today');
    const [bookieFilter, setBookieFilter] = useState('');
    const [bookieSearch, setBookieSearch] = useState('');
    const [dayEndModal, setDayEndModal] = useState({ show: false, dateLabel: '', bookieName: '' });
    const [errorModal, setErrorModal] = useState({ show: false, message: '' });

    const openDayEndModal = (row) => {
        setDayEndModal({
            show: true,
            dateLabel: row?.date ? formatDate(row.date) : 'Today',
            bookieName: row?.bookieName || '',
        });
    };

    const applyPreset = (presetId) => {
        const preset = PRESETS.find((p) => p.id === presetId);
        if (preset) {
            const { from, to } = preset.getRange();
            setDateRange({ startDate: from, endDate: to });
            setActivePreset(presetId);
        }
    };

    const fetchDaily = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
            if (bookieFilter) params.set('bookieId', bookieFilter);
            const res = await adminFetch(`${API_BASE_URL}/settlements/daily?${params}`);
            const json = await res.json();
            if (json.success) {
                setRows(json.data?.rows || []);
                setTotals(json.data?.totals || { commission: 0, paidCommission: 0, unpaidCommission: 0 });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookies = async () => {
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/bookies`);
            const json = await res.json();
            if (json.success) {
                setBookies((json.data || []).filter((b) => (b.bookieType || 'admin_collects') === 'admin_collects'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchDaily();
    }, [dateRange.startDate, dateRange.endDate, bookieFilter]);

    useEffect(() => {
        fetchBookies();
    }, []);

    const handleTogglePaid = async (row) => {
        const newStatus = row.paymentStatus === 'paid' ? 'unpaid' : 'paid';
        if (newStatus === 'paid' && !row.canMarkPaid) {
            openDayEndModal(row);
            return;
        }
        const key = `${row.bookieId}_${row.date}`;
        setUpdatingKey(key);
        try {
            const res = await adminFetch(`${API_BASE_URL}/settlements/daily-status`, {
                method: 'PATCH',
                body: JSON.stringify({
                    bookieId: row.bookieId,
                    settlementDate: row.date,
                    status: newStatus,
                }),
            });
            const json = await res.json();
            if (json.success) fetchDaily();
            else if (json.message?.toLowerCase().includes('day ends') || json.message?.toLowerCase().includes('today')) {
                openDayEndModal(row);
            } else {
                setErrorModal({ show: true, message: json.message || 'Failed to update status' });
            }
        } catch {
            setErrorModal({ show: true, message: 'Network error. Please try again.' });
        } finally {
            setUpdatingKey('');
        }
    };

    const filteredRows = bookieSearch.trim()
        ? rows.filter((r) => {
            const q = bookieSearch.trim().toLowerCase();
            return (r.bookieName || '').toLowerCase().includes(q) || String(r.bookiePhone || '').includes(q);
        })
        : rows;

    return (
        <AdminLayout onLogout={() => { clearAdminAuth(); navigate('/'); }} title="Daily Settlement">
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <FaMoneyBillWave className="w-5 h-5 text-amber-500" />
                        Daily Settlement
                    </h1>
                    <span className="text-xs text-gray-500">Today stays unpaid until day ends (IST) · Past days can be marked paid</span>
                </div>

                <div className="bg-gray-800/80 rounded-lg border border-gray-700/80 p-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {PRESETS.map((p) => (
                            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                                className={`px-2 py-1 rounded text-xs font-medium ${activePreset === p.id ? 'bg-amber-500 text-black' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600'}`}
                            >{p.label}</button>
                        ))}
                        <input type="date" value={dateRange.startDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs w-[120px]"
                        />
                        <span className="text-gray-500 text-xs">to</span>
                        <input type="date" value={dateRange.endDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs w-[120px]"
                        />
                        <button type="button" onClick={fetchDaily} disabled={loading}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs disabled:opacity-50 flex items-center gap-1"
                        >
                            <FaSyncAlt className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                        <select value={bookieFilter} onChange={(e) => setBookieFilter(e.target.value)}
                            className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs min-w-[120px]"
                        >
                            <option value="">All Bookies</option>
                            {bookies.map((b) => (
                                <option key={b._id} value={b._id}>{b.username || '—'}</option>
                            ))}
                        </select>
                        <div className="relative w-[140px]">
                            <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                            <input type="text" value={bookieSearch} onChange={(e) => setBookieSearch(e.target.value)}
                                placeholder="Search bookie..." className="w-full pl-7 pr-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-sm font-bold">
                        Total commission: {formatCurrency(totals.commission)}
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm">
                        Paid: {formatCurrency(totals.paidCommission)}
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm">
                        Unpaid: {formatCurrency(totals.unpaidCommission)}
                    </div>
                </div>

                <div className="bg-gray-800/80 rounded-lg border border-gray-700/80 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
                    ) : filteredRows.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No records for this period</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-700/40 text-gray-400 text-[10px] uppercase">
                                        <th className="text-left px-3 py-2">Date</th>
                                        <th className="text-left px-2 py-2">Bookie</th>
                                        <th className="text-right px-2 py-2">Revenue</th>
                                        <th className="text-right px-2 py-2">Commission</th>
                                        <th className="text-center px-3 py-2">Payment</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/40">
                                    {filteredRows.map((row) => {
                                        const key = `${row.bookieId}_${row.date}`;
                                        const isZero = (Number(row.commission) || 0) === 0;
                                        const isPaid = row.paymentStatus === 'paid';
                                        const canMark = row.canMarkPaid === true;
                                        return (
                                            <tr key={key} className="hover:bg-gray-700/20">
                                                <td className="px-3 py-2 text-white text-xs">{formatDate(row.date)}</td>
                                                <td className="px-2 py-2">
                                                    <span className="font-medium text-white text-xs">{row.bookieName || '—'}</span>
                                                    {row.bookiePhone && <p className="text-[10px] text-gray-500">{row.bookiePhone}</p>}
                                                </td>
                                                <td className="px-2 py-2 text-right font-mono text-blue-400 text-xs">{formatCurrency(row.revenue)}</td>
                                                <td className="px-2 py-2 text-right font-mono font-bold text-orange-400 text-xs">{formatCurrency(row.commission)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    {isZero ? (
                                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                                                            Paid
                                                        </span>
                                                    ) : !canMark ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openDayEndModal(row)}
                                                            title="Day has not ended yet"
                                                            className="inline-block px-3 py-1 rounded-full text-xs font-semibold border bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                                                        >
                                                            Unpaid
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={updatingKey === key}
                                                            onClick={() => handleTogglePaid(row)}
                                                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50 ${
                                                                isPaid
                                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                                                                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                                                            }`}
                                                        >
                                                            {updatingKey === key ? '...' : isPaid ? 'Paid' : 'Unpaid'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {dayEndModal.show && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setDayEndModal({ show: false, dateLabel: '', bookieName: '' })}>
                    <div
                        className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-labelledby="day-end-modal-title"
                    >
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <FaClock className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h3 id="day-end-modal-title" className="text-lg font-bold text-white">
                                        Day not ended yet
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Cannot mark as paid</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDayEndModal({ show: false, dateLabel: '', bookieName: '' })}
                                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400"
                                aria-label="Close"
                            >
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3 text-sm text-gray-300">
                            {dayEndModal.bookieName && (
                                <p>
                                    <span className="text-gray-500">Bookie:</span>{' '}
                                    <span className="text-white font-medium">{dayEndModal.bookieName}</span>
                                </p>
                            )}
                            <p>
                                <span className="text-gray-500">Date:</span>{' '}
                                <span className="text-white font-medium">{dayEndModal.dateLabel}</span>
                            </p>
                            <p>
                                This day is still in progress. Players may place more bets, so the commission amount can still change.
                            </p>
                            <p className="text-amber-400/90">
                                You can mark this day as <strong className="text-amber-300">Paid</strong> after the day ends (after midnight IST).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDayEndModal({ show: false, dateLabel: '', bookieName: '' })}
                            className="mt-6 w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {errorModal.show && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setErrorModal({ show: false, message: '' })}>
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-2">Error</h3>
                        <p className="text-sm text-gray-300 mb-6">{errorModal.message}</p>
                        <button
                            type="button"
                            onClick={() => setErrorModal({ show: false, message: '' })}
                            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default DailySettlement;
