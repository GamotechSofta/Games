import React, { useEffect, useState } from 'react';
import AdminMenu from './AdminMenu';
import { adminApi } from '../utils/api';

const defaultForm = {
    name: '',
    gameId: '',
    provider: '',
    launchBaseUrl: '',
    status: 'active',
};

const GameManager = () => {
    const [form, setForm] = useState(defaultForm);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    const loadGames = async () => {
        try {
            setListLoading(true);
            const res = await adminApi.get('/api/admin/game/list');
            setGames(res.data?.data || []);
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to load games');
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        loadGames();
    }, []);

    const onAddGame = async (e) => {
        e.preventDefault();
        setError('');
        setToast('');
        if (!form.name.trim() || !form.gameId.trim() || !form.provider.trim()) {
            setError('name, gameId and provider are required');
            return;
        }
        try {
            setLoading(true);
            await adminApi.post('/api/admin/game/add', form);
            setForm(defaultForm);
            setToast('Game added successfully');
            await loadGames();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to add game');
        } finally {
            setLoading(false);
        }
    };

    const onToggle = async (game) => {
        const action = game.status === 'active' ? 'disable' : 'enable';
        const ok = window.confirm(`Are you sure you want to ${action} "${game.name}"?`);
        if (!ok) return;

        setError('');
        setToast('');
        try {
            await adminApi.put('/api/admin/game/toggle', { gameId: game.gameId });
            setToast(`Game ${action}d successfully`);
            await loadGames();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to toggle game');
        }
    };

    return (
        <div className="min-h-screen bg-black p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-4">Game Manager</h1>
                <AdminMenu />

                {toast && <div className="mb-3 p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">{toast}</div>}
                {error && <div className="mb-3 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}

                <div className="rounded-xl border border-white/10 bg-[#1f2023] p-4 mb-5">
                    <h2 className="text-white font-semibold mb-3">Add Game</h2>
                    <form onSubmit={onAddGame} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input className="px-3 py-2 rounded bg-black/40 border border-white/10 text-white" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                        <input className="px-3 py-2 rounded bg-black/40 border border-white/10 text-white" placeholder="Game ID" value={form.gameId} onChange={(e) => setForm((p) => ({ ...p, gameId: e.target.value }))} />
                        <input className="px-3 py-2 rounded bg-black/40 border border-white/10 text-white" placeholder="Provider" value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))} />
                        <input className="px-3 py-2 rounded bg-black/40 border border-white/10 text-white sm:col-span-2" placeholder="Launch URL (e.g. https://www.doormart.shop/ or https://fashionbuddies.in/play/online)" value={form.launchBaseUrl} onChange={(e) => setForm((p) => ({ ...p, launchBaseUrl: e.target.value }))} />
                        <select className="px-3 py-2 rounded bg-black/40 border border-white/10 text-white" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                        </select>
                        <button disabled={loading} className="sm:col-span-2 lg:col-span-3 py-2 rounded bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-50">
                            {loading ? 'Saving...' : 'Add Game'}
                        </button>
                    </form>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#1f2023] p-4 overflow-x-auto">
                    <h2 className="text-white font-semibold mb-3">Games List</h2>
                    {listLoading ? (
                        <p className="text-gray-400">Loading...</p>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-300 border-b border-white/10">
                                <tr>
                                    <th className="py-2 pr-3">Name</th>
                                    <th className="py-2 pr-3">Game ID</th>
                                    <th className="py-2 pr-3">Provider</th>
                                    <th className="py-2 pr-3">Launch URL</th>
                                    <th className="py-2 pr-3">Status</th>
                                    <th className="py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {games.map((g) => (
                                    <tr key={g._id || g.gameId} className="border-b border-white/5 text-white">
                                        <td className="py-2 pr-3">{g.name}</td>
                                        <td className="py-2 pr-3">{g.gameId}</td>
                                        <td className="py-2 pr-3">{g.provider}</td>
                                        <td className="py-2 pr-3 max-w-[220px] truncate text-gray-400" title={g.launchBaseUrl || ''}>
                                            {g.launchBaseUrl || '—'}
                                        </td>
                                        <td className="py-2 pr-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${g.status === 'active' ? 'bg-green-700/50 text-green-200' : 'bg-gray-700 text-gray-200'}`}>
                                                {g.status}
                                            </span>
                                        </td>
                                        <td className="py-2">
                                            <button
                                                onClick={() => onToggle(g)}
                                                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                                            >
                                                {g.status === 'active' ? 'Disable' : 'Enable'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {games.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-4 text-gray-400">No games found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameManager;
