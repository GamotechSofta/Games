import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import { FaCog, FaCreditCard, FaCheckCircle, FaExclamationCircle, FaSave, FaBuilding, FaHandHoldingUsd, FaShieldAlt } from 'react-icons/fa';

const Settings = () => {
    const [upiId, setUpiId] = useState('');
    const [bookieType, setBookieType] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [currentUpi, setCurrentUpi] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bookie/upi`, { headers: getBookieAuthHeaders() });
                const json = await res.json();
                if (json.success) {
                    setBookieType(json.data?.bookieType || 'admin_collects');
                    if (json.data?.upiId) {
                        setCurrentUpi(json.data.upiId);
                        setUpiId(json.data.upiId);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setMsg({ type: '', text: '' });
        const trimmed = upiId.trim();

        if (!trimmed) {
            setMsg({ type: 'error', text: 'Please enter a valid UPI ID' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/bookie/upi`, {
                method: 'PATCH',
                headers: {
                    ...getBookieAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ upiId: trimmed }),
            });
            const json = await res.json();

            if (json.success) {
                setCurrentUpi(trimmed);
                setMsg({ type: 'success', text: 'UPI ID updated successfully' });
            } else {
                setMsg({ type: 'error', text: json.message || 'Failed to update UPI ID' });
            }
        } catch {
            setMsg({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const isBookieCollects = bookieType === 'bookie_collects';

    return (
        <Layout title="Settings">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <FaCog className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Account Settings</h1>
                        <p className="text-slate-400 text-sm mt-1">Manage your account preferences and configurations</p>
                    </div>
                </div>

                {/* Account Type Card */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${isBookieCollects ? 'bg-purple-500' : 'bg-emerald-500'}`}></div>
                    <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isBookieCollects ? 'bg-purple-500/10' : 'bg-emerald-500/10'
                            }`}>
                            {isBookieCollects ? <FaBuilding className="w-5 h-5 text-purple-400" /> : <FaHandHoldingUsd className="w-5 h-5 text-emerald-400" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                {isBookieCollects ? 'Bookie Collects Account' : 'Admin Collects Account'}
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-bold ${isBookieCollects
                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>Active</span>
                            </h2>
                            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                                {isBookieCollects
                                    ? 'You are responsible for collecting payments from players and managing payouts. You settle platform fees with the admin separately.'
                                    : 'The admin handles all payment collections and payouts. You receive your commission based on player activity.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Payment Settings */}
                {isBookieCollects ? (
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <FaCreditCard className="w-32 h-32 text-slate-400 rotate-12" />
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <FaCreditCard className="text-amber-500" />
                                Payment Configuration
                            </h2>

                            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-amber-200 text-sm flex items-start gap-2">
                                    <FaExclamationCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    This UPI ID will be displayed to players when they request a deposit. Ensure it is accurate to receive payments.
                                </p>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Your UPI ID
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={upiId}
                                            onChange={(e) => { setUpiId(e.target.value); setMsg({ type: '', text: '' }); }}
                                            placeholder="e.g. username@upi"
                                            className="w-full px-4 py-3 pl-11 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
                                        />
                                        <div className="absolute left-4 top-3.5 text-slate-500">
                                            <FaCreditCard className="w-4 h-4" />
                                        </div>
                                        {currentUpi && upiId === currentUpi && (
                                            <div className="absolute right-4 top-3.5 text-emerald-400" title="Current Active UPI">
                                                <FaCheckCircle className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {msg.text && (
                                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === 'success'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                        {msg.type === 'success' ? <FaCheckCircle className="w-4 h-4" /> : <FaExclamationCircle className="w-4 h-4" />}
                                        {msg.text}
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading || (upiId === currentUpi && !msg.text)}
                                        className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                                Saving Changes...
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="w-4 h-4" />
                                                Save UPI Configuration
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                            <FaShieldAlt className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Managed by Admin</h3>
                        <p className="text-slate-400 max-w-md mx-auto">
                            Since you are on an <strong>Admin Collects</strong> plan, all payment configurations are handled centrally by the administration. You don't need to set up anything here.
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Settings;
