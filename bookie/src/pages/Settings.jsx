import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import { FaCog, FaCreditCard, FaCheckCircle, FaExclamationCircle, FaSave, FaBuilding, FaHandHoldingUsd, FaShieldAlt, FaLock } from 'react-icons/fa';

const Settings = () => {
    const [upiIds, setUpiIds] = useState(['']);
    const [bookieType, setBookieType] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [currentUpiIds, setCurrentUpiIds] = useState([]);
    const [upiSecurityPassword, setUpiSecurityPassword] = useState('');

    // Security password (bookie_collects only)
    const [securityPasswordSet, setSecurityPasswordSet] = useState(false);
    const [secPwdLoading, setSecPwdLoading] = useState(false);
    const [secPwdMsg, setSecPwdMsg] = useState({ type: '', text: '' });
    const [secPwdForm, setSecPwdForm] = useState({ current: '', new: '', confirm: '' });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bookie/upi`, { headers: getBookieAuthHeaders() });
                const json = await res.json();
                if (json.success) {
                    setBookieType(json.data?.bookieType || 'admin_collects');
                    const ids = json.data?.upiIds?.length > 0
                        ? json.data.upiIds
                        : (json.data?.upiId ? [json.data.upiId] : []);
                    if (ids.length > 0) {
                        setCurrentUpiIds(ids);
                        setUpiIds(ids);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (bookieType !== 'bookie_collects') return;
        const fetchSecPwdStatus = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bookie/security-password-status`, { headers: getBookieAuthHeaders() });
                const json = await res.json();
                if (json.success && json.data) setSecurityPasswordSet(json.data.isSet === true);
            } catch (e) {
                console.error('Failed to fetch security password status:', e);
            }
        };
        fetchSecPwdStatus();
    }, [bookieType]);

    const handleSave = async (e) => {
        e.preventDefault();
        setMsg({ type: '', text: '' });
        const trimmed = upiIds.map((id) => String(id || '').trim()).filter(Boolean);

        if (trimmed.length === 0) {
            setMsg({ type: 'error', text: 'Please enter at least one UPI ID' });
            return;
        }
        if (securityPasswordSet && !upiSecurityPassword.trim()) {
            setMsg({ type: 'error', text: 'Enter security password to confirm UPI ID change' });
            return;
        }

        setLoading(true);
        try {
            const body = { upiIds: trimmed };
            if (securityPasswordSet) body.securityPassword = upiSecurityPassword.trim();
            const res = await fetch(`${API_BASE_URL}/bookie/upi`, {
                method: 'PATCH',
                headers: {
                    ...getBookieAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
            });
            const json = await res.json();

            if (json.success) {
                setCurrentUpiIds(trimmed);
                setUpiSecurityPassword('');
                setMsg({ type: 'success', text: 'UPI IDs updated successfully' });
            } else {
                setMsg({ type: 'error', text: json.message || 'Failed to update UPI IDs' });
            }
        } catch {
            setMsg({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const addUpiRow = () => setUpiIds((prev) => [...prev, '']);
    const removeUpiRow = (idx) => setUpiIds((prev) => prev.filter((_, i) => i !== idx));
    const updateUpiRow = (idx, val) => setUpiIds((prev) => {
        const next = [...prev];
        next[idx] = val;
        return next;
    });

    const handleSaveSecurityPassword = async (e) => {
        e.preventDefault();
        setSecPwdMsg({ type: '', text: '' });
        const { current, new: newPwd, confirm } = secPwdForm;
        if (!newPwd || newPwd.length < 4) {
            setSecPwdMsg({ type: 'error', text: 'Security password must be at least 4 characters' });
            return;
        }
        if (newPwd !== confirm) {
            setSecPwdMsg({ type: 'error', text: 'New password and confirm do not match' });
            return;
        }
        if (securityPasswordSet && !current) {
            setSecPwdMsg({ type: 'error', text: 'Enter current security password to change it' });
            return;
        }
        setSecPwdLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/bookie/security-password`, {
                method: 'PATCH',
                headers: { ...getBookieAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: newPwd, currentPassword: current || undefined }),
            });
            const json = await res.json();
            if (json.success) {
                setSecurityPasswordSet(true);
                setSecPwdForm({ current: '', new: '', confirm: '' });
                setSecPwdMsg({ type: 'success', text: json.message || 'Security password saved' });
            } else {
                setSecPwdMsg({ type: 'error', text: json.message || 'Failed to save security password' });
            }
        } catch {
            setSecPwdMsg({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setSecPwdLoading(false);
        }
    };

    const isBookieCollects = bookieType === 'bookie_collects';

    return (
        <Layout title="Settings">
            <div className="max-w-2xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <FaCog className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Account Settings</h1>
                        <p className="text-slate-500 text-xs">Preferences and configuration</p>
                    </div>
                </div>

                {/* Account Type Card */}
                <div className="glass-panel p-4 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${isBookieCollects ? 'bg-purple-500' : 'bg-emerald-500'}`}></div>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isBookieCollects ? 'bg-purple-500/10' : 'bg-emerald-500/10'}`}>
                            {isBookieCollects ? <FaBuilding className="w-4 h-4 text-purple-400" /> : <FaHandHoldingUsd className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                                {isBookieCollects ? 'Bookie Collects Account' : 'Admin Collects Account'}
                                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold ${isBookieCollects ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>Active</span>
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5">
                                {isBookieCollects ? 'You collect payments and manage payouts; you settle fees with admin.' : 'Admin handles collections; you earn commission on player activity.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Security Password (Bookie Collects only) */}
                {isBookieCollects && (
                    <div className="glass-panel p-4 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                                <FaLock className="w-4 h-4 text-purple-400" />
                                Security Password
                            </h2>
                            <p className="text-slate-500 text-xs mb-3">Required for wallet add/deduct and UPI change.</p>
                            <form onSubmit={handleSaveSecurityPassword} className="space-y-3 max-w-md">
                                {securityPasswordSet && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current</label>
                                        <input
                                            type="password"
                                            value={secPwdForm.current}
                                            onChange={(e) => { setSecPwdForm((f) => ({ ...f, current: e.target.value })); setSecPwdMsg({ type: '', text: '' }); }}
                                            placeholder="Current password"
                                            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                                            autoComplete="current-password"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{securityPasswordSet ? 'New' : 'Password'}</label>
                                        <input
                                            type="password"
                                            value={secPwdForm.new}
                                            onChange={(e) => { setSecPwdForm((f) => ({ ...f, new: e.target.value })); setSecPwdMsg({ type: '', text: '' }); }}
                                            placeholder="Min 4 characters"
                                            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                                            autoComplete="new-password"
                                            minLength={4}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confirm</label>
                                        <input
                                            type="password"
                                            value={secPwdForm.confirm}
                                            onChange={(e) => { setSecPwdForm((f) => ({ ...f, confirm: e.target.value })); setSecPwdMsg({ type: '', text: '' }); }}
                                            placeholder="Confirm"
                                            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>
                                {secPwdMsg.text && (
                                    <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${secPwdMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {secPwdMsg.type === 'success' ? <FaCheckCircle className="w-3.5 h-3.5" /> : <FaExclamationCircle className="w-3.5 h-3.5" />}
                                        {secPwdMsg.text}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={secPwdLoading}
                                    className="px-4 py-2 text-sm font-bold rounded-lg bg-purple-500 hover:bg-purple-400 text-white transition-all disabled:opacity-50 flex items-center gap-2 w-fit"
                                >
                                    {secPwdLoading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaLock className="w-3.5 h-3.5" />}
                                    {securityPasswordSet ? 'Update' : 'Set'} security password
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Payment Settings */}
                {isBookieCollects ? (
                    <div className="glass-panel p-4 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                                <FaCreditCard className="text-amber-500 w-4 h-4" />
                                Payment Configuration
                            </h2>
                            <p className="text-slate-500 text-xs mb-3 flex items-center gap-1.5">
                                <FaExclamationCircle className="w-3.5 h-3.5 shrink-0" />
                                UPI ID shown to players for deposits—keep it accurate.
                            </p>
                            <form onSubmit={handleSave} className="space-y-3">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your UPI IDs</label>
                                    {upiIds.map((id, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={id}
                                                    onChange={(e) => { updateUpiRow(idx, e.target.value); setMsg({ type: '', text: '' }); }}
                                                    placeholder="e.g. username@upi"
                                                    className="w-full px-3 py-2 pl-9 rounded-lg bg-black/40 border border-white/10 text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                                                />
                                                <FaCreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                                {currentUpiIds.includes(id) && id && (
                                                    <FaCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" title="Saved" />
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeUpiRow(idx)}
                                                disabled={upiIds.length === 1}
                                                className="px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                                title="Remove"
                                            >
                                                −
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addUpiRow} className="text-xs text-amber-500 hover:text-amber-400">+ Add another UPI ID</button>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                    {securityPasswordSet && (
                                        <div className="sm:w-44">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><FaLock className="w-3 h-3 text-amber-500" /> Security password</label>
                                            <input
                                                type="password"
                                                value={upiSecurityPassword}
                                                onChange={(e) => { setUpiSecurityPassword(e.target.value); setMsg({ type: '', text: '' }); }}
                                                placeholder="Required to save"
                                                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                                                autoComplete="off"
                                            />
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading || (JSON.stringify(upiIds.filter(Boolean)) === JSON.stringify(currentUpiIds) && !msg.text) || (securityPasswordSet && !upiSecurityPassword.trim())}
                                        className="px-4 py-2 text-sm font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                                    >
                                        {loading ? <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <FaSave className="w-3.5 h-3.5" />}
                                        Save
                                    </button>
                                </div>
                                {msg.text && (
                                    <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {msg.type === 'success' ? <FaCheckCircle className="w-3.5 h-3.5" /> : <FaExclamationCircle className="w-3.5 h-3.5" />}
                                        {msg.text}
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2 border border-slate-700">
                            <FaShieldAlt className="w-5 h-5 text-slate-400" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-1">Managed by Admin</h3>
                        <p className="text-slate-500 text-xs">Admin Collects plan—payment config is handled by admin.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Settings;
