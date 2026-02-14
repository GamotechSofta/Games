import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

const MarketList = ({ markets, onEdit, onDelete, apiBaseUrl, getAuthHeaders }) => {
    const navigate = useNavigate();
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [secretPassword, setSecretPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [hasSecretDeclarePassword, setHasSecretDeclarePassword] = useState(false);
    const [marketToDelete, setMarketToDelete] = useState(null);
    const [, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetch(`${apiBaseUrl}/admin/me/secret-declare-password-status`, { headers: getAuthHeaders() })
            .then((res) => res.json())
            .then((json) => {
                if (json.success) setHasSecretDeclarePassword(json.hasSecretDeclarePassword || false);
            })
            .catch(() => setHasSecretDeclarePassword(false));
    }, [apiBaseUrl, getAuthHeaders]);

    const performDelete = async (marketId, secretDeclarePasswordValue, skipConfirm = false) => {
        if (!skipConfirm && !window.confirm('Are you sure you want to delete this market?')) return;
        try {
            const headers = getAuthHeaders();
            const options = { method: 'DELETE', headers };
            if (secretDeclarePasswordValue) {
                headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify({ secretDeclarePassword: secretDeclarePasswordValue });
            }
            const response = await fetch(`${apiBaseUrl}/markets/delete-market/${marketId}`, options);
            const data = await response.json();
            if (data.success) {
                setShowPasswordModal(false);
                setMarketToDelete(null);
                setSecretPassword('');
                setPasswordError('');
                onDelete();
            } else {
                if (data.code === 'INVALID_SECRET_DECLARE_PASSWORD') {
                    setPasswordError(data.message || 'Invalid secret password');
                } else {
                    alert(data.message || 'Failed to delete market');
                }
            }
        } catch (err) {
            alert('Network error');
        }
    };

    const handleDelete = (marketId) => {
        if (hasSecretDeclarePassword) {
            setMarketToDelete(marketId);
            setShowPasswordModal(true);
            setSecretPassword('');
            setPasswordError('');
        } else {
            performDelete(marketId, '');
        }
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (!marketToDelete) return;
        const val = secretPassword.trim();
        if (hasSecretDeclarePassword && !val) {
            setPasswordError('Please enter the secret declare password');
            return;
        }
        performDelete(marketToDelete, val, true);
    };

    // Result declared → closed (red). Open declared, close not → running (green). Else: if closing time (IST) passed → closed (red), else open (green).
    const getMarketStatus = (market) => {
        const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
        const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
        if (hasOpening && hasClosing) return { status: 'closed', color: 'bg-red-600' };
        if (hasOpening && !hasClosing) return { status: 'running', color: 'bg-green-600' };
        if (isClosingTimePassedIST(market.closingTime)) return { status: 'closed', color: 'bg-red-600' };
        return { status: 'open', color: 'bg-green-600' };
    };

    return (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-w-0 w-full max-w-full">
            {markets.map((market) => {
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
                            <span className="text-amber-400 font-mono text-sm sm:text-base whitespace-nowrap truncate" title={market.displayResult || market.winNumber || ''}>
                                {(() => {
                                    const raw = market.displayResult || market.winNumber || (market.openingNumber && market.closingNumber ? `${market.openingNumber}-${market.closingNumber}` : '');
                                    if (!raw) return '';
                                    return String(raw).replace(/-/g, '_');
                                })()}
                            </span>
                        </div>

                        {/* Market Info */}
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 truncate" title={market.marketName}>{market.marketName}</h3>
                        <div className="space-y-1.5 sm:space-y-2 mb-4 text-xs sm:text-sm text-gray-300 min-w-0">
                            <p className="truncate"><span className="font-semibold">Opening:</span> {formatTime12h(market.startingTime)}</p>
                            <p className="truncate"><span className="font-semibold">Closing:</span> {formatTime12h(market.closingTime)}</p>
                            {market.betClosureTime != null && market.betClosureTime !== '' && (
                                <p><span className="font-semibold">Bet Closure:</span> {market.betClosureTime} sec</p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            <button
                                onClick={() => navigate(`/markets/${market._id}`)}
                                className="px-2 sm:px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0"
                            >
                                View
                            </button>
                            <button
                                onClick={() => onEdit(market)}
                                className="px-2 sm:px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(market._id)}
                                className="px-2 sm:px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] sm:min-h-0"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Secret declare password modal for delete */}
        {showPasswordModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl max-w-md w-full p-6">
                    <h3 className="text-lg font-bold text-yellow-500 mb-2">Enter Secret Password to Delete Market</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Please enter the secret password to confirm market deletion.
                    </p>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <input
                            type="password"
                            value={secretPassword}
                            onChange={(e) => { setSecretPassword(e.target.value); setPasswordError(''); }}
                            placeholder="Secret password"
                            autoFocus
                            className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                        {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg"
                            >
                                Delete Market
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowPasswordModal(false); setMarketToDelete(null); setSecretPassword(''); setPasswordError(''); }}
                                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg border border-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </>
    );
};

export default MarketList;
