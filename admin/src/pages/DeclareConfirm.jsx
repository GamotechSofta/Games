import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';
import { useAdminSettings } from '../context/AdminSettingsContext';

const formatNum = (n) => (n != null && Number.isFinite(n) ? Number(n).toLocaleString('en-IN') : '0');
const stripTestingMarket = (s) => (s || '').toString().replace(/\btesting market\s*/gi, '').trim() || s;
const BET_TYPE_LABELS = {
    single: 'Single Digit',
    jodi: 'Jodi',
    panna: 'Panna',
    'half-sangam': 'Half Sangam',
    'full-sangam': 'Full Sangam',
    'sp-common': 'SP Common',
    'dp-common': 'DP Common',
    'cp-common': 'CP Common',
    'sp-motor': 'SP Motor',
    'dp-motor': 'DP Motor',
    'sp-dp-motor': 'SP DP Motor',
    'sp-dp-motor-dp': 'SP DP Motor (DP)',
    'sp-dp-motor-tp': 'SP DP Motor (TP)',
    'odd-even': 'Odd Even',
    'chart-game': 'Chart Game',
};

const pannaSubtypeLabel = (betNumber) => {
    const s = String(betNumber || '').trim();
    if (!/^\d{3}$/.test(s)) return 'Panna';
    const [a, b, c] = s;
    if (a === b && b === c) return 'Triple Patti';
    if (a === b || b === c || a === c) return 'Double Patti';
    return 'Single Patti';
};

const formatBetTypeDisplay = (betType, betNumber, betOn) => {
    const key = (betType || '').toString().toLowerCase().trim();
    let label = key === 'panna' ? pannaSubtypeLabel(betNumber) : BET_TYPE_LABELS[key];
    if (!label) {
        label = (betType || '')
            .toString()
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    const session = (betOn || '').toString().toLowerCase().trim();
    if (session === 'open' || session === 'close') {
        label = `${label} (${session.charAt(0).toUpperCase()}${session.slice(1)})`;
    }
    return label || '—';
};

const DeclareConfirm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { market, declareType, number, firstDigit, secondDigit } = location.state || {};
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);
    const [declaring, setDeclaring] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [secretPassword, setSecretPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const { hasSecretDeclarePassword } = useAdminSettings();

    useEffect(() => {
        if (!market || !declareType) {
            navigate('/add-result', { replace: true });
            return;
        }
        if (declareType === 'king' && (!firstDigit || !secondDigit)) {
            navigate('/add-result', { replace: true });
            return;
        }
        if ((declareType === 'open' || declareType === 'close') && !number) {
            navigate('/add-result', { replace: true });
            return;
        }
        const marketId = market._id ?? market.id;
        if (!marketId) {
            navigate('/add-result', { replace: true });
            return;
        }
        const marketIdStr = String(marketId);
        let url;
        if (declareType === 'king') {
            const query = `firstDigit=${encodeURIComponent(firstDigit)}&secondDigit=${encodeURIComponent(secondDigit)}`;
            url = `${API_BASE_URL}/markets/winning-bets-preview-king-bazaar/${encodeURIComponent(marketIdStr)}?${query}`;
        } else {
            const query = declareType === 'open' ? `openingNumber=${encodeURIComponent(number)}` : `closingNumber=${encodeURIComponent(number)}`;
            url = `${API_BASE_URL}/markets/winning-bets-preview/${encodeURIComponent(marketIdStr)}?${query}`;
        }
        setLoading(true);
        setError('');
        adminFetch(url)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) setData(json.data);
                else setError(json.message || 'Failed to load winning players');
            })
            .catch(() => setError('Network error'))
            .finally(() => setLoading(false));
    }, [market, declareType, number, navigate]);

    const performDeclare = async (secretDeclarePasswordValue) => {
        const marketId = market._id ?? market.id;
        if (!marketId) return;
        const marketIdStr = String(marketId);
        setDeclaring(true);
        setPasswordError('');
        try {
            let endpoint, body;
            if (declareType === 'king') {
                endpoint = 'declare-king-bazaar';
                body = { firstDigit, secondDigit };
            } else if (declareType === 'open') {
                endpoint = 'declare-open';
                body = { openingNumber: number };
            } else {
                endpoint = 'declare-close';
                body = { closingNumber: number };
            }
            if (secretDeclarePasswordValue) body.secretDeclarePassword = secretDeclarePasswordValue;
            const res = await adminFetch(`${API_BASE_URL}/markets/${endpoint}/${marketIdStr}`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (json.success) {
                setShowPasswordModal(false);
                setSecretPassword('');
                navigate('/declare-success', {
                    replace: true,
                    state: {
                        marketName: (market.marketType === 'king' || market.marketType === 'startline') ? stripTestingMarket(market.marketName || data?.marketName || '') : (market.marketName || data?.marketName),
                        declareType,
                        number: declareType === 'king' ? `${firstDigit}${secondDigit}` : number,
                    },
                });
            } else {
                if (json.code === 'INVALID_SECRET_DECLARE_PASSWORD') {
                    setPasswordError(json.message || 'Invalid secret password');
                } else {
                    alert(json.message || 'Failed to declare result');
                }
            }
        } catch {
            alert('Network error');
        } finally {
            setDeclaring(false);
        }
    };

    const handleConfirmDeclare = () => {
        if (hasSecretDeclarePassword) {
            setShowPasswordModal(true);
            setSecretPassword('');
            setPasswordError('');
        } else {
            performDeclare('');
        }
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        const val = secretPassword.trim();
        if (hasSecretDeclarePassword && !val) {
            setPasswordError('Please enter the secret declare password');
            return;
        }
        performDeclare(val);
    };

    const handleBack = () => {
        navigate('/add-result');
    };

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const winningRows = useMemo(
        () => (data?.winningBets || []).filter((row) => Number(row.payout) > 0),
        [data?.winningBets]
    );
    const tableTotalPayout = useMemo(
        () =>
            Math.round(
                winningRows.reduce((sum, row) => sum + (Number(row.payout) || 0), 0) * 100
            ) / 100,
        [winningRows]
    );
    const winningPlayerCount = useMemo(
        () => new Set(winningRows.map((r) => String(r.userId))).size,
        [winningRows]
    );

    const displayNumber = declareType === 'king' ? `${firstDigit}${secondDigit}` : number;
    if (!market || !declareType || !displayNumber) return null;

    const title = declareType === 'king' ? `Declare Jodi: ${displayNumber}` : 
                  declareType === 'open' ? `Declare Open: ${displayNumber}` : 
                  `Declare Close: ${displayNumber}`;
    const rawName = data?.marketName || market.marketName || 'Market';
    const marketDisplay = (market.marketType === 'king' || market.marketType === 'startline') ? stripTestingMarket(rawName) : rawName;

    return (
        <AdminLayout onLogout={handleLogout} title="Confirm Declare">
            <div className="w-full min-w-0 max-w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pb-4 sm:pb-6 md:pb-8">
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-yellow-500 text-xs sm:text-sm mb-4 transition-colors min-h-[44px] touch-manipulation"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Add Result
                </button>

                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 break-words">{title}</h1>
                <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6 truncate">{marketDisplay}</p>

                {error && (
                    <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">{error}</div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-600 border-t-yellow-500" />
                    </div>
                ) : data ? (
                    <>
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4 mb-4 sm:mb-6 overflow-hidden">
                            <p className="text-amber-400 font-semibold text-sm sm:text-base break-words">Total payout to winning players: ₹{formatNum(tableTotalPayout)}</p>
                            <p className="text-gray-400 text-xs sm:text-sm mt-1">
                                {formatNum(winningPlayerCount)} winning player(s)
                                <span className="text-gray-500"> · </span>
                                {formatNum(winningRows.length)} winning bet(s)
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-700 bg-gray-800/80 shadow-lg overflow-hidden mb-4 sm:mb-6">
                            <h2 className="text-base sm:text-lg font-bold text-yellow-500 bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-700">Winning players</h2>
                            <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
                                <table className="w-full text-xs sm:text-sm border-collapse min-w-[320px] sm:min-w-[440px]">
                                    <thead>
                                        <tr className="bg-gray-700/70 border-b border-gray-600">
                                            <th className="text-left py-2 sm:py-3 px-2 sm:px-3 font-semibold text-gray-300 text-[11px] sm:text-sm">Username</th>
                                            <th className="text-left py-2 sm:py-3 px-2 sm:px-3 font-semibold text-gray-300 text-[11px] sm:text-sm">Bet type</th>
                                            <th className="text-left py-2 sm:py-3 px-2 sm:px-3 font-semibold text-gray-300 text-[11px] sm:text-sm">Bet number</th>
                                            <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-gray-300 text-[11px] sm:text-sm">Amount (₹)</th>
                                            <th className="text-right py-2 sm:py-3 px-2 sm:px-3 font-semibold text-amber-400 text-[11px] sm:text-sm">Payout (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {winningRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-500">No winning bets for this result.</td>
                                            </tr>
                                        ) : (
                                            winningRows.map((row) => (
                                                <tr key={row.betId || `${row.userId}-${row.betType}-${row.betNumber}`} className="border-b border-gray-700 hover:bg-gray-700/30">
                                                    <td className="py-2 sm:py-2.5 px-2 sm:px-3 font-medium text-white text-[11px] sm:text-sm truncate max-w-[100px] sm:max-w-[140px] md:max-w-none">{row.username}</td>
                                                    <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-gray-200 font-medium text-[11px] sm:text-sm whitespace-nowrap">
                                                        {formatBetTypeDisplay(row.betType, row.betNumber, row.betOn)}
                                                    </td>
                                                    <td className="py-2 sm:py-2.5 px-2 sm:px-3 font-mono text-amber-300 text-[11px] sm:text-sm">{row.betNumber}</td>
                                                    <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right font-mono text-white text-[11px] sm:text-sm">{formatNum(row.amount)}</td>
                                                    <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right font-mono font-semibold text-green-400 text-[11px] sm:text-sm">{formatNum(row.payout)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={handleConfirmDeclare}
                                disabled={declaring}
                                className="w-full sm:w-auto px-4 sm:px-6 py-3 min-h-[44px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all touch-manipulation"
                            >
                                {declaring ? 'Declaring...' : 'Confirm & Declare'}
                            </button>
                            <button
                                type="button"
                                onClick={handleBack}
                                className="w-full sm:w-auto px-4 sm:px-6 py-3 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg border border-gray-600 transition-colors touch-manipulation"
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Secret declare password modal */}
                        {showPasswordModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 overflow-y-auto">
                                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl max-w-md w-full p-4 sm:p-6 my-auto">
                                    <h3 className="text-base sm:text-lg font-bold text-yellow-500 mb-2">Enter Secret Declare Password</h3>
                                    <p className="text-gray-400 text-xs sm:text-sm mb-4">
                                        Please enter the secret password to confirm and declare this result.
                                    </p>
                                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                        <input
                                            type="password"
                                            value={secretPassword}
                                            onChange={(e) => { setSecretPassword(e.target.value); setPasswordError(''); }}
                                            placeholder="Secret password"
                                            autoFocus
                                            className="w-full px-4 py-3 min-h-[44px] rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent touch-manipulation"
                                        />
                                        {passwordError && <p className="text-red-400 text-xs sm:text-sm">{passwordError}</p>}
                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                            <button
                                                type="submit"
                                                disabled={declaring}
                                                className="flex-1 px-4 py-3 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg disabled:opacity-50 touch-manipulation"
                                            >
                                                {declaring ? 'Declaring...' : 'Confirm & Declare'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowPasswordModal(false); setSecretPassword(''); setPasswordError(''); }}
                                                disabled={declaring}
                                                className="px-4 py-3 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg border border-gray-600 touch-manipulation"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </AdminLayout>
    );
};

export default DeclareConfirm;
