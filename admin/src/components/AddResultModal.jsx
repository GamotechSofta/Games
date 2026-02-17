import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const getAuthHeaders = () => {
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    const password = localStorage.getItem('adminPassword') || sessionStorage.getItem('adminPassword') || '';
    return { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(`${admin.username}:${password}`)}` };
};

const AddResultModal = ({ market, onClose, onSuccess }) => {
    const navigate = useNavigate();
    const [openPatti, setOpenPatti] = useState(() => (market?.openingNumber ?? '').toString().replace(/\D/g, '').slice(0, 3));
    const [closePatti, setClosePatti] = useState(() => (market?.closingNumber ?? '').toString().replace(/\D/g, '').slice(0, 3));
    const [kingBazaarJodi, setKingBazaarJodi] = useState(() => {
        if (market?.marketType !== 'king') return '';
        if (market.displayResult && /^\d{2}$/.test(market.displayResult)) return market.displayResult;
        if (market.openingNumber != null && market.closingNumber != null) {
            const first = String(market.openingNumber)[0] || '0';
            const second = String(market.closingNumber)[0] || '0';
            return first + second;
        }
        return '';
    });
    const [preview, setPreview] = useState(null);
    const [previewClose, setPreviewClose] = useState(null);
    const [checkLoading, setCheckLoading] = useState(false);
    const [checkCloseLoading, setCheckCloseLoading] = useState(false);
    const [declareLoading, setDeclareLoading] = useState(false);
    const [clearLoading, setClearLoading] = useState(false);

    if (!market) return null;

    const marketId = market._id ?? market.id;
    const formatNum = (n) => (n != null && Number.isFinite(n) ? Number(n).toLocaleString('en-IN') : '0');

    const handleCheckOpen = async () => {
        const val = openPatti.replace(/\D/g, '').slice(0, 3);
        if (val.length !== 3) { setPreview(null); return; }
        setCheckLoading(true);
        setPreview(null);
        try {
            const res = await fetch(`${API_BASE_URL}/markets/preview-declare-open/${marketId}?openingNumber=${encodeURIComponent(val)}`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success && data.data) {
                setPreview({
                    totalBetAmount: safeNum(data.data.totalBetAmount),
                    totalBetAmountOnPatti: safeNum(data.data.totalBetAmountOnPatti),
                    totalWinAmountOnPatti: safeNum(data.data.totalWinAmountOnPatti),
                    noOfPlayers: safeNum(data.data.noOfPlayers),
                    totalPlayersBetOnPatti: safeNum(data.data.totalPlayersBetOnPatti),
                    profit: safeNum(data.data.profit),
                });
            } else setPreview({ totalBetAmount: 0, totalBetAmountOnPatti: 0, totalWinAmountOnPatti: 0, noOfPlayers: 0, totalPlayersBetOnPatti: 0, profit: 0 });
        } catch { setPreview(null); } finally { setCheckLoading(false); }
    };

    const handleCheckClose = async () => {
        const val = closePatti.replace(/\D/g, '').slice(0, 3);
        if (val.length !== 3) { setPreviewClose(null); return; }
        setCheckCloseLoading(true);
        setPreviewClose(null);
        try {
            const res = await fetch(`${API_BASE_URL}/markets/preview-declare-close/${marketId}?closingNumber=${encodeURIComponent(val)}`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success && data.data) {
                setPreviewClose({
                    totalBetAmount: safeNum(data.data.totalBetAmount),
                    profit: safeNum(data.data.profit),
                });
            } else setPreviewClose({ totalBetAmount: 0, profit: 0 });
        } catch { setPreviewClose(null); } finally { setCheckCloseLoading(false); }
    };

    const handleCheckKingBazaar = async () => {
        const val = kingBazaarJodi.replace(/\D/g, '').slice(0, 2);
        if (val.length !== 2) { setPreview(null); return; }
        setCheckLoading(true);
        setPreview(null);
        try {
            const res = await fetch(`${API_BASE_URL}/markets/preview-declare-king-bazaar/${marketId}?firstDigit=${val[0]}&secondDigit=${val[1]}`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success && data.data) {
                const tb = safeNum(data.data.totalBetAmount);
                const tw = safeNum(data.data.totalWinAmountOnPatti);
                setPreview({ totalBetAmount: tb, profit: tb - tw });
            } else setPreview({ totalBetAmount: 0, profit: 0 });
        } catch { setPreview(null); } finally { setCheckLoading(false); }
    };

    const handleDeclareOpen = () => {
        const val = openPatti.replace(/\D/g, '').slice(0, 3);
        if (val.length !== 3) { alert('Enter 3-digit Open Patti.'); return; }
        onClose();
        navigate('/declare-confirm', { state: { market, declareType: 'open', number: val } });
    };

    const handleDeclareClose = () => {
        const val = closePatti.replace(/\D/g, '').slice(0, 3);
        if (val.length !== 3) { alert('Enter 3-digit Close Patti.'); return; }
        onClose();
        navigate('/declare-confirm', { state: { market, declareType: 'close', number: val } });
    };

    const handleDeclareKingBazaar = () => {
        const val = kingBazaarJodi.replace(/\D/g, '').slice(0, 2);
        if (val.length !== 2) { alert('Enter 2-digit Jodi.'); return; }
        onClose();
        navigate('/declare-confirm', { state: { market, declareType: 'king', firstDigit: val[0], secondDigit: val[1] } });
    };

    const handleClearResult = async () => {
        if (!window.confirm('Clear result for this market?')) return;
        setClearLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/markets/clear-result/${market._id}`, { method: 'POST', headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                onSuccess?.();
                onClose();
            } else alert(data.message || 'Failed to clear');
        } catch { alert('Network error'); } finally { setClearLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-700 bg-gray-800">
                    <h2 className="text-base sm:text-lg font-bold text-yellow-500 truncate">{market.marketName}</h2>
                    <button type="button" onClick={onClose} className="shrink-0 p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white" aria-label="Close">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 sm:p-5 md:p-6">
                    {marketId && (
                        <p className="text-[11px] text-gray-500 mb-3 flex flex-wrap items-center gap-x-2">
                            <span className="font-mono text-gray-400">ID: {marketId}</span>
                            <Link to={`/market-result/${marketId}`} className="text-amber-400 hover:underline" onClick={(e) => e.stopPropagation()}>View details</Link>
                        </p>
                    )}

                    {market.marketType === 'king' ? (
                        <div className="mb-4">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">King Bazaar Result</h3>
                            <p className="text-[11px] text-gray-500 mb-2">Enter 2-digit Jodi → Check → Declare Result</p>
                            <div className="mb-2">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Jodi (2 digits)</label>
                                <input type="text" inputMode="numeric" value={kingBazaarJodi} onChange={(e) => setKingBazaarJodi(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="e.g. 56" className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg font-mono min-h-[44px]" maxLength={2} />
                            </div>
                            <button type="button" onClick={handleCheckKingBazaar} disabled={checkLoading || kingBazaarJodi.replace(/\D/g, '').length !== 2} className="w-full mb-2 px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg disabled:opacity-50 text-sm">Check</button>
                            {preview != null && (
                                <div className="space-y-1.5 mb-2 rounded-lg bg-gray-700/50 border border-gray-600 p-2.5">
                                    <div className="flex justify-between text-xs"><span className="text-gray-400">Total Bet Amount</span><span className="font-mono text-white">{formatNum(preview.totalBetAmount)}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-gray-400">Total Profit</span><span className="font-mono text-yellow-400">{formatNum(preview.profit)}</span></div>
                                </div>
                            )}
                            <button type="button" onClick={handleDeclareKingBazaar} disabled={declareLoading || kingBazaarJodi.replace(/\D/g, '').length !== 2} className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg disabled:opacity-50 text-sm">Declare Result</button>
                        </div>
                    ) : (
                        <>
                        <div className="mb-4">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Open Result</h3>
                            <p className="text-[11px] text-gray-500 mb-2">Enter 3 digits → Check (preview) → Declare Open</p>
                            <div className="mb-2">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Open Patti (3 digits)</label>
                                <input type="text" inputMode="numeric" value={openPatti} onChange={(e) => setOpenPatti(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="e.g. 156" className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg font-mono min-h-[44px]" maxLength={3} />
                            </div>
                            <button type="button" onClick={handleCheckOpen} disabled={checkLoading || openPatti.replace(/\D/g, '').length !== 3} className="w-full mb-2 px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg disabled:opacity-50 text-sm">Check</button>
                            {preview != null && (
                                <div className="space-y-1.5 mb-2 rounded-lg bg-gray-700/50 border border-gray-600 p-2.5">
                                    <div className="flex justify-between text-xs"><span className="text-gray-400">Total Bet Amount</span><span className="font-mono text-white">{formatNum(preview.totalBetAmount)}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-gray-400">Total Profit</span><span className="font-mono text-yellow-400">{formatNum(preview.profit)}</span></div>
                                </div>
                            )}
                            <button type="button" onClick={handleDeclareOpen} disabled={declareLoading || openPatti.replace(/\D/g, '').length !== 3} className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg disabled:opacity-50 text-sm">Declare Open</button>
                        </div>

                        {market.marketType !== 'startline' && market.openingNumber && /^\d{3}$/.test(String(market.openingNumber)) && (
                            <div className="mb-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Close Result</h3>
                                <p className="text-[11px] text-gray-500 mb-2">Enter 3 digits → Check → Declare Close</p>
                                <div className="mb-2">
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Close Patti (3 digits)</label>
                                    <input type="text" inputMode="numeric" value={closePatti} onChange={(e) => setClosePatti(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="e.g. 456" className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono min-h-[44px]" maxLength={3} />
                                </div>
                                <button type="button" onClick={handleCheckClose} disabled={checkCloseLoading || closePatti.replace(/\D/g, '').length !== 3} className="w-full mb-2 px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg disabled:opacity-50 text-sm">Check</button>
                                {previewClose != null && (
                                    <div className="space-y-1.5 mb-2 rounded-lg bg-gray-700/50 border border-gray-600 p-2.5">
                                        <div className="flex justify-between text-xs"><span className="text-gray-400">Total Bet Amount</span><span className="font-mono text-white">{formatNum(previewClose.totalBetAmount)}</span></div>
                                        <div className="flex justify-between text-xs"><span className="text-gray-400">Total Profit</span><span className="font-mono text-yellow-400">{formatNum(previewClose.profit)}</span></div>
                                    </div>
                                )}
                                <button type="button" onClick={handleDeclareClose} disabled={declareLoading || closePatti.replace(/\D/g, '').length !== 3} className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg disabled:opacity-50 text-sm">Declare Close</button>
                            </div>
                        )}

                        {((market.openingNumber && /^\d{3}$/.test(String(market.openingNumber))) || (market.closingNumber && /^\d{3}$/.test(String(market.closingNumber)))) && (
                            <button type="button" onClick={handleClearResult} disabled={clearLoading} className="mb-3 w-full px-4 py-2.5 bg-red-900/80 hover:bg-red-800 text-red-100 font-semibold rounded-lg disabled:opacity-50 text-sm">Clear Result</button>
                        )}
                        </>
                    )}

                    <button type="button" onClick={onClose} className="mt-3 w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg text-sm">Close</button>
                </div>
            </div>
        </div>
    );
};

export default AddResultModal;
