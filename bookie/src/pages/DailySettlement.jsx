import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, bookieFetch } from '../utils/api';
import { FaMoneyBillWave, FaSyncAlt } from 'react-icons/fa';

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
    return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DailySettlement = () => {
    const [rows, setRows] = useState([]);
    const [totals, setTotals] = useState({ commission: 0, paidCommission: 0, unpaidCommission: 0 });
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState(() => {
        const preset = PRESETS.find((p) => p.id === 'today');
        const { from, to } = preset.getRange();
        return { startDate: from, endDate: to };
    });
    const [activePreset, setActivePreset] = useState('today');

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
            const res = await bookieFetch(`${API_BASE_URL}/settlements/daily?${params}`);
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

    useEffect(() => {
        fetchDaily();
    }, [dateRange.startDate, dateRange.endDate]);

    return (
        <Layout title="Daily Settlement">
            <div className="max-w-[1600px] mx-auto min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FaMoneyBillWave className="text-amber-500 w-5 h-5" />
                        Daily Settlement
                    </h1>
                    <span className="text-xs text-slate-500">Daily commission from your players&apos; bets</span>
                </div>

                <div className="glass-panel glass-panel-card p-3 rounded-lg border border-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                        {PRESETS.map((p) => (
                            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                                className={`px-2 py-1 rounded text-xs font-medium ${activePreset === p.id ? 'bg-amber-500 text-black' : 'bg-slate-100 text-slate-600'}`}
                            >{p.label}</button>
                        ))}
                        <input type="date" value={dateRange.startDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 text-xs w-[120px]"
                        />
                        <span className="text-slate-500 text-xs">to</span>
                        <input type="date" value={dateRange.endDate}
                            onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setActivePreset(''); }}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 text-xs w-[120px]"
                        />
                        <button type="button" onClick={fetchDaily} disabled={loading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs disabled:opacity-50"
                        >
                            <FaSyncAlt className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 text-sm font-bold">
                        Total: {formatCurrency(totals.commission)}
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-sm">
                        Paid: {formatCurrency(totals.paidCommission)}
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 text-sm">
                        Unpaid: {formatCurrency(totals.unpaidCommission)}
                    </div>
                </div>

                <div className="glass-panel glass-panel-card rounded-lg overflow-hidden border border-slate-200">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
                    ) : rows.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No records for this period</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] uppercase">
                                        <th className="text-left px-3 py-2">Date</th>
                                        <th className="text-right px-2 py-2">Revenue</th>
                                        <th className="text-right px-2 py-2">Commission</th>
                                        <th className="text-center px-3 py-2">Payment</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rows.map((row) => {
                                        const isPaid = row.paymentStatus === 'paid';
                                        return (
                                            <tr key={row.date} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 text-slate-900">{formatDate(row.date)}</td>
                                                <td className="px-2 py-2 text-right font-mono text-blue-600">{formatCurrency(row.revenue)}</td>
                                                <td className="px-2 py-2 text-right font-mono font-bold text-emerald-600">{formatCurrency(row.commission)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                        isPaid
                                                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                                            : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                                    }`}>
                                                        {isPaid ? 'Paid' : 'Unpaid'}
                                                    </span>
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
        </Layout>
    );
};

export default DailySettlement;
