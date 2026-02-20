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
    FaSearch,
    FaFilter,
} from 'react-icons/fa';
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
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TABS = [
    { id: 'admin_collects', label: 'Admin Collects', icon: FaHandHoldingUsd, color: 'emerald', desc: 'Bookie requests → You pay → Bookie confirms' },
    { id: 'bookie_collects', label: 'Bookie Collects', icon: FaBuilding, color: 'purple', desc: 'You request → Bookie pays → Bookie clicks Payment Sent → You click Yes I have received' },
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
    const [bookieFilter, setBookieFilter] = useState('');
    const [bookieSearch, setBookieSearch] = useState('');
    const [bookieCollectsFilter, setBookieCollectsFilter] = useState('');
    const [bookieCollectsSearch, setBookieCollectsSearch] = useState('');

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
            if (activeTab === 'admin_collects' && bookieFilter) {
                params.set('bookieId', bookieFilter);
            }
            const res = await adminFetch(`${API_BASE_URL}/settlements?${params}`);
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
            const res = await adminFetch(`${API_BASE_URL}/reports/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
            const json = await res.json();
            if (json.success) setRevenueData(json.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchBookies = async () => {
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/bookies`);
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
    }, [activeTab, dateRange.startDate, dateRange.endDate, bookieFilter]);

    const [dailyBreakdown, setDailyBreakdown] = useState([]);
    const [adminCollectsRevenue, setAdminCollectsRevenue] = useState([]);

    const fetchDailyBreakdown = async () => {
        try {
            const res = await adminFetch(`${API_BASE_URL}/reports/revenue/daily-breakdown?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
            const json = await res.json();
            if (json.success) setDailyBreakdown(json.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAdminCollectsDailyBreakdown = async () => {
        try {
            const res = await adminFetch(`${API_BASE_URL}/reports/revenue/admin-collects-daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
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

    useEffect(() => {
        if (activeTab !== 'admin_collects') {
            setBookieFilter('');
            setBookieSearch('');
        }
        if (activeTab !== 'bookie_collects') {
            setBookieCollectsFilter('');
            setBookieCollectsSearch('');
        }
    }, [activeTab]);

    const handleAdd = async () => {
        if (!formData.bookieId || !formData.settlementDate || formData.amount === '' || formData.amount < 0) {
            alert('Please fill Bookie, Date and Amount');
            return;
        }
        setSubmitting(true);
        try {
            const res = await adminFetch(`${API_BASE_URL}/settlements`, {
                method: 'POST',
                body: JSON.stringify({
                    bookieId: formData.bookieId,
                    bookieType: 'bookie_collects',
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

    const handleRequestBookieCollects = async (bookieId, date, amount) => {
        if (!bookieId || !date || amount <= 0) return;
        setSubmitting(true);
        try {
            const res = await adminFetch(`${API_BASE_URL}/settlements`, {
                method: 'POST',
                body: JSON.stringify({
                    bookieId,
                    bookieType: 'bookie_collects',
                    settlementDate: date,
                    amount: Number(amount),
                    remarks: '',
                }),
            });
            const json = await res.json();
            if (json.success) fetchSettlements();
            else alert(json.message || 'Failed');
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
            const res = await adminFetch(`${API_BASE_URL}/settlements/${editModal._id}`, {
                method: 'PATCH',
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
            const res = await adminFetch(`${API_BASE_URL}/settlements/${id}`, {
                method: 'DELETE',
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
            const res = await adminFetch(`${API_BASE_URL}/settlements/${verifyModal._id}/approve`, {
                method: 'POST',
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
            const res = await adminFetch(`${API_BASE_URL}/settlements/${verifyModal._id}/reject`, {
                method: 'POST',
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

    // Admin Collects: filter by search (bookie name/phone)
    const adminCollectsFiltered = activeTab === 'admin_collects' && bookieSearch.trim()
        ? settlements.filter((s) => {
            const name = (s.bookieId?.username || '').toLowerCase();
            const phone = String(s.bookieId?.phone || '');
            const q = bookieSearch.trim().toLowerCase();
            return name.includes(q) || phone.includes(q);
        })
        : settlements;

    // Day-wise totals for Admin Collects
    const dayWiseTotals = {};
    adminCollectsFiltered.forEach((s) => {
        const key = new Date(s.settlementDate).toISOString().slice(0, 10);
        dayWiseTotals[key] = (dayWiseTotals[key] || 0) + (Number(s.amount) || 0);
    });
    const dayWiseList = Object.entries(dayWiseTotals).sort((a, b) => b[0].localeCompare(a[0]));

    const totalAmount = (activeTab === 'admin_collects' ? adminCollectsFiltered : settlements).reduce((s, x) => s + (Number(x.amount) || 0), 0);
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
            const res = await adminFetch(`${API_BASE_URL}/settlements/${id}/payment-sent`, {
                method: 'POST',
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
            <div className="space-y-3">
                {/* Compact header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <FaMoneyBillWave className="w-5 h-5 text-amber-500" />
                        Daily Settlement
                    </h1>
                    <span className="text-xs text-gray-500">{TABS.find((t) => t.id === activeTab)?.desc}</span>
                </div>

                {/* All controls in one card */}
                <div className="bg-gray-800/80 rounded-lg border border-gray-700/80 p-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {/* Tabs first */}
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchParams({ tab: tab.id }); }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                        isActive ? (tab.color === 'emerald' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-purple-600 text-white border-purple-500')
                                            : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:border-gray-500'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                        <span className="hidden sm:inline w-px h-6 bg-gray-600" />
                        {/* Date presets */}
                        {PRESETS.map((p) => (
                            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                    activePreset === p.id ? 'bg-amber-500 text-black' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600'
                                }`}
                            >{p.label}</button>
                        ))}
                        <input type="date" value={dateRange.startDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs w-[120px] focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-gray-500 text-xs">to</span>
                        <input type="date" value={dateRange.endDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs w-[120px] focus:ring-1 focus:ring-amber-500"
                        />
                        <button type="button" onClick={() => { fetchSettlements(); if (activeTab === 'bookie_collects') { fetchRevenue(); fetchDailyBreakdown(); } else if (activeTab === 'admin_collects') { fetchAdminCollectsDailyBreakdown(); } }} disabled={loading}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs disabled:opacity-50 flex items-center gap-1"
                        >
                            <FaSyncAlt className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                        {/* Admin Collects: Bookie filter & search inline */}
                        {activeTab === 'admin_collects' && (
                            <>
                                <span className="hidden sm:inline w-px h-6 bg-gray-600" />
                                <select value={bookieFilter} onChange={(e) => setBookieFilter(e.target.value)}
                                    className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs min-w-[120px] focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">All Bookies</option>
                                    {bookies.filter((b) => (b.bookieType || 'admin_collects') === 'admin_collects').map((b) => (
                                        <option key={b._id} value={b._id}>{b.username || '—'}</option>
                                    ))}
                                </select>
                                <div className="relative w-[140px] sm:w-[160px]">
                                    <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                                    <input type="text" value={bookieSearch} onChange={(e) => setBookieSearch(e.target.value)}
                                        placeholder="Search..." className="w-full pl-7 pr-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs placeholder-gray-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                            </>
                        )}
                        {activeTab === 'bookie_collects' && (
                            <>
                                <span className="hidden sm:inline w-px h-6 bg-gray-600" />
                                <select value={bookieCollectsFilter} onChange={(e) => setBookieCollectsFilter(e.target.value)}
                                    className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs min-w-[120px] focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">All Bookies</option>
                                    {bookies.filter((b) => b.bookieType === 'bookie_collects').map((b) => (
                                        <option key={b._id} value={b._id}>{b.username || '—'}</option>
                                    ))}
                                </select>
                                <div className="relative w-[140px] sm:w-[160px]">
                                    <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                                    <input type="text" value={bookieCollectsSearch} onChange={(e) => setBookieCollectsSearch(e.target.value)}
                                        placeholder="Search bookie..." className="w-full pl-7 pr-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs placeholder-gray-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ADMIN COLLECTS TAB */}
                {activeTab === 'admin_collects' && (
                    <>
                        {/* Compact summary row */}
                        <div className="flex flex-wrap items-center gap-2">
                            {dayWiseList.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {dayWiseList.slice(0, 6).map(([date, amt]) => (
                                        <div key={date} className="px-2.5 py-1 rounded bg-gray-700/50 border border-gray-600/50 flex items-center gap-2">
                                            <span className="text-xs text-gray-400">{formatDate(date)}</span>
                                            <span className="text-xs font-bold text-orange-400">{formatCurrency(amt)}</span>
                                        </div>
                                    ))}
                                    {dayWiseList.length > 6 && <span className="text-xs text-gray-500 py-1">+{dayWiseList.length - 6} more</span>}
                                </div>
                            )}
                            <div className="px-3 py-1.5 rounded-lg font-bold text-base bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                Total: {formatCurrency(totalAmount)}
                            </div>
                        </div>

                        {/* Settlements table */}
                        <div className="bg-gray-800/80 rounded-lg border border-gray-700/80 overflow-hidden">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400 text-sm"><div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-2" />Loading...</div>
                            ) : adminCollectsFiltered.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    <p>{settlements.length === 0 ? 'No requests for this period' : 'No matching bookies'}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-700/40 text-gray-400 text-[10px] uppercase tracking-wider">
                                                <th className="text-left px-3 py-2 font-medium">Date</th>
                                                <th className="text-left px-2 py-2 font-medium">Bookie</th>
                                                <th className="text-right px-2 py-2 font-medium">Revenue</th>
                                                <th className="text-right px-2 py-2 font-medium">Amount</th>
                                                <th className="text-left px-2 py-2 font-medium">Status</th>
                                                <th className="text-right px-3 py-2 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/40">
                                            {adminCollectsFiltered.map((s) => {
                                                const dateStr = s.settlementDate ? new Date(s.settlementDate).toISOString().slice(0, 10) : '';
                                                const bid = s.bookieId?._id?.toString?.() || s.bookieId?.toString?.() || '';
                                                const revenue = revenueMap[`${bid}_${dateStr}`];
                                                return (
                                                <tr key={s._id} className="hover:bg-gray-700/20 transition-colors">
                                                    <td className="px-3 py-2 text-white text-xs">{formatDate(s.settlementDate)}</td>
                                                    <td className="px-2 py-2">
                                                        <div>
                                                            <span className="font-medium text-white text-xs">{s.bookieId?.username || '—'}</span>
                                                            {s.bookieId?.phone && <p className="text-[10px] text-gray-500">{s.bookieId.phone}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-mono text-blue-400 text-xs">{revenue != null ? formatCurrency(revenue) : '—'}</td>
                                                    <td className="px-2 py-2 text-right font-mono font-bold text-orange-400 text-xs">{formatCurrency(s.amount)}</td>
                                                    <td className="px-2 py-2">
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getStatusBadge(s.status)}`}>
                                                            {s.status === 'payment_sent' ? 'Awaiting' : s.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {s.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => handlePaymentSent(s._id)} disabled={submitting} className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/30">Paid</button>
                                                                    <button onClick={() => setEditModal({ _id: s._id, amount: s.amount, remarks: s.remarks || '' })} className="p-1.5 rounded hover:bg-gray-600 text-amber-400" title="Edit"><FaEdit className="w-3 h-3" /></button>
                                                                    <button onClick={() => handleDelete(s._id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400" title="Delete"><FaTrash className="w-3 h-3" /></button>
                                                                    <button onClick={() => setVerifyModal({ _id: s._id, amount: s.amount, bookie: s.bookieId?.username, adminRemarks: 'Declined', action: 'reject' })} className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/30">Decline</button>
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

                {/* BOOKIE COLLECTS TAB - Single table: Date | Bookie | Revenue | Amount | Status | Actions */}
                {activeTab === 'bookie_collects' && (
                    <>
                        <div className="bg-gray-800/80 rounded-lg border border-gray-700/80 overflow-hidden">
                            {(() => {
                                const flatRows = [];
                                dailyBreakdown.forEach((b) => {
                                    const bid = (b.bookieId?._id || b.bookieId)?.toString?.() || '';
                                    (b.dailyBreakdown || []).forEach((d) => {
                                        const s = settlements.find((x) => {
                                            const sd = new Date(x.settlementDate).toISOString().slice(0, 10);
                                            const sb = (x.bookieId?._id || x.bookieId)?.toString?.() || '';
                                            return sd === d.date && sb === bid;
                                        });
                                        flatRows.push({ date: d.date, bookieName: b.bookieName, bookiePhone: b.bookiePhone || '', bookieId: bid, revenue: d.revenue, amount: d.amountDue, settlement: s });
                                    });
                                });
                                let filtered = flatRows;
                                if (bookieCollectsFilter) {
                                    filtered = filtered.filter((r) => r.bookieId === bookieCollectsFilter);
                                }
                                if (bookieCollectsSearch.trim()) {
                                    const q = bookieCollectsSearch.trim().toLowerCase();
                                    filtered = filtered.filter((r) =>
                                        (r.bookieName || '').toLowerCase().includes(q) || String(r.bookiePhone || '').includes(q)
                                    );
                                }
                                filtered.sort((a, b) => (a.bookieName || '').localeCompare(b.bookieName || '') || b.date.localeCompare(a.date));
                                const filteredTotal = filtered.reduce((s, r) => s + (r.settlement ? Number(r.settlement.amount) || 0 : 0), 0);
                                return (
                                <>
                                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/80">
                                    <span className="text-xs font-semibold text-white">Bookie Collects — Date | Bookie | Revenue | Amount | Status | Actions</span>
                                    <span className="px-2 py-1 rounded font-bold text-sm bg-purple-500/20 text-purple-400 border border-purple-500/30">Total: {formatCurrency(bookieCollectsFilter || bookieCollectsSearch.trim() ? filteredTotal : totalAmount)}</span>
                                </div>
                                {filtered.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500 text-sm">{flatRows.length === 0 ? 'No Bookie Collects data for this period' : 'No matching bookies'}</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-700/40 text-gray-400 text-[10px] uppercase tracking-wider">
                                                    <th className="text-left px-3 py-2 font-medium">Date</th>
                                                    <th className="text-left px-2 py-2 font-medium">Bookie</th>
                                                    <th className="text-right px-2 py-2 font-medium">Revenue</th>
                                                    <th className="text-right px-2 py-2 font-medium">Amount</th>
                                                    <th className="text-left px-2 py-2 font-medium">Status</th>
                                                    <th className="text-right px-3 py-2 font-medium">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700/40">
                                                {filtered.map((row) => (
                                                    <tr key={`${row.date}-${row.bookieId}`} className="hover:bg-gray-700/20">
                                                        <td className="px-3 py-2 text-white">{formatDate(row.date)}</td>
                                                        <td className="px-2 py-2 font-medium text-white">{row.bookieName || '—'}</td>
                                                        <td className="px-2 py-2 text-right font-mono text-blue-400">{formatCurrency(row.revenue)}</td>
                                                        <td className="px-2 py-2 text-right font-mono font-bold text-emerald-400">{formatCurrency(row.amount)}</td>
                                                        <td className="px-2 py-2">
                                                            {row.settlement ? (
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getStatusBadge(row.settlement.status)}`}>
                                                                    {row.settlement.status === 'bookie_confirmed' ? 'Confirm' : row.settlement.status}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {row.settlement ? (
                                                                <>
                                                                    {row.settlement.status === 'bookie_confirmed' && (
                                                                        <>
                                                                            <button onClick={() => setVerifyModal({ _id: row.settlement._id, amount: row.settlement.amount, bookie: row.settlement.bookieId?.username, adminRemarks: '' })} className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-medium mr-1">Yes I received</button>
                                                                            <button onClick={() => setVerifyModal({ _id: row.settlement._id, amount: row.settlement.amount, bookie: row.settlement.bookieId?.username, adminRemarks: 'Rejected' })} className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-medium">Decline</button>
                                                                        </>
                                                                    )}
                                                                    {row.settlement.status === 'pending' && (
                                                                        <>
                                                                            <button onClick={() => setEditModal({ _id: row.settlement._id, amount: row.settlement.amount, remarks: row.settlement.remarks || '' })} className="p-1.5 rounded hover:bg-gray-600 text-amber-400 mr-1"><FaEdit className="w-3 h-3" /></button>
                                                                            <button onClick={() => handleDelete(row.settlement._id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400"><FaTrash className="w-3 h-3" /></button>
                                                                        </>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <button type="button" onClick={() => handleRequestBookieCollects(row.bookieId, row.date, row.amount)} disabled={submitting || row.amount <= 0}
                                                                    className="px-1.5 py-0.5 rounded bg-amber-500/80 hover:bg-amber-500 text-black text-[10px] font-semibold disabled:opacity-50"
                                                                >Request</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                </>
                                );
                            })()}
                        </div>
                    </>
                )}
            </div>

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
                            <button type="button" onClick={handleApprove} disabled={submitting} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"><FaCheck /> {activeTab === 'bookie_collects' ? 'Yes I received' : 'Accept'}</button>
                            <button type="button" onClick={handleReject} disabled={submitting} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg disabled:opacity-50">Decline</button>
                            <button type="button" onClick={() => setVerifyModal(null)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default DailySettlement;
