import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FaMoneyBillWave,
    FaCalendarAlt,
    FaSyncAlt,
    FaPlus,
    FaHandHoldingUsd,
    FaBuilding,
    FaEdit,
    FaTrash,
    FaTimes,
    FaCheck,
    FaChartBar,
} from 'react-icons/fa';
import { getAdminAuthHeaders, clearAdminAuth, API_BASE_URL } from '../utils/api';

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
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TABS = [
    { id: 'admin_collects', label: 'Admin Collects', icon: FaHandHoldingUsd, color: 'emerald', desc: 'Bookie requests commission -> Admin pays & clicks Payment Sent -> Bookie confirms I have received (auto-approved)' },
    { id: 'bookie_collects', label: 'Bookie Collects', icon: FaBuilding, color: 'purple', desc: 'Admin requests platform charge from Bookie. Date-wise table (revenue + amount due per date) -> Create Request -> Bookie pays -> I have paid -> Admin Accept/Reject' },
];

const DailySettlement = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const validTab = tabFromUrl === 'bookie_collects' ? 'bookie_collects' : 'admin_collects';
    const [activeTab, setActiveTab] = useState(validTab);

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t === 'bookie_collects' || t === 'admin_collects') {
            setActiveTab(t);
        }
    }, [searchParams]);
    const [settlements, setSettlements] = useState([]);
    const [revenueData, setRevenueData] = useState(null);
    const [bookies, setBookies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState(() => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
        const today = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { startDate: today, endDate: today };
    });
    const [activePreset, setActivePreset] = useState('today');
    const [addModal, setAddModal] = useState(false);
    const [editModal, setEditModal] = useState(null);
    const [verifyModal, setVerifyModal] = useState(null);
    const [formData, setFormData] = useState({ bookieId: '', settlementDate: '', amount: '', remarks: '' });
    const [submitting, setSubmitting] = useState(false);

    const applyPreset = (presetId) => {
        const preset = PRESETS.find((p) => p.id === presetId);
        if (preset) {
            const { from, to } = preset.getRange();
            setDateRange({ startDate: from, endDate: to });
            setActivePreset(presetId);
        }
    };

    const fetchSettlements = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                bookieType: activeTab,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            });
            const res = await fetch(`${API_BASE_URL}/settlements?${params}`, { headers: getAdminAuthHeaders() });
            const json = await res.json();
            if (json.success) setSettlements(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRevenue = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/reports/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
                headers: getAdminAuthHeaders(),
            });
            const json = await res.json();
            if (json.success) setRevenueData(json.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchBookies = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/bookies`, { headers: getAdminAuthHeaders() });
            const json = await res.json();
            if (json.success) {
                const list = json.data || [];
                setBookies(activeTab === 'admin_collects'
                    ? list.filter((b) => (b.bookieType || 'admin_collects') === 'admin_collects')
                    : list.filter((b) => b.bookieType === 'bookie_collects'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSettlements();
    }, [activeTab, dateRange.startDate, dateRange.endDate]);

    const [dailyBreakdown, setDailyBreakdown] = useState([]);
    const [adminCollectsRevenue, setAdminCollectsRevenue] = useState([]);

    const fetchDailyBreakdown = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/reports/revenue/daily-breakdown?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
                headers: getAdminAuthHeaders(),
            });
            const json = await res.json();
            if (json.success) setDailyBreakdown(json.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAdminCollectsDailyBreakdown = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/reports/revenue/admin-collects-daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
                headers: getAdminAuthHeaders(),
            });
            const json = await res.json();
            if (json.success) setAdminCollectsRevenue(json.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === 'bookie_collects') {
            fetchRevenue();
            fetchDailyBreakdown();
        }
        if (activeTab === 'admin_collects') {
            fetchAdminCollectsDailyBreakdown();
        }
    }, [activeTab, dateRange.startDate, dateRange.endDate]);

    useEffect(() => {
        fetchBookies();
    }, [activeTab]);

    const handleAdd = async () => {
        if (!formData.bookieId || !formData.settlementDate || formData.amount === '' || formData.amount < 0) {
            alert('Please fill Bookie, Date and Amount');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settlements`, {
                method: 'POST',
                headers: getAdminAuthHeaders(),
                body: JSON.stringify({
                    bookieId: formData.bookieId,
                    bookieType: activeTab,
                    settlementDate: formData.settlementDate,
                    amount: Number(formData.amount),
                    remarks: formData.remarks || '',
                }),
            });
            const json = await res.json();
            if (json.success) {
                setAddModal(false);
                setFormData({ bookieId: '', settlementDate: '', amount: '', remarks: '' });
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

    const handleUpdate = async () => {
        if (!editModal || editModal.amount === '' || editModal.amount < 0) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settlements/${editModal._id}`, {
                method: 'PATCH',
                headers: getAdminAuthHeaders(),
                body: JSON.stringify({
                    amount: Number(editModal.amount),
                    remarks: editModal.remarks || '',
                }),
            });
            const json = await res.json();
            if (json.success) {
                setEditModal(null);
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

    const handleDelete = async (id) => {
        if (!confirm('Delete this settlement?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/settlements/${id}`, {
                method: 'DELETE',
                headers: getAdminAuthHeaders(),
            });
            const json = await res.json();
            if (json.success) fetchSettlements();
            else alert(json.message || 'Failed');
        } catch (err) {
            alert('Network error');
        }
    };

    const handleApprove = async () => {
        if (!verifyModal) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settlements/${verifyModal._id}/approve`, {
                method: 'POST',
                headers: getAdminAuthHeaders(),
                body: JSON.stringify({ adminRemarks: verifyModal.adminRemarks || '' }),
            });
            const json = await res.json();
            if (json.success) {
                setVerifyModal(null);
                fetchSettlements();
            } else alert(json.message || 'Failed');
        } catch (err) {
            alert('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!verifyModal) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settlements/${verifyModal._id}/reject`, {
                method: 'POST',
                headers: getAdminAuthHeaders(),
                body: JSON.stringify({ adminRemarks: verifyModal.adminRemarks || 'Rejected' }),
            });
            const json = await res.json();
            if (json.success) {
                setVerifyModal(null);
                fetchSettlements();
            } else alert(json.message || 'Failed');
        } catch (err) {
            alert('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    // Day-wise totals for Admin Collects
    const dayWiseTotals = {};
    settlements.forEach((s) => {
        const key = new Date(s.settlementDate).toISOString().slice(0, 10);
        dayWiseTotals[key] = (dayWiseTotals[key] || 0) + (Number(s.amount) || 0);
    });
    const dayWiseList = Object.entries(dayWiseTotals).sort((a, b) => b[0].localeCompare(a[0]));

    const totalAmount = settlements.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const bookieCollectsBookies = revenueData?.bookies?.filter((b) => b.bookieType === 'bookie_collects') || [];

    // Map: bookieId_date -> revenue for Admin Collects table
    const revenueMap = {};
    if (activeTab === 'admin_collects') {
        adminCollectsRevenue.forEach((b) => {
            const bid = b.bookieId?._id?.toString?.() || b.bookieId?.toString?.() || '';
            (b.dailyBreakdown || []).forEach((d) => {
                revenueMap[`${bid}_${d.date}`] = d.revenue;
            });
        });
    }
    const amountLabel = activeTab === 'admin_collects' ? 'Amount (Admin gives to Bookie)' : 'Amount (Bookie pays to Admin)';

    const getStatusBadge = (status) => {
        const map = {
            pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            payment_sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            bookie_confirmed: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        return map[status] || 'bg-gray-500/20 text-gray-400';
    };

    const handlePaymentSent = async (id) => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settlements/${id}/payment-sent`, {
                method: 'POST',
                headers: getAdminAuthHeaders(),
            });
            const json = await res.json();
            if (json.success) {
                fetchSettlements();
            } else alert(json.message || 'Failed');
        } catch (err) {
            alert('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminLayout onLogout={() => { clearAdminAuth(); navigate('/'); }} title="Daily Settlement">
            <div className="space-y-4 sm:space-y-6">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <FaMoneyBillWave className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 shrink-0" />
                        Daily Payment Settlement
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Manage payments Given and Received — separate for Admin Collects and Bookie Collects</p>
                </div>

                {/* Date filters */}
                <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-3 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <FaCalendarAlt className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-300">Period</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
                        {PRESETS.map((p) => (
                            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                    activePreset === p.id ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >{p.label}</button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <input type="date" value={dateRange.startDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 w-[130px] sm:w-auto"
                        />
                        <span className="text-gray-500 text-sm">to</span>
                        <input type="date" value={dateRange.endDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 w-[130px] sm:w-auto"
                        />
                        <button type="button" onClick={() => { fetchSettlements(); if (activeTab === 'bookie_collects') { fetchRevenue(); fetchDailyBreakdown(); } else if (activeTab === 'admin_collects') { fetchAdminCollectsDailyBreakdown(); } }} disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 text-xs sm:text-sm"
                        >
                            <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const colorMap = {
                            emerald: isActive ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600',
                            purple: isActive ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600',
                        };
                        return (
                            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchParams({ tab: tab.id }); }}
                                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all ${colorMap[tab.color]}`}
                            >
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-gray-500 -mt-2">{TABS.find((t) => t.id === activeTab)?.desc}</p>

                {/* ADMIN COLLECTS TAB */}
                {activeTab === 'admin_collects' && (
                    <>
                        {/* Day-wise totals */}
                        {dayWiseList.length > 0 && (
                            <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-4">
                                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    <FaChartBar className="w-4 h-4 text-amber-500" /> Day-wise Total
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {dayWiseList.map(([date, amt]) => (
                                        <div key={date} className="bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-600/50">
                                            <p className="text-xs text-gray-400">{formatDate(date)}</p>
                                            <p className="text-sm font-bold text-orange-400">{formatCurrency(amt)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="px-4 py-2 rounded-xl font-bold text-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                Total: {formatCurrency(totalAmount)}
                            </div>
                        </div>

                        {/* Settlements table - Bookie requests (admin_collects) */}
                        <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
                            {loading ? (
                                <div className="p-12 text-center text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />Loading...</div>
                            ) : settlements.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <FaMoneyBillWave className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <p>No requests for this period</p>
                                    <p className="text-sm mt-1">Bookie creates requests when they need commission</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-700/40 text-gray-400 text-[11px] uppercase tracking-wider">
                                                <th className="text-left px-4 py-3 font-medium">Date</th>
                                                <th className="text-left px-3 py-3 font-medium">Bookie</th>
                                                <th className="text-right px-3 py-3 font-medium">Revenue</th>
                                                <th className="text-right px-3 py-3 font-medium">Amount</th>
                                                <th className="text-left px-3 py-3 font-medium">Status</th>
                                                <th className="text-left px-3 py-3 font-medium">Remarks</th>
                                                <th className="text-right px-4 py-3 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/40">
                                            {settlements.map((s) => {
                                                const dateStr = s.settlementDate ? new Date(s.settlementDate).toISOString().slice(0, 10) : '';
                                                const bid = s.bookieId?._id?.toString?.() || s.bookieId?.toString?.() || '';
                                                const revenue = revenueMap[`${bid}_${dateStr}`];
                                                return (
                                                <tr key={s._id} className="hover:bg-gray-700/20 transition-colors">
                                                    <td className="px-4 py-3 text-white">{formatDate(s.settlementDate)}</td>
                                                    <td className="px-3 py-3">
                                                        <div>
                                                            <span className="font-medium text-white">{s.bookieId?.username || '—'}</span>
                                                            {s.bookieId?.phone && <p className="text-[11px] text-gray-500">{s.bookieId.phone}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-mono text-blue-400">{revenue != null ? formatCurrency(revenue) : '—'}</td>
                                                    <td className="px-3 py-3 text-right font-mono font-bold text-orange-400">{formatCurrency(s.amount)}</td>
                                                    <td className="px-3 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(s.status)}`}>
                                                            {s.status === 'payment_sent' ? 'Awaiting Bookie' : s.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-gray-400 max-w-[120px] truncate">{s.remarks || '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {s.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => handlePaymentSent(s._id)} disabled={submitting} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30">Payment Sent</button>
                                                                    <button onClick={() => setVerifyModal({ _id: s._id, amount: s.amount, bookie: s.bookieId?.username, adminRemarks: 'Declined', action: 'reject' })} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30">Decline</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* BOOKIE COLLECTS TAB */}
                {activeTab === 'bookie_collects' && (
                    <>
                        {/* Date-wise table per bookie: Revenue + Amount to Pay */}
                        <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden">
                            <h3 className="px-4 py-3 border-b border-gray-700/80 text-sm font-semibold text-white flex items-center gap-2">
                                <FaChartBar className="w-4 h-4 text-purple-400" /> Date-wise — Revenue & Amount to Pay (per bookie)
                            </h3>
                            {dailyBreakdown.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No Bookie Collects bookies with data</div>
                            ) : (
                                <div className="divide-y divide-gray-700/40">
                                    {dailyBreakdown.map((b) => (
                                        <div key={b.bookieId} className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="font-semibold text-white">{b.bookieName || '—'}</span>
                                                <span className="text-xs text-gray-500">Total: {formatCurrency(b.totalRevenue)} | Due: {formatCurrency(b.totalAmountDue)}</span>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-gray-400 text-[11px] uppercase">
                                                            <th className="text-left py-2 font-medium">Date</th>
                                                            <th className="text-right py-2 font-medium">Revenue</th>
                                                            <th className="text-right py-2 font-medium">Amount to Pay</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-700/30">
                                                        {b.dailyBreakdown.map((d) => (
                                                            <tr key={d.date} className="hover:bg-gray-700/20">
                                                                <td className="py-2 text-white">{formatDate(d.date)}</td>
                                                                <td className="py-2 text-right font-mono text-blue-400">{formatCurrency(d.revenue)}</td>
                                                                <td className="py-2 text-right font-mono font-bold text-emerald-400">{formatCurrency(d.amountDue)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Settlement + List */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                            <div className="px-4 py-2 rounded-xl font-bold text-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Settlements Total: {formatCurrency(totalAmount)}
                            </div>
                            <button
                                type="button"
                                onClick={() => { setFormData({ bookieId: '', settlementDate: dateRange.startDate, amount: '', remarks: '' }); setAddModal(true); }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors text-sm"
                            >
                                <FaPlus className="w-4 h-4" /> Add Settlement
                            </button>
                        </div>

                        <div className="bg-gray-800/80 rounded-xl border border-gray-700/80 overflow-hidden mt-4">
                            <h3 className="px-4 py-3 border-b border-gray-700/80 text-sm font-semibold text-white">Settlement Requests</h3>
                            {settlements.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No settlements. Add to send request to bookie.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-700/40 text-gray-400 text-[11px] uppercase tracking-wider">
                                                <th className="text-left px-4 py-3 font-medium">Date</th>
                                                <th className="text-left px-3 py-3 font-medium">Bookie</th>
                                                <th className="text-right px-3 py-3 font-medium">Amount</th>
                                                <th className="text-left px-3 py-3 font-medium">Status</th>
                                                <th className="text-right px-4 py-3 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/40">
                                            {settlements.map((s) => (
                                                <tr key={s._id} className="hover:bg-gray-700/20">
                                                    <td className="px-4 py-3 text-white">{formatDate(s.settlementDate)}</td>
                                                    <td className="px-3 py-3 font-medium text-white">{s.bookieId?.username || '—'}</td>
                                                    <td className="px-3 py-3 text-right font-mono font-bold text-emerald-400">{formatCurrency(s.amount)}</td>
                                                    <td className="px-3 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(s.status)}`}>
                                                            {s.status === 'bookie_confirmed' ? 'Awaiting Verify' : s.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {s.status === 'bookie_confirmed' && (
                                                            <>
                                                                <button onClick={() => setVerifyModal({ _id: s._id, amount: s.amount, bookie: s.bookieId?.username, adminRemarks: '' })} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-medium mr-1">Accept</button>
                                                                <button onClick={() => setVerifyModal({ _id: s._id, amount: s.amount, bookie: s.bookieId?.username, adminRemarks: 'Rejected' })} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium">Reject</button>
                                                            </>
                                                        )}
                                                        {s.status === 'pending' && (
                                                            <>
                                                                <button onClick={() => setEditModal({ _id: s._id, amount: s.amount, remarks: s.remarks || '' })} className="p-1.5 rounded-lg hover:bg-gray-600 text-amber-400 mr-1"><FaEdit className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => handleDelete(s._id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><FaTrash className="w-3.5 h-3.5" /></button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add Modal */}
            {addModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Add Settlement (Request goes to Bookie)</h3>
                            <button type="button" onClick={() => setAddModal(false)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400"><FaTimes className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Bookie *</label>
                                <select value={formData.bookieId} onChange={(e) => setFormData((f) => ({ ...f, bookieId: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500">
                                    <option value="">Select bookie</option>
                                    {bookies.map((b) => (
                                        <option key={b._id} value={b._id}>{b.username} {b.phone ? `(${b.phone})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Date *</label>
                                <input type="date" value={formData.settlementDate} onChange={(e) => setFormData((f) => ({ ...f, settlementDate: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Amount (Rs) *</label>
                                <input type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))} placeholder="0" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Remarks</label>
                                <input type="text" value={formData.remarks} onChange={(e) => setFormData((f) => ({ ...f, remarks: e.target.value }))} placeholder="Optional" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setAddModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">Cancel</button>
                            <button type="button" onClick={handleAdd} disabled={submitting} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg disabled:opacity-50">{submitting ? 'Saving...' : 'Add'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Edit Settlement</h3>
                            <button type="button" onClick={() => setEditModal(null)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400"><FaTimes className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Amount (Rs) *</label>
                                <input type="number" min="0" step="0.01" value={editModal.amount} onChange={(e) => setEditModal((m) => ({ ...m, amount: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Remarks</label>
                                <input type="text" value={editModal.remarks} onChange={(e) => setEditModal((m) => ({ ...m, remarks: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setEditModal(null)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">Cancel</button>
                            <button type="button" onClick={handleUpdate} disabled={submitting} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg disabled:opacity-50">{submitting ? 'Saving...' : 'Update'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Verify Modal (Accept/Reject) */}
            {verifyModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Verify Settlement</h3>
                            <button type="button" onClick={() => setVerifyModal(null)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400"><FaTimes className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                            <p className="text-sm text-gray-400">Bookie: <span className="text-white font-medium">{verifyModal.bookie}</span></p>
                            <p className="text-sm text-gray-400">Amount: <span className="text-amber-400 font-bold">{formatCurrency(verifyModal.amount)}</span></p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Remarks (optional)</label>
                            <input type="text" value={verifyModal.adminRemarks} onChange={(e) => setVerifyModal((m) => ({ ...m, adminRemarks: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="Optional notes" />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={handleApprove} disabled={submitting} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"><FaCheck /> Accept</button>
                            <button type="button" onClick={handleReject} disabled={submitting} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg disabled:opacity-50">Reject</button>
                            <button type="button" onClick={() => setVerifyModal(null)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default DailySettlement;
