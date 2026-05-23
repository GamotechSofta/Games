import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, bookieFetch, getReferralUrl } from '../utils/api';

const ReferralLink = () => {
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchReferralLink();
    }, []);

    const fetchReferralLink = async () => {
        try {
            setLoading(true);
            const response = await bookieFetch(`${API_BASE_URL}/bookie/referral-link`);
            const data = await response.json();
            if (data.success) {
                setLink(getReferralUrl(data.data.bookieId));
            } else {
                setError(data.message || 'Failed to fetch referral link');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Layout title="My Referral Link">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">My Referral Link</h1>
                    <p className="text-slate-400">Share this link with players. When they sign up using this link, they will be added to your account.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                        Generating referral link...
                    </div>
                ) : (link && (
                    <div className="glass-panel glass-panel-card rounded-2xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <div className="w-48 h-48 bg-amber-500/20 rounded-full blur-3xl"></div>
                        </div>

                        <div className="relative z-10">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Your Unique Referral Link</label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-grow">
                                    <input
                                        type="text"
                                        value={link}
                                        readOnly
                                        className="w-full pl-4 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                                    />
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    {copied ? (
                                        <>
                                            <span className="text-lg">✓</span> Copied!
                                        </>
                                    ) : (
                                        'Copy Link'
                                    )}
                                </button>
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">1</div>
                                    <p className="text-sm text-slate-400">Share your link via WhatsApp, Telegram, or Social Media.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">2</div>
                                    <p className="text-sm text-slate-400">Players sign up and get instantly linked to your agent account.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Layout>
    );
};

export default ReferralLink;
