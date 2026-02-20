import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { FaExclamationTriangle, FaChartBar, FaStar, FaCrown } from 'react-icons/fa';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';

const ADD_RESULT_TABS = [
    { id: 'regular', label: 'Regular Market', icon: FaChartBar },
    { id: 'starline', label: 'Starline Market', icon: FaStar },
    { id: 'king', label: 'King Bazaar Market', icon: FaCrown },
];

/** Safe number for preview: avoids NaN in UI */
const safeNum = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

/** Format "10:15" or "10:15:00" to "10:15" for display */
const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const parts = String(timeStr).split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? String(parseInt(parts[1], 10)).padStart(2, '0') : '00';
    return `${Number.isFinite(h) ? h : ''}:${m}`;
};

/** Format HH:mm to 12-hour with AM/PM (same as MarketList) */
const formatTime12h = (timeStr) => {
    const s = (timeStr || '').toString().trim().slice(0, 5);
    const [hh, mm] = s.split(':');
    const h = parseInt(hh, 10) || 0;
    const m = parseInt(mm, 10) || 0;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
};

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

/** Same status logic as MarketList. Starline: single openingNumber = closed. */
const getMarketStatus = (market) => {
    const type = (market.marketType || '').toString().toLowerCase();
    const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
    const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
    if (type === 'startline' && hasOpening) return { status: 'closed', color: 'bg-red-600' };
    if (hasOpening && hasClosing) return { status: 'closed', color: 'bg-red-600' };
    if (hasOpening && !hasClosing) return { status: 'running', color: 'bg-green-600' };
    if (isClosingTimePassedIST(market.closingTime || market.startingTime)) return { status: 'closed', color: 'bg-red-600' };
    return { status: 'open', color: 'bg-green-600' };
};

const AddResult = () => {
    const location = useLocation();
    const preselectedFromNav = location.state?.preselectedMarket;
    const [markets, setMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMarket, setSelectedMarket] = useState(() => preselectedFromNav || null);
    const [openPatti, setOpenPatti] = useState(() => (preselectedFromNav?.openingNumber ?? '').toString().replace(/\D/g, '').slice(0, 3));
    const [closePatti, setClosePatti] = useState(() => (preselectedFromNav?.closingNumber ?? '').toString().replace(/\D/g, '').slice(0, 3));
    const [preview, setPreview] = useState(null);
    const [previewClose, setPreviewClose] = useState(null);
    const [checkLoading, setCheckLoading] = useState(false);
    const [checkCloseLoading, setCheckCloseLoading] = useState(false);
    const [declareLoading, setDeclareLoading] = useState(false);
    const [clearLoading, setClearLoading] = useState(false);
    const [marketsPendingResult, setMarketsPendingResult] = useState(0);
    const [marketsPendingResultList, setMarketsPendingResultList] = useState([]);
    const [isDirectEditMode, setIsDirectEditMode] = useState(() => !!(preselectedFromNav?._id));
    const [activeTab, setActiveTab] = useState('regular');
    const [starlineMarkets, setStarlineMarkets] = useState([]);
    const [kingBazaarMarkets, setKingBazaarMarkets] = useState([]);
    const [starlineGroups, setStarlineGroups] = useState([]);
    const [kingBazaarGroups, setKingBazaarGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [activeGroupKey, setActiveGroupKey] = useState('');
    const [kingBazaarJodi, setKingBazaarJodi] = useState('');
    const navigate = useNavigate();

    const mainPendingList = useMemo(
        () => (marketsPendingResultList || []).filter((m) => {
            const type = (m.marketType || '').toString().toLowerCase();
            return type !== 'startline' && type !== 'king';
        }),
        [marketsPendingResultList]
    );
    const starlinePendingList = useMemo(
        () => (marketsPendingResultList || []).filter((m) => (m.marketType || '').toString().toLowerCase() === 'startline'),
        [marketsPendingResultList]
    );
    const kingBazaarPendingList = useMemo(
        () => (marketsPendingResultList || []).filter((m) => (m.marketType || '').toString().toLowerCase() === 'king'),
        [marketsPendingResultList]
    );
    const mainPendingCount = mainPendingList.length;
    const starlinePendingCount = starlinePendingList.length;
    const kingBazaarPendingCount = kingBazaarPendingList.length;

    const fetchMarketsPendingResult = async () => {
        try {
            const d = new Date();
            const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const res = await adminFetch(`${API_BASE_URL}/dashboard/stats?from=${from}&to=${from}`);
            const data = await res.json();
            if (data.success && data.data) {
                setMarketsPendingResult(data.data.marketsPendingResult || 0);
                setMarketsPendingResultList(data.data.marketsPendingResultList || []);
            }
        } catch (_) {
            setMarketsPendingResult(0);
            setMarketsPendingResultList([]);
        }
    };

    const fetchMarkets = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch(`${API_BASE_URL}/markets/get-markets`);
            const data = await response.json();
            if (data.success) {
                const all = data.data || [];
                setMarkets(all.filter((m) => m.marketType !== 'startline' && m.marketType !== 'king'));
                setStarlineMarkets(all.filter((m) => m.marketType === 'startline'));
                setKingBazaarMarkets(all.filter((m) => m.marketType === 'king'));
            } else {
                setError('Failed to fetch markets');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

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
                    if (activeGroupKey && !list.some((g) => (g.key || '').toLowerCase() === activeGroupKey.toLowerCase())) setActiveGroupKey('');
                } else {
                    if (activeTab === 'starline') setStarlineGroups([]);
                    else setKingBazaarGroups([]);
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

    useEffect(() => {
        const admin = localStorage.getItem('admin');
        if (!admin) {
            navigate('/');
            return;
        }
        fetchMarkets();
        fetchMarketsPendingResult();
    }, [navigate]);

    useEffect(() => {
        const type = (location.state?.marketType || '').toString().toLowerCase();
        if (type === 'starline') { setActiveTab('starline'); setActiveGroupKey(''); }
        if (type === 'king') { setActiveTab('king'); setActiveGroupKey(''); }
    }, [location.state?.marketType]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setActiveGroupKey('');
    };

    const safeNumOrder = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

    /** Slots for current Starline/King group */
    const slotsForGroup = useMemo(() => {
        if ((activeTab !== 'starline' && activeTab !== 'king') || !activeGroupKey) return [];
        const key = activeGroupKey.toString().trim().toLowerCase();
        const groupField = activeTab === 'starline' ? 'starlineGroup' : 'kingBazaarGroup';
        const list = activeTab === 'starline' ? starlineMarkets : kingBazaarMarkets;
        return (list || []).filter((m) => (m[groupField] || '').toString().trim().toLowerCase() === key)
            .sort((a, b) => String(a.closingTime || a.startingTime || '').localeCompare(String(b.closingTime || b.startingTime || ''), undefined, { numeric: true }));
    }, [starlineMarkets, kingBazaarMarkets, activeTab, activeGroupKey]);

    const groups = activeTab === 'starline' ? starlineGroups : kingBazaarGroups;

    useEffect(() => {
        if (!preselectedFromNav?._id) return;
        navigate('/add-result', { replace: true, state: {} });
    }, [preselectedFromNav?._id, navigate]);

    useRefreshOnMarketReset(() => {
        fetchMarkets();
        fetchMarketsPendingResult();
    });

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const openPanelForEdit = (market) => {
        setSelectedMarket(market);
        const isKing = market.marketType === 'king';
        if (isKing) {
            // For King Bazaar: extract jodi from the display result or construct from opening/closing numbers
            if (market.displayResult && /^\d{2}$/.test(market.displayResult)) {
                setKingBazaarJodi(market.displayResult);
            } else if (market.openingNumber != null && market.closingNumber != null) {
                const first = String(market.openingNumber)[0] || '0';
                const second = String(market.closingNumber)[0] || '0';
                setKingBazaarJodi(first + second);
            } else {
                setKingBazaarJodi('');
            }
        } else {
            setOpenPatti(market.openingNumber || '');
            setClosePatti(market.closingNumber || '');
        }
        setPreview(null);
        setPreviewClose(null);
    };

    const closePanel = () => {
        setIsDirectEditMode(false);
        setSelectedMarket(null);
        setOpenPatti('');
        setClosePatti('');
        setKingBazaarJodi('');
        setPreview(null);
        setPreviewClose(null);
    };

    const getMarketId = () => {
        if (!selectedMarket) return null;
        const id = selectedMarket._id ?? selectedMarket.id;
        return id != null ? String(id) : null;
    };

    const handleCheckOpen = async () => {
        if (!selectedMarket) return;
        const marketId = getMarketId();
        if (!marketId) return;
        const val = openPatti.replace(/\D/g, '').slice(0, 3);
        if (val.length !== 3) {
            setPreview(null);
            return;
        }
        setCheckLoading(true);
        setPreview(null);
        try {
            const previewRes = await adminFetch(`${API_BASE_URL}/markets/preview-declare-open/${encodeURIComponent(marketId)}?openingNumber=${encodeURIComponent(val)}`);
            const previewData = await previewRes.json();
            if (previewData.success && previewData.data != null) {
                const totalBetAmount = safeNum(previewData.data.totalBetAmount);
                const totalBetAmountOnPatti = safeNum(previewData.data.totalBetAmountOnPatti);
                const totalWinAmountOnPatti = safeNum(previewData.data.totalWinAmountOnPatti);
                const totalPlayersBetOnPatti = safeNum(previewData.data.totalPlayersBetOnPatti);
                setPreview({
                    totalBetAmount,
                    totalBetAmountOnPatti,
                    totalWinAmountOnPatti,
                    noOfPlayers: safeNum(previewData.data.noOfPlayers),
                    totalPlayersBetOnPatti,
                    profit: safeNum(previewData.data.profit),
                    totalBetAmountHalfSangam: safeNum(previewData.data.totalBetAmountHalfSangam),
                    totalBetsHalfSangam: safeNum(previewData.data.totalBetsHalfSangam),
                });
            } else {
                setPreview({
                    totalBetAmount: 0,
                    totalBetAmountOnPatti: 0,
                    totalWinAmountOnPatti: 0,
                    noOfPlayers: 0,
                    totalPlayersBetOnPatti: 0,
                    profit: 0,
                });
            }
        } catch (err) {
            setPreview(null);
        } finally {
            setCheckLoading(false);
        }
    };

    const handleCheckClose = async () => {
        if (!selectedMarket) return;
        const marketId = getMarketId();
        if (!marketId) return;
        const val = closePatti.replace(/\D/g, '').slice(0, 3);
        if (val.length !== 3) {
            setPreviewClose(null);
            return;
        }
        setCheckCloseLoading(true);
        setPreviewClose(null);
        try {
            const url = `${API_BASE_URL}/markets/preview-declare-close/${encodeURIComponent(marketId)}?closingNumber=${encodeURIComponent(val)}`;
            const res = await adminFetch(url);
            const data = await res.json();
            if (data.success && data.data != null) {
                setPreviewClose({
                    totalBetAmount: safeNum(data.data.totalBetAmount),
                    totalBetAmountOnPatti: safeNum(data.data.totalBetAmountOnPatti),
                    totalWinAmountOnPatti: safeNum(data.data.totalWinAmountOnPatti),
                    noOfPlayers: safeNum(data.data.noOfPlayers),
                    totalPlayersBetOnPatti: safeNum(data.data.totalPlayersBetOnPatti),
                    profit: safeNum(data.data.profit),
                    totalBetAmountHalfSangam: safeNum(data.data.totalBetAmountHalfSangam),
                    totalWinAmountHalfSangam: safeNum(data.data.totalWinAmountHalfSangam),
                    totalBetsHalfSangam: safeNum(data.data.totalBetsHalfSangam),
                });
            } else {
                setPreviewClose({
                    totalBetAmount: 0,
                    totalBetAmountOnPatti: 0,
                    totalWinAmountOnPatti: 0,
                    noOfPlayers: 0,
                    totalPlayersBetOnPatti: 0,
                    profit: 0,
                    totalBetAmountHalfSangam: 0,
                    totalWinAmountHalfSangam: 0,
                    totalBetsHalfSangam: 0,
                });
            }
        } catch (err) {
            setPreviewClose(null);
        } finally {
            setCheckCloseLoading(false);
        }
    };

    const handleDeclareOpen = () => {
        if (!selectedMarket) return;
        const val = openPatti.replace(/\D/g, '').slice(0, 3);
        if (val.length !== 3) {
            alert('Please enter a 3-digit Open Patti.');
            return;
        }
        navigate('/declare-confirm', { state: { market: selectedMarket, declareType: 'open', number: val } });
    };

    const handleDeclareClose = () => {
        if (!selectedMarket) return;
        const val = closePatti.replace(/\D/g, '').slice(0, 3);
        if (val.length !== 3) {
            alert('Please enter a 3-digit Close Patti.');
            return;
        }
        navigate('/declare-confirm', { state: { market: selectedMarket, declareType: 'close', number: val } });
    };

    const handleCheckKingBazaar = async () => {
        if (!selectedMarket) return;
        const marketId = getMarketId();
        if (!marketId) return;
        const val = kingBazaarJodi.replace(/\D/g, '').slice(0, 2);
        if (val.length !== 2) {
            setPreview(null);
            return;
        }
        const firstDigit = val[0];
        const secondDigit = val[1];
        setCheckLoading(true);
        setPreview(null);
        try {
            const previewRes = await adminFetch(`${API_BASE_URL}/markets/preview-declare-king-bazaar/${encodeURIComponent(marketId)}?firstDigit=${encodeURIComponent(firstDigit)}&secondDigit=${encodeURIComponent(secondDigit)}`);
            const previewData = await previewRes.json();
            if (previewData.success && previewData.data != null) {
                const totalBetAmount = safeNum(previewData.data.totalBetAmount);
                const totalBetAmountOnPatti = safeNum(previewData.data.totalBetAmountOnPatti);
                const totalWinAmountOnPatti = safeNum(previewData.data.totalWinAmountOnPatti);
                const totalPlayersBetOnPatti = safeNum(previewData.data.totalPlayersBetOnPatti);
                setPreview({
                    totalBetAmount,
                    totalBetAmountOnPatti,
                    totalWinAmountOnPatti,
                    noOfPlayers: safeNum(previewData.data.noOfPlayers),
                    totalPlayersBetOnPatti,
                    profit: totalBetAmount - totalWinAmountOnPatti,
                });
            } else {
                setPreview({
                    totalBetAmount: 0,
                    totalBetAmountOnPatti: 0,
                    totalWinAmountOnPatti: 0,
                    noOfPlayers: 0,
                    totalPlayersBetOnPatti: 0,
                    profit: 0,
                });
            }
        } catch (err) {
            setPreview(null);
        } finally {
            setCheckLoading(false);
        }
    };

    const handleDeclareKingBazaar = () => {
        if (!selectedMarket) return;
        const val = kingBazaarJodi.replace(/\D/g, '').slice(0, 2);
        if (val.length !== 2) {
            alert('Please enter a 2-digit Jodi (00-99).');
            return;
        }
        const firstDigit = val[0];
        const secondDigit = val[1];
        navigate('/declare-confirm', { state: { market: selectedMarket, declareType: 'king', firstDigit, secondDigit } });
    };

    const handleClearResult = async () => {
        if (!selectedMarket) return;
        const hasOpen = selectedMarket.openingNumber && /^\d{3}$/.test(selectedMarket.openingNumber);
        const hasClose = selectedMarket.closingNumber && /^\d{3}$/.test(selectedMarket.closingNumber);
        if (!hasOpen && !hasClose) {
            alert('This market has no result to clear.');
            return;
        }
        const msg = hasOpen && hasClose
            ? 'Clear Opening & Closing result for this market?'
            : hasOpen
                ? 'Clear Opening result for this market?'
                : 'Clear Closing result for this market?';
        if (!window.confirm(msg)) return;
        setClearLoading(true);
        try {
            const res = await adminFetch(`${API_BASE_URL}/markets/clear-result/${selectedMarket._id}`, {
                method: 'POST',
            });
            const data = await res.json();
            if (data.success) {
                setSelectedMarket((prev) => (prev ? { ...prev, openingNumber: null, closingNumber: null } : null));
                setOpenPatti('');
                setClosePatti('');
                setPreview(null);
                setPreviewClose(null);
                fetchMarkets();
            } else {
                alert(data.message || 'Failed to clear result');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setClearLoading(false);
        }
    };

    const formatNum = (n) => (n != null && Number.isFinite(n) ? Number(n).toLocaleString('en-IN') : '0');

    return (
        <AdminLayout onLogout={handleLogout} title="Declare Result">
            <div className="w-full min-w-0 px-3 sm:px-4 md:px-6 pb-6 sm:pb-8">
                {error && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-xs sm:text-sm md:text-base">
                        {error}
                    </div>
                )}

                {activeTab === 'regular' && mainPendingCount > 0 && !isDirectEditMode && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/40 rounded-lg overflow-hidden">
                        <h3 className="text-xs sm:text-sm font-semibold text-amber-400 flex items-center gap-2 mb-2 flex-wrap">
                            <FaExclamationTriangle className="w-4 h-4 shrink-0" />
                            Regular market result declaration pending
                        </h3>
                        <p className="text-amber-200/90 text-xs sm:text-sm break-words">
                            {mainPendingCount} market{mainPendingCount !== 1 ? 's' : ''} need{mainPendingCount === 1 ? 's' : ''} result declaration: {mainPendingList.map((m) => m.marketName).join(', ')}
                        </p>
                        <p className="text-amber-200/70 text-[11px] sm:text-xs mt-2">
                            Betting has closed for these markets. Declare the result below to settle bets.
                        </p>
                    </div>
                )}

                {activeTab === 'starline' && starlinePendingCount > 0 && !isDirectEditMode && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/40 rounded-lg overflow-hidden">
                        <h3 className="text-xs sm:text-sm font-semibold text-amber-400 flex items-center gap-2 mb-2 flex-wrap">
                            <FaExclamationTriangle className="w-4 h-4 shrink-0" />
                            Starline slot result declaration pending
                        </h3>
                        <p className="text-amber-200/90 text-xs sm:text-sm break-words">
                            {starlinePendingCount} slot{starlinePendingCount !== 1 ? 's' : ''} need{starlinePendingCount === 1 ? 's' : ''} result declaration: {starlinePendingList.map((m) => m.marketName).join(', ')}
                        </p>
                        <p className="text-amber-200/70 text-[11px] sm:text-xs mt-2">
                            Declare Open Patti for these slots below.
                        </p>
                    </div>
                )}

                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-white text-center sm:text-left">
                    {isDirectEditMode ? 'Edit Result' : 'Declare Result'}
                </h1>

                {/* Top tabs: Regular | Starline | King Bazaar */}
                <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                    {ADD_RESULT_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleTabChange(tab.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all ${
                                    isActive
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
                                }`}
                            >
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {activeTab === 'starline' && (
                    <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
                        <div className="flex-1 min-w-0 w-full">
                            {activeGroupKey ? (
                                <>
                                    <nav className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                                        <button type="button" onClick={() => setActiveGroupKey('')} className="hover:text-amber-400 transition-colors">Starline</button>
                                        <span>/</span>
                                        <span className="text-white font-medium">{groups.find((g) => (g.key || '').toLowerCase() === activeGroupKey.toLowerCase())?.label || activeGroupKey}</span>
                                    </nav>
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                            <span className="inline-block w-1 h-6 sm:h-7 bg-gray-500 rounded-full" />
                                            Time Slots
                                        </h2>
                                        <button type="button" onClick={() => setActiveGroupKey('')} className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm font-medium">← Back to list</button>
                                    </div>
                                </>
                            ) : null}
                            {(loading || loadingGroups) ? (
                                <div className="text-center py-8 sm:py-12 text-gray-400 text-xs sm:text-sm rounded-xl border border-gray-700 bg-gray-800/50">Loading Starline...</div>
                            ) : !activeGroupKey ? (
                                groups.length === 0 ? (
                                    <div className="rounded-2xl border border-amber-500/40 bg-gray-800/50 p-6 sm:p-8 text-center">
                                        <p className="text-gray-400 text-sm mb-4">No Starline markets yet. Add from Markets → Starline Market.</p>
                                        <Link to="/markets" state={{ marketType: 'starline' }} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm"><FaStar className="w-4 h-4" /> Go to Starline Market</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-w-0 w-full max-w-full">
                                        {groups.sort((a, b) => (safeNumOrder(a.order) - safeNumOrder(b.order)) || (a.label || '').localeCompare(b.label || '')).map((g) => {
                                            const groupSlots = (starlineMarkets || []).filter((m) => (m.starlineGroup || '').toString().toLowerCase() === (g.key || '').toLowerCase());
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
                                                    <button type="button" onClick={() => setActiveGroupKey(g.key)} className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-sm font-semibold">View Slots</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-w-0 w-full max-w-full">
                                    {slotsForGroup.length === 0 ? (
                                        <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">No slots in this market.</div>
                                    ) : slotsForGroup.map((m) => {
                                        const status = getMarketStatus(m);
                                        const resultRaw = m.displayResult || m.winNumber || (m.openingNumber ? String(m.openingNumber) : '');
                                        const isPending = starlinePendingList.some((p) => String(p._id) === String(m._id) || p.marketName === m.marketName);
                                        return (
                                            <div key={m._id} className={`bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-5 lg:p-6 hover:border-yellow-500/50 transition-colors min-w-0 overflow-hidden ${isPending ? 'ring-1 ring-amber-500/50' : ''}`}>
                                                <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                                                    <div className={`${status.color} text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full inline-block shrink-0`}>{status.status === 'open' && 'OPEN'}{status.status === 'closed' && 'CLOSED'}</div>
                                                    {isPending && <FaExclamationTriangle className="w-4 h-4 text-amber-400 shrink-0" title="Result pending" />}
                                                    <div className="min-w-0 overflow-hidden flex justify-end">
                                                        <span className="text-amber-400 font-mono text-sm sm:text-base whitespace-nowrap truncate inline-block max-w-full tracking-widest">{resultRaw ? String(resultRaw).replace(/-/g, '_') : ''}</span>
                                                    </div>
                                                </div>
                                                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 truncate" title={m.marketName}>{m.marketName}</h3>
                                                <div className="space-y-1.5 sm:space-y-2 mb-4 text-xs sm:text-sm text-gray-300 min-w-0">
                                                    <p className="truncate"><span className="font-semibold">Closing:</span> {formatTime12h(m.closingTime || m.startingTime)}</p>
                                                    {m.betClosureTime != null && m.betClosureTime !== '' && <p><span className="font-semibold">Bet Closure:</span> {m.betClosureTime} sec</p>}
                                                </div>
                                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                                    <button type="button" onClick={() => navigate(`/add-result/view/${m._id}`)} className="px-2 sm:px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0">View</button>
                                                    <button type="button" onClick={() => openPanelForEdit(m)} className="px-2 sm:px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0">{m.openingNumber && /^\d{3}$/.test(String(m.openingNumber)) ? 'Edit result' : 'Add result'}</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'king' && kingBazaarPendingCount > 0 && !isDirectEditMode && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/40 rounded-lg overflow-hidden">
                        <h3 className="text-xs sm:text-sm font-semibold text-amber-400 flex items-center gap-2 mb-2 flex-wrap">
                            <FaExclamationTriangle className="w-4 h-4 shrink-0" />
                            King Bazaar slot result declaration pending
                        </h3>
                        <p className="text-amber-200/90 text-xs sm:text-sm break-words">
                            {kingBazaarPendingCount} slot{kingBazaarPendingCount !== 1 ? 's' : ''} need{kingBazaarPendingCount === 1 ? 's' : ''} result declaration: {kingBazaarPendingList.map((m) => m.marketName).join(', ')}
                        </p>
                        <p className="text-amber-200/70 text-[11px] sm:text-xs mt-2">
                            Declare First Digit and Second Digit for these slots below.
                        </p>
                    </div>
                )}

                {activeTab === 'king' && (
                    <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
                        <div className="flex-1 min-w-0 w-full">
                            {activeGroupKey ? (
                                <>
                                    <nav className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                                        <button type="button" onClick={() => setActiveGroupKey('')} className="hover:text-amber-400 transition-colors">King Bazaar</button>
                                        <span>/</span>
                                        <span className="text-white font-medium">{groups.find((g) => (g.key || '').toLowerCase() === activeGroupKey.toLowerCase())?.label || activeGroupKey}</span>
                                    </nav>
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                            <span className="inline-block w-1 h-6 sm:h-7 bg-gray-500 rounded-full" />
                                            Time Slots
                                        </h2>
                                        <button type="button" onClick={() => setActiveGroupKey('')} className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm font-medium">← Back to list</button>
                                    </div>
                                </>
                            ) : null}
                            {(loading || loadingGroups) ? (
                                <div className="text-center py-8 sm:py-12 text-gray-400 text-xs sm:text-sm rounded-xl border border-gray-700 bg-gray-800/50">Loading King Bazaar...</div>
                            ) : !activeGroupKey ? (
                                groups.length === 0 ? (
                                    <div className="rounded-2xl border border-amber-500/40 bg-gray-800/50 p-6 sm:p-8 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4"><FaCrown className="w-8 h-8 text-amber-400" /></div>
                                        <p className="text-gray-400 text-sm mb-4">No King Bazaar markets yet. Add from Markets → King Bazaar Market.</p>
                                        <Link to="/markets" state={{ marketType: 'king' }} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm"><FaCrown className="w-4 h-4" /> Go to King Bazaar Market</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-w-0 w-full max-w-full">
                                        {groups.sort((a, b) => (safeNumOrder(a.order) - safeNumOrder(b.order)) || (a.label || '').localeCompare(b.label || '')).map((g) => {
                                            const groupSlots = (kingBazaarMarkets || []).filter((m) => (m.kingBazaarGroup || '').toString().toLowerCase() === (g.key || '').toLowerCase());
                                            const slotCount = groupSlots.length;
                                            const declaredCount = groupSlots.filter((m) => m.openingNumber != null && m.closingNumber != null).length;
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
                                                    <button type="button" onClick={() => setActiveGroupKey(g.key)} className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-sm font-semibold">View Slots</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-w-0 w-full max-w-full">
                                    {slotsForGroup.length === 0 ? (
                                        <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">No slots in this market.</div>
                                    ) : slotsForGroup.map((m) => {
                                        const status = getMarketStatus(m);
                                        const resultRaw = m.displayResult || m.winNumber || (m.openingNumber != null && m.closingNumber != null ? `${m.openingNumber}-${m.closingNumber}` : '') || (m.openingNumber ? String(m.openingNumber) : '');
                                        const isPending = kingBazaarPendingList.some((p) => String(p._id) === String(m._id) || p.marketName === m.marketName);
                                        const hasResult = m.openingNumber != null && m.closingNumber != null;
                                        return (
                                            <div key={m._id} className={`bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-5 lg:p-6 hover:border-yellow-500/50 transition-colors min-w-0 overflow-hidden ${isPending ? 'ring-1 ring-amber-500/50' : ''}`}>
                                                <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                                                    <div className={`${status.color} text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full inline-block shrink-0`}>
                                                        {status.status === 'open' && 'OPEN'}
                                                        {status.status === 'running' && 'CLOSED IS RUNNING'}
                                                        {status.status === 'closed' && 'CLOSED'}
                                                    </div>
                                                    {isPending && <FaExclamationTriangle className="w-4 h-4 text-amber-400 shrink-0" title="Result pending" />}
                                                    <div className="min-w-0 overflow-hidden flex justify-end">
                                                        <span className="text-amber-400 font-mono text-sm sm:text-base whitespace-nowrap truncate inline-block max-w-full tracking-widest">{resultRaw ? String(resultRaw).replace(/-/g, '_') : ''}</span>
                                                    </div>
                                                </div>
                                                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 truncate" title={m.marketName}>{m.marketName}</h3>
                                                <div className="space-y-1.5 sm:space-y-2 mb-4 text-xs sm:text-sm text-gray-300 min-w-0">
                                                    <p className="truncate"><span className="font-semibold">Opening:</span> {formatTime12h(m.startingTime)}</p>
                                                    <p className="truncate"><span className="font-semibold">Closing:</span> {formatTime12h(m.closingTime || m.startingTime)}</p>
                                                    {m.betClosureTime != null && m.betClosureTime !== '' && <p><span className="font-semibold">Bet Closure:</span> {m.betClosureTime} sec</p>}
                                                </div>
                                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                                    <button type="button" onClick={() => navigate(`/add-result/view/${m._id}`)} className="px-2 sm:px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0">View</button>
                                                    <button type="button" onClick={() => openPanelForEdit(m)} className="px-2 sm:px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0">{hasResult ? 'Edit result' : 'Add result'}</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'regular' && (
                <div className="flex flex-col gap-4 sm:gap-6">
                    <div className="flex-1 min-w-0 w-full">
                        {loading ? (
                            <div className="text-center py-8 sm:py-12 text-gray-400 text-xs sm:text-sm md:text-base rounded-xl border border-gray-700 bg-gray-800/50">Loading markets...</div>
                        ) : markets.length === 0 ? (
                            <div className="text-center py-8 sm:py-12 text-gray-400 text-xs sm:text-sm md:text-base rounded-xl border border-gray-700 bg-gray-800/50">No markets found.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-w-0 w-full max-w-full">
                                {markets.map((market) => {
                                    const status = getMarketStatus(market);
                                    const resultRaw = market.displayResult || market.winNumber || (market.openingNumber && market.closingNumber ? `${market.openingNumber}-${market.closingNumber}` : '') || '';
                                    const isPendingResult = mainPendingList.some((m) => String(m._id) === String(market._id) || m.marketName === market.marketName);
                                    return (
                                        <div key={market._id} className={`bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-5 lg:p-6 hover:border-yellow-500/50 transition-colors min-w-0 overflow-hidden ${isPendingResult ? 'ring-1 ring-amber-500/50' : ''}`}>
                                            <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                                                <div className={`${status.color} text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full inline-block shrink-0`}>
                                                    {status.status === 'open' && 'OPEN'}
                                                    {status.status === 'running' && 'CLOSED IS RUNNING'}
                                                    {status.status === 'closed' && 'CLOSED'}
                                                </div>
                                                {isPendingResult && <FaExclamationTriangle className="w-4 h-4 text-amber-400 shrink-0" title="Result pending" />}
                                                <div className="min-w-0 overflow-hidden flex justify-end">
                                                    <span className="text-amber-400 font-mono text-sm sm:text-base whitespace-nowrap truncate inline-block max-w-full tracking-widest">{resultRaw ? String(resultRaw).replace(/-/g, '_') : ''}</span>
                                                </div>
                                            </div>
                                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 truncate" title={market.marketName}>{market.marketName}</h3>
                                            <div className="space-y-1.5 sm:space-y-2 mb-4 text-xs sm:text-sm text-gray-300 min-w-0">
                                                <p className="truncate"><span className="font-semibold">Opening:</span> {formatTime12h(market.startingTime)}</p>
                                                <p className="truncate"><span className="font-semibold">Closing:</span> {formatTime12h(market.closingTime)}</p>
                                                {market.betClosureTime != null && market.betClosureTime !== '' && <p><span className="font-semibold">Bet Closure:</span> {market.betClosureTime} sec</p>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                                <button type="button" onClick={() => navigate(`/add-result/view/${market._id}`)} className="px-2 sm:px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0">View</button>
                                                <button type="button" onClick={() => openPanelForEdit(market)} className="px-2 sm:px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0">Edit Result</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* Add Result modal – opens above screen for small & large devices */}
                {selectedMarket && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto"
                        onClick={closePanel}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-result-modal-title"
                    >
                        <div
                            className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col my-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-700 bg-gray-800 shrink-0">
                                <h2 id="add-result-modal-title" className="text-base sm:text-lg font-bold text-yellow-500 truncate pr-2" title={selectedMarket.marketName}>
                                    {selectedMarket.marketName}
                                </h2>
                                <button
                                    type="button"
                                    onClick={closePanel}
                                    className="shrink-0 p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors touch-manipulation"
                                    aria-label="Close"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="p-4 sm:p-5 md:p-6 overflow-y-auto">
                                {getMarketId() && (
                                    <p className="text-[11px] text-gray-500 mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="font-mono text-gray-400">ID: {getMarketId()}</span>
                                        <Link to={`/markets/${getMarketId()}`} className="text-amber-400 hover:underline shrink-0" onClick={(e) => e.stopPropagation()}>View details</Link>
                                    </p>
                                )}

                                {/* King Bazaar Result */}
                                {selectedMarket.marketType === 'king' ? (
                                <div className="mb-4 sm:mb-6">
                                    <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">King Bazaar Result</h3>
                                    <p className="text-[11px] text-gray-500 mb-2 sm:mb-3">Enter 2-digit Jodi (00-99) → Check (preview) → Declare Result</p>
                                    <div className="mb-2 sm:mb-3">
                                        <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Jodi (2 digits)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={kingBazaarJodi}
                                            onChange={(e) => setKingBazaarJodi(e.target.value.replace(/\D/g, '').slice(0, 2))}
                                            placeholder="e.g. 56"
                                            className="w-full px-3 py-2.5 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg sm:text-xl font-mono placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[44px] sm:min-h-[48px] touch-manipulation"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div className="flex gap-2 mb-2 sm:mb-3">
                                        <button
                                            type="button"
                                            onClick={handleCheckKingBazaar}
                                            disabled={checkLoading || kingBazaarJodi.replace(/\D/g, '').length !== 2}
                                            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg border border-gray-600 disabled:opacity-50 transition-colors text-sm sm:text-base"
                                        >
                                            {checkLoading ? 'Checking...' : 'Check'}
                                        </button>
                                    </div>
                                    {preview != null && (
                                        <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 rounded-lg bg-gray-700/50 border border-gray-600 p-2.5 sm:p-3">
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Amount</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(preview.totalBetAmount)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Bet Amount</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(preview.totalBetAmountOnPatti)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Win Amount</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(preview.totalWinAmountOnPatti)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total no of players</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm">{formatNum(preview.noOfPlayers)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Win Players</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm">{formatNum(preview.totalPlayersBetOnPatti)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">total Profit</span><span className="font-mono text-yellow-400 bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(preview.profit)}</span></div>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleDeclareKingBazaar}
                                        disabled={declareLoading || kingBazaarJodi.replace(/\D/g, '').length !== 2}
                                        className="w-full px-4 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all text-sm sm:text-base"
                                    >
                                        {declareLoading ? 'Declaring...' : 'Declare Result'}
                                    </button>
                                </div>
                                ) : (
                                <>
                                {/* Open Result */}
                                <div className="mb-4 sm:mb-6">
                                    <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Open Result</h3>
                                    <p className="text-[11px] text-gray-500 mb-2 sm:mb-3">Enter 3 digits → Check (preview) → Declare Open</p>
                                    <div className="mb-2 sm:mb-3">
                                        <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Open Patti (3 digits)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={openPatti}
                                            onChange={(e) => setOpenPatti(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                            placeholder="e.g. 156"
                                            className="w-full px-3 py-2.5 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg sm:text-xl font-mono placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[44px] sm:min-h-[48px] touch-manipulation"
                                            maxLength={3}
                                        />
                                    </div>
                                    <div className="flex gap-2 mb-2 sm:mb-3">
                                        <button
                                            type="button"
                                            onClick={handleCheckOpen}
                                            disabled={checkLoading || openPatti.replace(/\D/g, '').length !== 3}
                                            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg border border-gray-600 disabled:opacity-50 transition-colors text-sm sm:text-base"
                                        >
                                            {checkLoading ? 'Checking...' : 'Check'}
                                        </button>
                                    </div>
                                    {preview != null && (
                                        <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 rounded-lg bg-gray-700/50 border border-gray-600 p-2.5 sm:p-3">
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Amount</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(preview.totalBetAmount)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Bet Amount</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(preview.totalBetAmountOnPatti)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Win Amount</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(preview.totalWinAmountOnPatti)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total no of players</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm">{formatNum(preview.noOfPlayers)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Win Players</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm">{formatNum(preview.totalPlayersBetOnPatti)}</span></div>
                                            <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">total Profit</span><span className="font-mono text-yellow-400 bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(preview.profit)}</span></div>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleDeclareOpen}
                                        disabled={declareLoading || openPatti.replace(/\D/g, '').length !== 3}
                                        className="w-full px-4 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all text-sm sm:text-base"
                                    >
                                        {declareLoading ? 'Declaring...' : 'Declare Open'}
                                    </button>
                                </div>

                                {/* Close Result – only for regular market when open is set */}
                                {selectedMarket.marketType !== 'startline' && selectedMarket.openingNumber && /^\d{3}$/.test(selectedMarket.openingNumber) && (
                                    <div className="mb-4 sm:mb-6">
                                        <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Close Result</h3>
                                        <p className="text-[11px] text-gray-500 mb-2 sm:mb-3">Enter 3 digits → Check (preview) → Declare Close</p>
                                        <div className="mb-2 sm:mb-3">
                                            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Close Patti (3 digits)</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={closePatti}
                                                onChange={(e) => setClosePatti(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                                placeholder="e.g. 456"
                                                className="w-full px-3 py-2.5 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg sm:text-xl font-mono placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[44px] sm:min-h-[48px] touch-manipulation"
                                                maxLength={3}
                                            />
                                        </div>
                                        <div className="flex gap-2 mb-2 sm:mb-3">
                                            <button type="button" onClick={handleCheckClose} disabled={checkCloseLoading || closePatti.replace(/\D/g, '').length !== 3} className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg border border-gray-600 disabled:opacity-50 transition-colors text-sm sm:text-base">{checkCloseLoading ? 'Checking...' : 'Check'}</button>
                                        </div>
                                        {previewClose != null && (
                                            <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 rounded-lg bg-gray-700/50 border border-gray-600 p-2.5 sm:p-3">
                                                <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Amount</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(previewClose.totalBetAmount)}</span></div>
                                                <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Bet Amount</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(previewClose.totalBetAmountOnPatti)}</span></div>
                                                <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Win Amount</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(previewClose.totalWinAmountOnPatti)}</span></div>
                                                <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total no of players</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm">{formatNum(previewClose.noOfPlayers)}</span></div>
                                                <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">Total Win Players</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm">{formatNum(previewClose.totalPlayersBetOnPatti)}</span></div>
                                                <div className="flex justify-between items-center gap-2"><span className="text-gray-400 text-xs sm:text-sm shrink-0">total Profit</span><span className="font-mono text-yellow-400 bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm truncate">{formatNum(previewClose.profit)}</span></div>
                                            </div>
                                        )}
                                        <button type="button" onClick={handleDeclareClose} disabled={declareLoading || closePatti.replace(/\D/g, '').length !== 3} className="w-full px-4 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all text-sm sm:text-base">{declareLoading ? 'Declaring...' : 'Declare Close'}</button>
                                    </div>
                                )}
                                </>
                                )}

                                {(selectedMarket.openingNumber && /^\d{3}$/.test(selectedMarket.openingNumber)) || (selectedMarket.closingNumber && /^\d{3}$/.test(selectedMarket.closingNumber)) ? (
                                    <button type="button" onClick={handleClearResult} disabled={clearLoading} className="mt-3 sm:mt-4 w-full px-4 py-2.5 sm:py-3 bg-red-900/80 hover:bg-red-800 text-red-100 font-semibold rounded-lg border border-red-700 disabled:opacity-50 transition-colors text-sm sm:text-base">{clearLoading ? 'Clearing...' : 'Clear Result'}</button>
                                ) : null}
                                <button type="button" onClick={closePanel} className="mt-3 sm:mt-4 w-full px-4 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg border border-gray-600 transition-colors text-sm sm:text-base">Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AddResult;
