import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import AddResultModal from '../components/AddResultModal';
import MarketDetail from './MarketDetail';
import { clearAdminAuth } from '../utils/api';
import { FaChartBar, FaStar, FaCrown } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

const TABS = [
    { id: 'regular', label: 'Regular Market', icon: FaChartBar },
    { id: 'starline', label: 'Starline Market', icon: FaStar },
    { id: 'king', label: 'King Bazaar Market', icon: FaCrown },
];

/** Format HH:mm to 12-hour with AM/PM (e.g. "01:00" → "1:00 AM", "13:30" → "1:30 PM") */
function formatTime12h(timeStr) {
    const s = (timeStr || '').toString().trim().slice(0, 5);
    const [hh, mm] = s.split(':');
    const h = parseInt(hh, 10) || 0;
    const m = parseInt(mm, 10) || 0;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Returns true if closing time (HH:mm, IST) has passed today in IST */
function isClosingTimePassedIST(closingTime, nowMs = Date.now()) {
    const t = (closingTime || '').toString().trim().slice(0, 5);
    const [hh, mm] = t.split(':');
    const h = String(Number(hh) || 0).padStart(2, '0');
    const m = String(Number(mm) || 0).padStart(2, '0');
    const normalized = `${h}:${m}`;
    if (!/^\d{2}:\d{2}$/.test(normalized)) return false;
    const getTodayIST = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const todayIST = getTodayIST(new Date(nowMs));
    const dateStr = normalized === '00:00' ? (() => { const b = new Date(`${todayIST}T12:00:00+05:30`); b.setDate(b.getDate() + 1); return getTodayIST(b); })() : todayIST;
    const targetMs = new Date(`${dateStr}T${normalized}:00+05:30`).getTime();
    return !Number.isNaN(targetMs) && nowMs >= targetMs;
}

/** Result declared → closed (red). Open declared, close not → running (green). Else: closing time passed → closed (red), else open (green). Starline: single openingNumber = closed. */
function getMarketStatus(market) {
    const type = (market.marketType || '').toString().toLowerCase();
    const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
    const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
    if (type === 'startline' && hasOpening) return { status: 'closed', color: 'bg-red-600' };
    if (hasOpening && hasClosing) return { status: 'closed', color: 'bg-red-600' };
    if (hasOpening && !hasClosing) return { status: 'running', color: 'bg-green-600' };
    if (isClosingTimePassedIST(market.closingTime || market.startingTime)) return { status: 'closed', color: 'bg-red-600' };
    return { status: 'open', color: 'bg-green-600' };
}

const getMarketTypeForApi = (tabId) => {
    if (tabId === 'starline') return 'startline';
    if (tabId === 'king') return 'king';
    return 'main';
};

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const MarketResult = () => {
    const { marketId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [markets, setMarkets] = useState([]);
    const [starlineGroups, setStarlineGroups] = useState([]);
    const [kingBazaarGroups, setKingBazaarGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('regular');
    /** Selected group key for Starline/King - when set, show slots; when empty, show group list */
    const [activeGroupKey, setActiveGroupKey] = useState('');
    /** Market for Add Result modal - when set, show modal instead of navigating */
    const [addResultMarket, setAddResultMarket] = useState(null);

    useEffect(() => {
        const type = (location.state?.marketType || '').toString().toLowerCase();
        if (type === 'starline') { setActiveTab('starline'); setActiveGroupKey(''); }
        if (type === 'king') { setActiveTab('king'); setActiveGroupKey(''); }
    }, [location.state?.marketType]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setActiveGroupKey('');
    };

    useEffect(() => {
        const admin = localStorage.getItem('admin');
        if (!admin) {
            navigate('/');
            return;
        }
        if (marketId) return;
        fetchMarkets();
    }, [navigate, marketId, activeTab]);

    useEffect(() => {
        if (activeTab !== 'starline' && activeTab !== 'king') return;
        const fetchGroups = async () => {
            try {
                setLoadingGroups(true);
                const url = activeTab === 'starline' ? `${API_BASE_URL}/markets/starline-groups` : `${API_BASE_URL}/markets/king-bazaar-groups`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    const list = data.data || [];
                    if (activeTab === 'starline') setStarlineGroups(list);
                    else setKingBazaarGroups(list);
                    if (activeGroupKey && !list.some((g) => (g.key || '').toLowerCase() === activeGroupKey.toLowerCase())) {
                        setActiveGroupKey('');
                    }
                }
            } catch {
                if (activeTab === 'starline') setStarlineGroups([]);
                else setKingBazaarGroups([]);
            } finally {
                setLoadingGroups(false);
            }
        };
        fetchGroups();
    }, [activeTab]);

    const fetchMarkets = async () => {
        try {
            setLoading(true);
            const marketType = getMarketTypeForApi(activeTab);
            const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=${marketType}&_t=${Date.now()}`, {
                headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
            });
            const data = await response.json();
            if (data.success) {
                setMarkets(data.data || []);
            } else {
                setError('Failed to fetch markets');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    /** Slots for current Starline/King group */
    const slotsForGroup = React.useMemo(() => {
        if (activeTab !== 'starline' && activeTab !== 'king' || !activeGroupKey) return [];
        const key = activeGroupKey.toString().trim().toLowerCase();
        const groupField = activeTab === 'starline' ? 'starlineGroup' : 'kingBazaarGroup';
        const type = activeTab === 'starline' ? 'startline' : 'king';
        const list = (markets || []).filter((m) => m.marketType === type && (m[groupField] || '').toString().trim().toLowerCase() === key);
        return list.sort((a, b) => String(a.closingTime || a.startingTime || '').localeCompare(String(b.closingTime || b.startingTime || ''), undefined, { numeric: true }));
    }, [markets, activeTab, activeGroupKey]);

    const groups = activeTab === 'starline' ? starlineGroups : kingBazaarGroups;

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    // When marketId is present, render MarketDetail (which will use market-result back link via useLocation)
    if (marketId) {
        return <MarketDetail isMarketResultView />;
    }

    // List view - show all main markets with View button
    return (
        <AdminLayout onLogout={handleLogout} title="Market Result">
            <div className="min-w-0">
                {error && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm sm:text-base">
                        {error}
                    </div>
                )}

                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-4 truncate">Market Result</h1>
                <p className="text-gray-400 text-sm mb-4">View result and bet details for each market.</p>

                {/* Top tabs: Regular | Starline | King Bazaar */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleTabChange(tab.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                                    isActive
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="text-center py-8 sm:py-12">
                        <p className="text-gray-400 text-sm sm:text-base">Loading markets...</p>
                    </div>
                ) : (
                    <section>
                        {(activeTab === 'starline' || activeTab === 'king') && activeGroupKey ? (
                            <>
                                <nav className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                                    <button type="button" onClick={() => setActiveGroupKey('')} className="hover:text-amber-400 transition-colors">
                                        {activeTab === 'starline' ? 'Starline' : 'King Bazaar'}
                                    </button>
                                    <span>/</span>
                                    <span className="text-white font-medium">
                                        {groups.find((g) => (g.key || '').toLowerCase() === activeGroupKey.toLowerCase())?.label || activeGroupKey}
                                    </span>
                                </nav>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                        <span className="inline-block w-1 h-6 sm:h-7 bg-gray-500 rounded-full" />
                                        Time Slots
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setActiveGroupKey('')}
                                        className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm font-medium"
                                    >
                                        ← Back to list
                                    </button>
                                </div>
                            </>
                        ) : (
                            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-4">
                                <span className="inline-block w-1 h-6 sm:h-7 bg-gray-500 rounded-full" />
                                {activeTab === 'regular' && 'Main / Daily Markets'}
                                {activeTab === 'starline' && 'Starline Markets'}
                                {activeTab === 'king' && 'King Bazaar Markets'}
                            </h2>
                        )}

                        {/* Regular: flat list. Starline/King: group list OR slot list */}
                        {(activeTab === 'starline' || activeTab === 'king') && !activeGroupKey ? (
                            (loadingGroups || loading) ? (
                                <div className="text-center py-8 sm:py-12">
                                    <p className="text-gray-400 text-sm sm:text-base">Loading…</p>
                                </div>
                            ) : groups.length === 0 ? (
                                <div className="text-center py-8 sm:py-12 text-gray-500">
                                    No {activeTab === 'starline' ? 'Starline' : 'King Bazaar'} markets yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-w-0 w-full max-w-full">
                                    {groups
                                        .sort((a, b) => (safeNum(a.order) - safeNum(b.order)) || (a.label || '').localeCompare(b.label || ''))
                                        .map((g) => {
                                            const groupSlots = (markets || []).filter((m) => {
                                                const type = activeTab === 'starline' ? 'startline' : 'king';
                                                const field = activeTab === 'starline' ? 'starlineGroup' : 'kingBazaarGroup';
                                                return m.marketType === type && (m[field] || '').toString().toLowerCase() === (g.key || '').toLowerCase();
                                            });
                                            const slotCount = groupSlots.length;
                                            const declaredCount = groupSlots.filter((m) => m.openingNumber && /^\d{3}$/.test(String(m.openingNumber))).length;
                                            const openCount = slotCount - declaredCount;
                                            const statusLabel = slotCount === 0 ? 'No slots' : openCount > 0 ? 'OPEN' : 'CLOSED';
                                            const statusColor = slotCount === 0 ? 'bg-gray-600' : openCount > 0 ? 'bg-green-600' : 'bg-red-600';
                                            return (
                                                <div key={g.key} className="bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-5 lg:p-6 hover:border-yellow-500/50 transition-colors min-w-0 overflow-hidden">
                                                    <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                                                        <div className={`${statusColor} text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full inline-block shrink-0`}>{statusLabel}</div>
                                                        <span className="text-amber-400 font-mono text-sm">{slotCount} slot{slotCount !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 truncate" title={g.label}>{g.label}</h3>
                                                    <div className="space-y-1.5 sm:space-y-2 mb-4 text-xs sm:text-sm text-gray-300">
                                                        {slotCount > 0 && openCount > 0 && <p><span className="font-semibold">Open:</span> {openCount} for bets</p>}
                                                        {declaredCount > 0 && <p><span className="font-semibold">Declared:</span> {declaredCount}</p>}
                                                    </div>
                                                    <button
                                                        onClick={() => setActiveGroupKey(g.key)}
                                                        className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-sm font-semibold"
                                                    >
                                                        View Slots
                                                    </button>
                                                </div>
                                            );
                                        })}
                                </div>
                            )
                        ) : (activeTab === 'starline' || activeTab === 'king') && activeGroupKey ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-w-0 w-full max-w-full">
                                {loading ? (
                                    <div className="col-span-full text-center py-8 text-gray-400">Loading slots…</div>
                                ) : slotsForGroup.length === 0 ? (
                                    <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">No slots in this market.</div>
                                ) : slotsForGroup.map((market) => {
                                    const status = getMarketStatus(market);
                                    return (
                                        <div key={market._id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-5 lg:p-6 hover:border-yellow-500/50 transition-colors min-w-0 overflow-hidden">
                                            <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                                                <div className={`${status.color} text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full inline-block shrink-0`}>
                                                    {status.status === 'open' && 'OPEN'}
                                                    {status.status === 'running' && 'CLOSED IS RUNNING'}
                                                    {status.status === 'closed' && 'CLOSED'}
                                                </div>
                                                <div className="min-w-0 overflow-hidden flex justify-end">
                                                    <span className="text-amber-400 font-mono text-sm sm:text-base whitespace-nowrap truncate inline-block max-w-full tracking-widest" title={market.displayResult || market.winNumber || ''}>
                                                        {(() => {
                                                            const raw = market.displayResult || market.winNumber || (market.openingNumber && market.closingNumber ? `${market.openingNumber}-${market.closingNumber}` : '') || (market.openingNumber ? String(market.openingNumber) : '');
                                                            return raw ? String(raw).replace(/-/g, '_') : '';
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 truncate" title={market.marketName}>{market.marketName}</h3>
                                            <div className="space-y-1.5 sm:space-y-2 mb-4 text-xs sm:text-sm text-gray-300 min-w-0">
                                                {market.startingTime && <p className="truncate"><span className="font-semibold">Opening:</span> {formatTime12h(market.startingTime)}</p>}
                                                <p className="truncate"><span className="font-semibold">Closing:</span> {formatTime12h(market.closingTime || market.startingTime)}</p>
                                                {market.betClosureTime != null && market.betClosureTime !== '' && <p><span className="font-semibold">Bet Closure:</span> {market.betClosureTime} sec</p>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                                <button onClick={() => navigate(`/market-result/${market._id}`)} className="px-2 sm:px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0">View</button>
                                                <button onClick={() => setAddResultMarket(market)} className="px-2 sm:px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0">Add Result</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-w-0 w-full max-w-full">
                        {markets.length === 0 ? (
                            <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                                No markets in this category.
                            </div>
                        ) : markets.map((market) => {
                            const status = getMarketStatus(market);
                            return (
                                <div
                                    key={market._id}
                                    className="bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-5 lg:p-6 hover:border-yellow-500/50 transition-colors min-w-0 overflow-hidden"
                                >
                                    {/* Top row: Status (left) + Result (right) */}
                                    <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                                        <div className={`${status.color} text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full inline-block shrink-0`}>
                                            {status.status === 'open' && 'OPEN'}
                                            {status.status === 'running' && 'CLOSED IS RUNNING'}
                                            {status.status === 'closed' && 'CLOSED'}
                                        </div>
                                        <div className="min-w-0 overflow-hidden flex justify-end">
                                            <span className="text-amber-400 font-mono text-sm sm:text-base whitespace-nowrap truncate inline-block max-w-full tracking-widest" title={market.displayResult || market.winNumber || ''}>
                                                {(() => {
                                                    const raw = market.displayResult || market.winNumber || 
                                                        (market.openingNumber && market.closingNumber ? `${market.openingNumber}-${market.closingNumber}` : '') ||
                                                        (market.openingNumber ? String(market.openingNumber) : '');
                                                    if (!raw) return '';
                                                    return String(raw).replace(/-/g, '_');
                                                })()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Market Info */}
                                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 truncate" title={market.marketName}>{market.marketName}</h3>
                                    <div className="space-y-1.5 sm:space-y-2 mb-4 text-xs sm:text-sm text-gray-300 min-w-0">
                                        {market.startingTime && (
                                        <p className="truncate"><span className="font-semibold">Opening:</span> {formatTime12h(market.startingTime)}</p>
                                        )}
                                        <p className="truncate"><span className="font-semibold">Closing:</span> {formatTime12h(market.closingTime || market.startingTime)}</p>
                                        {market.betClosureTime != null && market.betClosureTime !== '' && (
                                            <p><span className="font-semibold">Bet Closure:</span> {market.betClosureTime} sec</p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                        <button
                                            onClick={() => navigate(`/market-result/${market._id}`)}
                                            className="px-2 sm:px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => setAddResultMarket(market)}
                                            className="px-2 sm:px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0"
                                        >
                                            Add Result
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                        )}
                    </section>
                )}
            </div>
            {addResultMarket && (
                <AddResultModal
                    market={addResultMarket}
                    onClose={() => setAddResultMarket(null)}
                    onSuccess={fetchMarkets}
                />
            )}
        </AdminLayout>
    );
};

export default MarketResult;
