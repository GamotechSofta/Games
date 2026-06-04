import { useEffect, useMemo, useState } from 'react';
import {
    FaTimes,
    FaSync,
    FaPhoneAlt,
    FaUser,
    FaArrowLeft,
    FaCheckCircle,
    FaStickyNote,
} from 'react-icons/fa';
import { adminFetch, API_BASE_URL } from '../utils/api';

const TelecallerCallProgressModal = ({ telecaller, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [search, setSearch] = useState('');
    const [mobileView, setMobileView] = useState('list');

    const phone = telecaller?.phone
        || String(telecaller?.username || '').replace(/\D/g, '').slice(-10)
        || '—';

    const load = async () => {
        if (!telecaller?._id) return;
        setLoading(true);
        setError('');
        setSearch('');
        setMobileView('list');
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/telecallers/${telecaller._id}/call-progress`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
                const first = json.data?.calledPlayers?.[0] ?? null;
                setSelectedPlayer(first);
            } else {
                setError(json.message || 'Failed to load call progress');
            }
        } catch {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [telecaller?._id]);

    const calledPlayers = data?.calledPlayers || [];
    const doneCount = data?.count ?? 0;
    const totalPlayers = data?.totalPlayers ?? 0;
    const progressPct = totalPlayers > 0 ? Math.min(100, Math.round((doneCount / totalPlayers) * 100)) : 0;
    const notesCount = calledPlayers.filter((p) => p.hasSummary).length;

    const filteredPlayers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return calledPlayers;
        return calledPlayers.filter(
            (p) =>
                (p.username || '').toLowerCase().includes(q)
                || String(p.phone || '').includes(q),
        );
    }, [calledPlayers, search]);

    const selectPlayer = (player) => {
        setSelectedPlayer(player);
        setMobileView('detail');
    };

    if (!telecaller) return null;

    const detailPanel = selectedPlayer ? (
        <div className="flex flex-col h-full min-h-0">
            <div className="shrink-0 pb-3 border-b border-gray-700/80">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-teal-900/50 border border-teal-600/40 flex items-center justify-center text-teal-300 font-bold text-lg shrink-0">
                        {(selectedPlayer.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{selectedPlayer.username}</p>
                        <p className="text-gray-400 text-sm font-mono flex items-center gap-1.5 mt-0.5">
                            <FaPhoneAlt className="w-3 h-3 shrink-0" />
                            {selectedPlayer.phone || '—'}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto pt-4 min-h-0">
                <div className="rounded-xl border border-amber-700/40 bg-amber-950/25 p-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-3">
                        <FaStickyNote className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-semibold">Call notes from telecaller</span>
                    </div>
                    {selectedPlayer.summary?.trim() ? (
                        <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">
                            {selectedPlayer.summary}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-500">
                            This player was marked as called, but no notes were saved.
                        </p>
                    )}
                </div>
            </div>
        </div>
    ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4">
            <FaUser className="w-10 h-10 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">Select a player from the list to view their call notes.</p>
        </div>
    );

    const playerList = (
        <>
            {calledPlayers.length > 3 && (
                <div className="shrink-0 mb-3">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or phone…"
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                    />
                </div>
            )}
            {filteredPlayers.length === 0 ? (
                <p className="text-gray-500 text-sm py-6 text-center">
                    {search ? 'No players match your search.' : 'No calls marked done yet.'}
                </p>
            ) : (
                <ul className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-0.5">
                    {filteredPlayers.map((p) => {
                        const isSelected = selectedPlayer?._id === p._id;
                        return (
                            <li key={p._id}>
                                <button
                                    type="button"
                                    onClick={() => selectPlayer(p)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                                        isSelected
                                            ? 'bg-yellow-500/15 border-yellow-500/50 ring-1 ring-yellow-500/30'
                                            : 'bg-gray-800/80 border-gray-700 hover:border-gray-500 hover:bg-gray-700/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                isSelected ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300'
                                            }`}
                                        >
                                            {(p.username || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-white text-sm font-medium truncate">{p.username}</p>
                                            <p className="text-gray-500 text-xs font-mono truncate">{p.phone}</p>
                                        </div>
                                        {p.hasSummary && (
                                            <FaStickyNote
                                                className="w-3.5 h-3.5 text-amber-400 shrink-0"
                                                title="Has call notes"
                                            />
                                        )}
                                        {isSelected && (
                                            <FaCheckCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                        )}
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70"
            role="dialog"
            aria-modal="true"
            aria-labelledby="telecaller-progress-title"
        >
            <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close"
                onClick={onClose}
            />
            <div className="relative bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 sm:px-5 py-4 border-b border-gray-700 shrink-0 bg-gray-800/95">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 id="telecaller-progress-title" className="text-lg font-bold text-white">
                                Telecaller progress
                            </h2>
                            <p className="text-yellow-400 font-mono text-sm mt-0.5 flex items-center gap-1.5">
                                <FaPhoneAlt className="w-3.5 h-3.5 shrink-0" />
                                {phone}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={load}
                                disabled={loading}
                                className="p-2.5 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-gray-700 disabled:opacity-50"
                                title="Refresh"
                            >
                                <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
                                aria-label="Close"
                            >
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {!loading && data && (
                        <div className="mt-4">
                            <div className="flex items-baseline justify-between gap-2 mb-2">
                                <p className="text-sm text-gray-300">
                                    <span className="text-2xl font-bold text-teal-400">{doneCount}</span>
                                    <span className="text-gray-500"> / {totalPlayers} players called</span>
                                </p>
                                <span className="text-xs text-gray-500 shrink-0">{progressPct}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-300"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                                {notesCount > 0 && (
                                    <span>{notesCount} with call notes</span>
                                )}
                                {data.updatedAt && (
                                    <span>
                                        Updated {new Date(data.updatedAt).toLocaleString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {error && (
                        <p className="text-red-400 text-sm px-4 py-3">{error}</p>
                    )}
                    {loading && !data ? (
                        <div className="flex items-center justify-center py-16">
                            <FaSync className="w-6 h-6 text-yellow-500 animate-spin" />
                            <span className="ml-3 text-gray-400">Loading call progress…</span>
                        </div>
                    ) : calledPlayers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <FaCheckCircle className="w-12 h-12 text-gray-600 mb-4" />
                            <p className="text-white font-medium">No completed calls yet</p>
                            <p className="text-gray-500 text-sm mt-2 max-w-xs">
                                When this telecaller marks players as done in their app, they will appear here.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop: split view */}
                            <div className="hidden md:flex h-full min-h-[320px] max-h-[calc(90vh-200px)]">
                                <div className="w-[42%] min-w-[220px] border-r border-gray-700 flex flex-col p-4 min-h-0">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 shrink-0">
                                        Called players ({filteredPlayers.length})
                                    </p>
                                    {playerList}
                                </div>
                                <div className="flex-1 p-4 min-h-0 flex flex-col">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 shrink-0">
                                        Call details
                                    </p>
                                    <div className="flex-1 min-h-0">{detailPanel}</div>
                                </div>
                            </div>

                            {/* Mobile: list or detail */}
                            <div className="md:hidden flex flex-col h-full min-h-[280px] max-h-[calc(90vh-200px)]">
                                {mobileView === 'list' ? (
                                    <div className="flex flex-col p-4 min-h-0 flex-1">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 shrink-0">
                                            Tap a player to view notes
                                        </p>
                                        {playerList}
                                    </div>
                                ) : (
                                    <div className="flex flex-col min-h-0 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => setMobileView('list')}
                                            className="flex items-center gap-2 px-4 py-3 text-sm text-yellow-400 hover:bg-gray-700/50 border-b border-gray-700 shrink-0"
                                        >
                                            <FaArrowLeft className="w-3.5 h-3.5" />
                                            Back to list
                                        </button>
                                        <div className="p-4 flex-1 min-h-0 flex flex-col">{detailPanel}</div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TelecallerCallProgressModal;
