import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL } from '../utils/api';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { FaChartBar, FaStar, FaCrown, FaChartLine } from 'react-icons/fa';

const TABS = [
    { id: 'regular', label: 'Regular Market', icon: FaChartBar },
    { id: 'starline', label: 'Starline Market', icon: FaStar },
    { id: 'king', label: 'King Bazaar Market', icon: FaCrown },
];

const Markets = () => {
    const [regularMarkets, setRegularMarkets] = useState([]);
    const [starlineMarkets, setStarlineMarkets] = useState([]);
    const [kingMarkets, setKingMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('regular');

    const fetchRegularMarkets = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=main`);
            const data = await response.json();
            if (data.success) {
                // Filter to ensure only main/regular markets (exclude starline and king)
                const filtered = (data.data || []).filter(m => {
                    const type = m.marketType || 'main';
                    return type === 'main' || (!type.includes('starline') && !type.includes('king'));
                });
                setRegularMarkets(filtered);
            } else {
                setError('Failed to fetch regular markets');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    const fetchStarlineMarkets = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=startline`);
            const data = await response.json();
            if (data.success) {
                // Filter to ensure only starline markets
                const filtered = (data.data || []).filter(m => m.marketType === 'startline');
                setStarlineMarkets(filtered);
            } else {
                setError('Failed to fetch starline markets');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    const fetchKingMarkets = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=king`);
            const data = await response.json();
            if (data.success) {
                // Filter to ensure only king markets
                const filtered = (data.data || []).filter(m => m.marketType === 'king');
                setKingMarkets(filtered);
            } else {
                setError('Failed to fetch king bazaar markets');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'regular') fetchRegularMarkets();
        else if (activeTab === 'starline') fetchStarlineMarkets();
        else if (activeTab === 'king') fetchKingMarkets();
    }, [activeTab]);

    useRefreshOnMarketReset(() => {
        if (activeTab === 'regular') fetchRegularMarkets();
        else if (activeTab === 'starline') fetchStarlineMarkets();
        else if (activeTab === 'king') fetchKingMarkets();
    });

    const renderMarketCard = (market) => {
        const marketType = market.marketType || 'main';

        // For Regular markets: display as ***-**-***
        if (marketType === 'main') {
            const result = market.displayResult || '***-**-***';
            const parts = result.split('-');
            const openPanna = parts[0] || '***';
            const jodi = parts[1] || '**';
            const closePanna = parts[2] || '***';

            const isClosed = result !== '***-**-***' && !result.includes('*');
            const statusColor = isClosed ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            const statusText = isClosed ? 'CLOSED' : 'OPEN';

            return (
                <div key={market._id} className="glass-panel glass-panel-card rounded-2xl p-4 relative overflow-hidden group hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)] transition-all duration-300 border border-slate-200 hover:border-amber-500/30">
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-300"></div>

                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className="flex-1 pr-2">
                            <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-amber-400 transition-colors">
                                {market.marketName}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusColor} tracking-wider flex items-center gap-1`}>
                                    <span className={`w-1 h-1 rounded-full ${isClosed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                                    {statusText}
                                </span>
                            </div>
                        </div>
                        <div className="bg-white/5 p-1.5 rounded-lg text-amber-500">
                            <FaChartLine className="w-3 h-3" />
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-3 text-xs font-medium text-slate-400 bg-black/20 rounded-lg p-2 border border-slate-200">
                        <div className="text-center">
                            <span className="block text-[9px] uppercase tracking-wider mb-0.5 opacity-70">Open</span>
                            <span className="text-slate-900 font-mono text-xs">{market.startingTime}</span>
                        </div>
                        <div className="h-4 w-px bg-white/10"></div>
                        <div className="text-center">
                            <span className="block text-[9px] uppercase tracking-wider mb-0.5 opacity-70">Close</span>
                            <span className="text-slate-900 font-mono text-xs">{market.closingTime}</span>
                        </div>
                    </div>

                    <div className="mb-2 text-center">
                        <div className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.15em] mb-1.5 opacity-80">Result</div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 relative overflow-hidden group-hover:border-amber-300 transition-colors">
                            <div className="absolute inset-0 bg-amber-500/5 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative z-10 flex items-center justify-center gap-1.5 font-mono font-bold text-xl text-slate-900 tracking-widest">
                                <span className={openPanna.includes('*') ? 'text-slate-400' : 'text-amber-600'}>{openPanna}</span>
                                <span className="text-slate-400 text-sm">-</span>
                                <span className={jodi.includes('*') ? 'text-slate-400' : 'text-slate-900'}>{jodi}</span>
                                <span className="text-slate-600 text-sm">-</span>
                                <span className={closePanna.includes('*') ? 'text-slate-600' : 'text-amber-400'}>{closePanna}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-[8px] text-slate-500 font-medium">
                            Auto-updated
                        </p>
                    </div>
                </div>
            );
        }

        // For Starline and King Bazaar markets: display only opening number
        // Starline: 3 or 4 digits (displayed as 345-6 or 34-5), King Bazaar: 2 digits
        // Check both openingNumber field and displayResult field
        let openingNumber = marketType === 'startline' ? '****' : '**';
        let hasResult = false;

        if (marketType === 'startline') {
            // For Starline: accept 3 or 4 digit numbers
            const numStr = String(market.openingNumber || '').trim();
            if (/^\d{3,4}$/.test(numStr)) {
                openingNumber = numStr.padEnd(4, '0'); // Pad to 4 digits if needed
                hasResult = true;
            } else if (market.displayResult) {
                const parts = String(market.displayResult).split('-');
                if (parts[0] && /^\d{3,4}$/.test(parts[0])) {
                    openingNumber = parts[0].padEnd(4, '0');
                    hasResult = true;
                }
            }
        } else {
            // For King Bazaar: 2 digits
            const numStr = String(market.openingNumber || '').trim();
            if (/^\d{2}$/.test(numStr)) {
                openingNumber = numStr;
                hasResult = true;
            } else if (market.displayResult) {
                const parts = String(market.displayResult).split('-');
                if (parts[0] && /^\d{2}$/.test(parts[0])) {
                    openingNumber = parts[0];
                    hasResult = true;
                }
            }
        }

        const statusColor = hasResult ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        const statusText = hasResult ? 'DECLARED' : 'OPEN';

        return (
            <div key={market._id} className="glass-panel glass-panel-card rounded-2xl p-4 relative overflow-hidden group hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)] transition-all duration-300 border border-slate-200 hover:border-amber-500/30">
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-300"></div>

                <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex-1 pr-2">
                        <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-amber-400 transition-colors">
                            {market.marketName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusColor} tracking-wider flex items-center gap-1`}>
                                <span className={`w-1 h-1 rounded-full ${hasResult ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                                {statusText}
                            </span>
                        </div>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded-lg text-amber-500">
                        {marketType === 'startline' ? <FaStar className="w-3 h-3" /> : <FaCrown className="w-3 h-3" />}
                    </div>
                </div>

                <div className="flex justify-center items-center mb-3 text-xs font-medium text-slate-400 bg-black/20 rounded-lg p-2 border border-slate-200">
                    <div className="text-center">
                        <span className="block text-[9px] uppercase tracking-wider mb-0.5 opacity-70">Closing Time</span>
                        <span className="text-slate-900 font-mono text-xs">{market.closingTime || market.startingTime}</span>
                    </div>
                </div>

                <div className="mb-2 text-center">
                    <div className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.15em] mb-1.5 opacity-80">Result</div>
                    <div className="bg-black/40 border border-slate-200 rounded-xl py-3 px-2 relative overflow-hidden group-hover:border-amber-500/30 transition-colors">
                        <div className="absolute inset-0 bg-amber-500/5 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        <div className="relative z-10 flex items-center justify-center font-mono font-bold text-xl text-white tracking-[0.3em]">
                            {marketType === 'startline' && hasResult ? (
                                // For Starline with result: show as "345-6" (3 digits, dash, 1 digit)
                                <>
                                    <span className="text-amber-400">{openingNumber.slice(0, 3)}</span>
                                    <span className="text-slate-600 text-sm mx-1">-</span>
                                    <span className="text-amber-400">{openingNumber.slice(3)}</span>
                                </>
                            ) : marketType === 'startline' && !hasResult ? (
                                // For Starline without result: show as "***-*"
                                <>
                                    <span className="text-slate-600">***</span>
                                    <span className="text-slate-600 text-sm mx-1">-</span>
                                    <span className="text-slate-600">*</span>
                                </>
                            ) : (
                                // For King Bazaar: show as normal 3 digits
                                <span className={hasResult ? 'text-amber-400' : 'text-slate-600'}>{openingNumber}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-[8px] text-slate-500 font-medium">
                        Auto-updated
                    </p>
                </div>
            </div>
        );
    };

    const getCurrentMarkets = () => {
        if (activeTab === 'regular') return regularMarkets;
        if (activeTab === 'starline') return starlineMarkets;
        if (activeTab === 'king') return kingMarkets;
        return [];
    };

    const currentMarkets = getCurrentMarkets();

    return (
        <Layout title="Markets">
            <div className="max-w-[1600px] mx-auto">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <FaChartBar className="text-amber-500" />
                            Markets Management
                        </h1>
                        <p className="text-slate-600 text-sm mt-1">View live market results and timings</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">LIVE</span>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        {error}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-3 mb-8">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${isActive
                                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                    : 'glass-panel text-slate-600 hover:bg-white/10 hover:text-slate-900 border border-slate-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="glass-panel h-64 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : currentMarkets.length === 0 ? (
                    <div className="glass-panel glass-panel-card rounded-2xl p-12 text-center border border-slate-200">
                        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                            {activeTab === 'regular' && <FaChartBar className="w-8 h-8 text-slate-500" />}
                            {activeTab === 'starline' && <FaStar className="w-8 h-8 text-slate-500" />}
                            {activeTab === 'king' && <FaCrown className="w-8 h-8 text-slate-500" />}
                        </div>
                        <h3 className="text-slate-900 font-bold text-lg mb-2">No Markets Found</h3>
                        <p className="text-slate-500 text-sm">
                            {activeTab === 'regular' && 'No regular markets available at the moment.'}
                            {activeTab === 'starline' && 'No starline markets available at the moment.'}
                            {activeTab === 'king' && 'No king bazaar markets available at the moment.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentMarkets.map(renderMarketCard)}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Markets;
