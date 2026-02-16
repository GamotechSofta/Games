import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import {
    FaMoneyBillWave,
    FaCalendarAlt,
    FaSyncAlt,
    FaHandHoldingUsd,
    FaBuilding,
    FaCheckCircle,
} from 'react-icons/fa';

const PRESETS = [
    { id: 'today', label: 'Today', getRange: () => {
        const d = new Date();
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
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getLastMonthRange = () => {
    const d = new Date();
    const to = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fromD = new Date(d);
    fromD.setMonth(fromD.getMonth() - 1);
    const from = `${fromD.getFullYear()}-${String(fromD.getMonth() + 1).padStart(2, '0')}-${String(fromD.getDate()).padStart(2, '0')}`;
    return { from, to };
};

const DailySettlement = () => {
    const [settlements, setSettlements] = useState([]);
    const [dailyCommission, setDailyCommission] = useState([]);
    const [bookieType, setBookieType] = useState('');
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState(() => {
        const { from, to } = getLastMonthRange();
        return { startDate: from, endDate: to };
    });
    const [activePreset, setActivePreset] = useState('last_month');
    const [confirming, setConfirming] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const bookie = JSON.parse(localStorage.getItem('bookie') || '{}');
        setBookieType(bookie.bookieType || 'admin_collects');
    }, []);

    const applyPreset = (presetId) => {
        const preset = PRESETS.find((p) => p.id === presetId);
        if (preset) {
            const { from, to } = preset.getRange();
            setDateRange({ startDate: from, endDate: to });
            setActivePreset(presetId);
        } else if (presetId === 'last_month') {
            const { from, to } = getLastMonthRange();
            setDateRange({ startDate: from, endDate: to });
            setActivePreset('last_month');
        }
    };

    const fetchSettlements = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
            const res = await fetch(`${API_BASE_URL}/settlements?${params}`, { headers: getBookieAuthHeaders() });
            const json = await res.json();
            if (json.success) setSettlements(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDailyCommission = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/reports/commission-daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
                headers: getBookieAuthHeaders(),
            });
            const json = await res.json();
            if (json.success) setDailyCommission(json.data?.dailyBreakdown || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSettlements();
    }, [dateRange.startDate, dateRange.endDate]);

    useEffect(() => {
        if (bookieType === 'admin_collects') fetchDailyCommission();
    }, [dateRange.startDate, dateRange.endDate, bookieType]);

    const handleRequestMoney = async (date, amount) => {
        if (!date || amount == null || amount < 0) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settlements`, {
                method: 'POST',
                headers: getBookieAuthHeaders(),
                body: JSON.stringify({
                    settlementDate: date,
                    amount: Number(amount),
                    remarks: '',
                }),
            });
            const json = await res.json();
            if (json.success) {
                fetchSettlements();
            } else {
                alert(json.message || 'Failed');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirm = async (id) => {
        setConfirming(id);
        try {
            const res = await fetch(`${API_BASE_URL}/settlements/${id}/confirm`, {
                method: 'POST',
                headers: getBookieAuthHeaders(),
            });
            const json = await res.json();
            if (json.success) {
                fetchSettlements();
            } else {
                alert(json.message || 'Failed');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setConfirming(null);
        }
    };

    const totalAmount = settlements.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const isAdminCollects = bookieType === 'admin_collects';
    const settlementByDate = {};
    settlements.forEach((s) => {
        const key = new Date(s.settlementDate).toISOString().slice(0, 10);
        settlementByDate[key] = s;
    });
    // Admin Collects: bookie can confirm "I have received" only when payment_sent (admin has sent payment)
    // Bookie Collects: bookie can confirm "I have paid" when pending
    const pendingSettlements = settlements.filter((s) =>
        isAdminCollects ? s.status === 'payment_sent' : s.status === 'pending'
    );
    const confirmButtonText = isAdminCollects ? 'I have received' : 'I have paid';

    const getStatusBadge = (status) => {
        const map = {
            pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            payment_sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            bookie_confirmed: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        return map[status] || 'bg-slate-500/20 text-slate-400';
    };

    return (
        <Layout title="Daily Settlement">
            <div className="max-w-[1600px] mx-auto min-w-0">
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3 mb-2">
                        <FaMoneyBillWave className="text-amber-500" />
                        Daily Payment Settlement
                    </h1>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border ${
                        isAdminCollects
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}>
                        {isAdminCollects ? (
                            <>
                                <FaHandHoldingUsd className="w-3.5 h-3.5" />
                                Admin Collects — Request commission per day. Admin sends payment → Click &quot;I have received&quot; to confirm
                            </>
                        ) : (
                            <>
                                <FaBuilding className="w-3.5 h-3.5" />
                                Bookie Collects — Platform charge to Admin. Click &quot;I have paid&quot; after you pay
                            </>
                        )}
                    </div>
                </div>

                {/* Date filters */}
                <div className="glass-panel p-4 rounded-2xl mb-8 border border-white/5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <FaCalendarAlt className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-400">Period</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {[
                            ...PRESETS,
                            { id: 'last_month', label: 'Last Month', getRange: getLastMonthRange },
                        ].map((p) => (
                            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    activePreset === p.id ? 'bg-amber-500 text-black' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                                }`}
                            >{p.label}</button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <input type="date" value={dateRange.startDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                            className="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-slate-500 text-sm">to</span>
                        <input type="date" value={dateRange.endDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                            className="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500"
                        />
                        <button type="button" onClick={() => { fetchSettlements(); if (bookieType === 'admin_collects') fetchDailyCommission(); }} disabled={loading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
                        >
                            <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Pending requests - highlight */}
                {pendingSettlements.length > 0 && (
                    <div className="glass-panel rounded-2xl p-6 mb-6 border border-amber-500/30 bg-amber-500/5">
                        <h3 className="text-sm font-bold text-amber-400 mb-3">Pending Requests ({pendingSettlements.length})</h3>
                        <p className="text-xs text-slate-400 mb-4">
                            {isAdminCollects
                                ? 'Admin has sent payment. Click &quot;I have received&quot; to confirm receipt.'
                                : 'Admin has requested platform charge. After you pay, click &quot;I have paid&quot;.'}
                        </p>
                        <div className="space-y-3">
                            {pendingSettlements.map((s) => (
                                <div key={s._id} className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">{formatDate(s.settlementDate)}</p>
                                        <p className="text-lg font-bold text-amber-400">{formatCurrency(s.amount)}</p>
                                        {s.remarks && <p className="text-xs text-slate-500 mt-1">{s.remarks}</p>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleConfirm(s._id)}
                                        disabled={confirming === s._id}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
                                    >
                                        {confirming === s._id ? (
                                            <span className="animate-spin">...</span>
                                        ) : (
                                            <>
                                                <FaCheckCircle className="w-4 h-4" /> {confirmButtonText}
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                <div className="px-4 py-2 rounded-xl font-bold text-lg mb-6 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Total: {formatCurrency(isAdminCollects ? dailyCommission.reduce((s, d) => s + d.commission, 0) : totalAmount)}
                </div>

                {/* Table - Admin Collects: daily records with Request per row */}
                <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                            Loading...
                        </div>
                    ) : isAdminCollects ? (
                        dailyCommission.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <FaMoneyBillWave className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p>No commission records for this period</p>
                                <p className="text-sm mt-1">Commission appears when your users place bets</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                            <th className="text-left px-4 py-3 font-medium">Date</th>
                                            <th className="text-right px-3 py-3 font-medium">Revenue</th>
                                            <th className="text-right px-3 py-3 font-medium">Commission</th>
                                            <th className="text-left px-3 py-3 font-medium">Status</th>
                                            <th className="text-right px-4 py-3 font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {dailyCommission.map((row) => {
                                            const s = settlementByDate[row.date];
                                            return (
                                                <tr key={row.date} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-white">{formatDate(row.date)}</td>
                                                    <td className="px-3 py-3 text-right font-mono text-blue-400">{formatCurrency(row.betVolume)}</td>
                                                    <td className="px-3 py-3 text-right font-mono font-bold text-emerald-400">
                                                        {formatCurrency(row.commission)}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {s ? (
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(s.status)}`}>
                                                                {s.status === 'bookie_confirmed' ? 'Awaiting Admin' : s.status === 'payment_sent' ? 'Confirm Receipt' : s.status === 'pending' && isAdminCollects ? 'Awaiting Admin' : s.status}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {s ? (
                                                            (s.status === 'payment_sent' || (s.status === 'pending' && !isAdminCollects)) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleConfirm(s._id)}
                                                                    disabled={confirming === s._id}
                                                                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium text-xs"
                                                                >
                                                                    {confirming === s._id ? '...' : confirmButtonText}
                                                                </button>
                                                            )
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRequestMoney(row.date, row.commission)}
                                                                disabled={submitting || row.commission <= 0}
                                                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs disabled:opacity-50"
                                                            >
                                                                {submitting ? '...' : 'Request'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : settlements.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <FaMoneyBillWave className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p>No settlements for this period</p>
                            <p className="text-sm mt-1">Admin will add settlement requests when applicable</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                        <th className="text-left px-4 py-3 font-medium">Date</th>
                                        <th className="text-right px-3 py-3 font-medium">Amount</th>
                                        <th className="text-left px-3 py-3 font-medium">Status</th>
                                        <th className="text-right px-4 py-3 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {settlements.map((s) => (
                                        <tr key={s._id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-white">{formatDate(s.settlementDate)}</td>
                                            <td className="px-3 py-3 text-right font-mono font-bold text-purple-400">{formatCurrency(s.amount)}</td>
                                            <td className="px-3 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(s.status)}`}>
                                                    {s.status === 'bookie_confirmed' ? 'Awaiting Admin' : s.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {s.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleConfirm(s._id)}
                                                        disabled={confirming === s._id}
                                                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium text-xs"
                                                    >
                                                        {confirming === s._id ? '...' : confirmButtonText}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

        </Layout>
    );
};

export default DailySettlement;
