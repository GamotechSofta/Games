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
    FaEdit,
    FaTrash,
    FaTimes,
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
        const preset = PRESETS.find((p) => p.id === 'today');
        const { from, to } = preset ? preset.getRange() : getLastMonthRange();
        return { startDate: from, endDate: to };
    });
    const [activePreset, setActivePreset] = useState('today');
    const [confirming, setConfirming] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [editModal, setEditModal] = useState(null);

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

    const fetchSettlements = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
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
                await fetchSettlements(true);
                if (bookieType === 'admin_collects') await fetchDailyCommission();
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
                await fetchSettlements(true);
                if (bookieType === 'admin_collects') await fetchDailyCommission();
            } else {
                alert(json.message || 'Failed');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setConfirming(null);
        }
    };

    const handleUpdate = async () => {
        if (!editModal || editModal.amount === '' || editModal.amount < 0) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settlements/${editModal._id}`, {
                method: 'PATCH',
                headers: getBookieAuthHeaders(),
                body: JSON.stringify({
                    amount: Number(editModal.amount),
                    remarks: editModal.remarks || '',
                }),
            });
            const json = await res.json();
            if (json.success) {
                setEditModal(null);
                await fetchSettlements(true);
                if (bookieType === 'admin_collects') await fetchDailyCommission();
            } else {
                alert(json.message || 'Failed');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this request?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/settlements/${id}`, {
                method: 'DELETE',
                headers: getBookieAuthHeaders(),
            });
            const json = await res.json();
            if (json.success) {
                await fetchSettlements(true);
                if (bookieType === 'admin_collects') await fetchDailyCommission();
            } else alert(json.message || 'Failed');
        } catch (err) {
            alert('Network error');
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
    const confirmButtonText = isAdminCollects ? 'I have received' : 'Payment Sent';

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
            <div className="max-w-[1600px] mx-auto min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <FaMoneyBillWave className="text-amber-500 w-5 h-5" />
                        Daily Settlement
                    </h1>
                    <span className={`text-xs px-2 py-1 rounded border ${isAdminCollects ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                        {isAdminCollects ? 'Request commission → Admin pays → You confirm' : 'Admin requests → You pay → Click Payment Sent'}
                    </span>
                </div>

                <div className="glass-panel p-3 rounded-lg border border-white/5">
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            ...PRESETS,
                            { id: 'last_month', label: 'Last Month', getRange: getLastMonthRange },
                        ].map((p) => (
                            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                                className={`px-2 py-1 rounded text-xs font-medium ${activePreset === p.id ? 'bg-amber-500 text-black' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                            >{p.label}</button>
                        ))}
                        <input type="date" value={dateRange.startDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded text-white text-xs w-[120px] focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-slate-500 text-xs">to</span>
                        <input type="date" value={dateRange.endDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded text-white text-xs w-[120px] focus:ring-1 focus:ring-amber-500"
                        />
                        <button type="button" onClick={() => { fetchSettlements(); if (bookieType === 'admin_collects') fetchDailyCommission(); }} disabled={loading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs disabled:opacity-50"
                        >
                            <FaSyncAlt className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>
                </div>

                {pendingSettlements.length > 0 && (
                    <div className="glass-panel rounded-lg p-3 border border-amber-500/30 bg-amber-500/5">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold text-amber-400">Pending ({pendingSettlements.length})</span>
                            {pendingSettlements.map((s) => (
                                <div key={s._id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                                    <span className="text-white text-xs">{formatDate(s.settlementDate)}</span>
                                    <span className="font-bold text-amber-400 text-sm">{formatCurrency(s.amount)}</span>
                                    <button type="button" onClick={() => handleConfirm(s._id)} disabled={confirming === s._id}
                                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs disabled:opacity-50"
                                    >
                                        {confirming === s._id ? '...' : confirmButtonText}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="px-3 py-1.5 rounded-lg font-bold text-base bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 w-fit">
                    Total: {formatCurrency(isAdminCollects ? dailyCommission.reduce((s, d) => s + d.commission, 0) : totalAmount)}
                </div>

                <div className="glass-panel rounded-lg overflow-hidden border border-white/5">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-2" />
                            Loading...
                        </div>
                    ) : isAdminCollects ? (
                        dailyCommission.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">No commission records for this period</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-[10px] uppercase">
                                            <th className="text-left px-3 py-2 font-medium">Date</th>
                                            <th className="text-right px-2 py-2 font-medium">Revenue</th>
                                            <th className="text-right px-2 py-2 font-medium">Commission</th>
                                            <th className="text-left px-2 py-2 font-medium">Status</th>
                                            <th className="text-right px-3 py-2 font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {dailyCommission.map((row) => {
                                            const s = settlementByDate[row.date];
                                            return (
                                                <tr key={row.date} className="hover:bg-white/5">
                                                    <td className="px-3 py-2 text-white">{formatDate(row.date)}</td>
                                                    <td className="px-2 py-2 text-right font-mono text-blue-400">{formatCurrency(row.betVolume)}</td>
                                                    <td className="px-2 py-2 text-right font-mono font-bold text-emerald-400">{formatCurrency(row.commission)}</td>
                                                    <td className="px-2 py-2">
                                                        {s ? (
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getStatusBadge(s.status)}`}>
                                                                {s.status === 'bookie_confirmed' ? 'Awaiting Admin' : s.status === 'payment_sent' ? 'Confirm' : s.status === 'pending' && isAdminCollects ? 'Awaiting' : s.status}
                                                            </span>
                                                        ) : <span className="text-slate-500">—</span>}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {s ? (
                                                            <>
                                                                {(s.status === 'payment_sent' || (s.status === 'pending' && !isAdminCollects)) && (
                                                                    <button type="button" onClick={() => handleConfirm(s._id)} disabled={confirming === s._id}
                                                                        className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-medium mr-1"
                                                                    >{confirming === s._id ? '...' : confirmButtonText}</button>
                                                                )}
                                                                {s.status === 'pending' && isAdminCollects && (
                                                                    <>
                                                                        <button type="button" onClick={() => setEditModal({ _id: s._id, amount: s.amount, remarks: s.remarks || '' })} className="p-1 rounded hover:bg-white/10 text-amber-400 inline-flex" title="Edit"><FaEdit className="w-3 h-3" /></button>
                                                                        <button type="button" onClick={() => handleDelete(s._id)} className="p-1 rounded hover:bg-red-500/20 text-red-400 inline-flex" title="Delete"><FaTrash className="w-3 h-3" /></button>
                                                                    </>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <button type="button" onClick={() => handleRequestMoney(row.date, row.commission)} disabled={submitting || row.commission <= 0}
                                                                className="px-1.5 py-0.5 rounded bg-amber-500 text-black text-[10px] font-semibold disabled:opacity-50"
                                                            >{submitting ? '...' : 'Request'}</button>
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
                        <div className="p-8 text-center text-slate-500 text-sm">No settlements for this period</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-[10px] uppercase">
                                        <th className="text-left px-3 py-2 font-medium">Date</th>
                                        <th className="text-right px-2 py-2 font-medium">Amount</th>
                                        <th className="text-left px-2 py-2 font-medium">Status</th>
                                        <th className="text-right px-3 py-2 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {settlements.map((s) => (
                                        <tr key={s._id} className="hover:bg-white/5">
                                            <td className="px-3 py-2 text-white">{formatDate(s.settlementDate)}</td>
                                            <td className="px-2 py-2 text-right font-mono font-bold text-purple-400">{formatCurrency(s.amount)}</td>
                                            <td className="px-2 py-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getStatusBadge(s.status)}`}>
                                                    {s.status === 'bookie_confirmed' ? 'Awaiting Admin' : s.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {s.status === 'pending' && (
                                                    <button type="button" onClick={() => handleConfirm(s._id)} disabled={confirming === s._id}
                                                        className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-medium"
                                                    >{confirming === s._id ? '...' : confirmButtonText}</button>
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

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl border border-white/10 w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Edit Request</h3>
                            <button type="button" onClick={() => setEditModal(null)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400"><FaTimes className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Amount (Rs) *</label>
                                <input type="number" min="0" step="0.01" value={editModal.amount} onChange={(e) => setEditModal((m) => ({ ...m, amount: e.target.value }))} className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Remarks</label>
                                <input type="text" value={editModal.remarks} onChange={(e) => setEditModal((m) => ({ ...m, remarks: e.target.value }))} className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setEditModal(null)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium">Cancel</button>
                            <button type="button" onClick={handleUpdate} disabled={submitting} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg disabled:opacity-50">{submitting ? 'Saving...' : 'Update'}</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default DailySettlement;
