import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const defaultForm = {
    name: '',
    gameId: '',
    provider: '',
    status: 'active',
};

const GameManagement = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState(defaultForm);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const loadGames = async () => {
        try {
            setListLoading(true);
            setError('');
            const res = await adminFetch(`${API_BASE_URL}/admin/game/list`);
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Failed to fetch games');
            setGames(data.data || []);
        } catch (e) {
            setError(e.message || 'Failed to fetch games');
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        loadGames();
    }, []);

    const handleAddGame = async (e) => {
        e.preventDefault();
        setError('');
        setMsg('');
        if (!form.name.trim() || !form.gameId.trim() || !form.provider.trim()) {
            setError('name, gameId and provider are required');
            return;
        }
        try {
            setLoading(true);
            const res = await adminFetch(`${API_BASE_URL}/admin/game/add`, {
                method: 'POST',
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Failed to add game');
            setMsg('Game added successfully');
            setForm(defaultForm);
            await loadGames();
        } catch (e) {
            setError(e.message || 'Failed to add game');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (game) => {
        const action = game.status === 'active' ? 'disable' : 'enable';
        if (!window.confirm(`Are you sure you want to ${action} "${game.name}"?`)) return;
        setError('');
        setMsg('');
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/game/toggle`, {
                method: 'PUT',
                body: JSON.stringify({ gameId: game.gameId }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Failed to toggle game');
            setMsg(`Game ${action}d successfully`);
            await loadGames();
        } catch (e) {
            setError(e.message || 'Failed to toggle game');
        }
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Game Management">
            <div className="w-full min-w-0 px-2 sm:px-3 md:px-4 pb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">Game Management</h1>

                {msg && <div className="mb-3 p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">{msg}</div>}
                {error && <div className="mb-3 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}

                <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4 mb-5">
                    <h2 className="text-white font-semibold mb-3">Add Game</h2>
                    <form onSubmit={handleAddGame} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <input
                            className="px-3 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white"
                            placeholder="Name"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        />
                        <input
                            className="px-3 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white"
                            placeholder="Game ID"
                            value={form.gameId}
                            onChange={(e) => setForm((p) => ({ ...p, gameId: e.target.value }))}
                        />
                        <input
                            className="px-3 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white"
                            placeholder="Provider"
                            value={form.provider}
                            onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                        />
                        <select
                            className="px-3 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white"
                            value={form.status}
                            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                        >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                        </select>
                        <button
                            type="submit"
                            disabled={loading}
                            className="sm:col-span-2 lg:col-span-4 px-4 py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Add Game'}
                        </button>
                    </form>
                </div>

                <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4 overflow-x-auto">
                    <h2 className="text-white font-semibold mb-3">Games List</h2>
                    {listLoading ? (
                        <p className="text-gray-300">Loading...</p>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-300 border-b border-gray-700">
                                <tr>
                                    <th className="py-2 pr-3">Name</th>
                                    <th className="py-2 pr-3">Game ID</th>
                                    <th className="py-2 pr-3">Provider</th>
                                    <th className="py-2 pr-3">Status</th>
                                    <th className="py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {games.map((game) => (
                                    <tr key={game._id || game.gameId} className="border-b border-gray-700/50 text-white">
                                        <td className="py-2 pr-3">{game.name}</td>
                                        <td className="py-2 pr-3">{game.gameId}</td>
                                        <td className="py-2 pr-3">{game.provider}</td>
                                        <td className="py-2 pr-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${game.status === 'active' ? 'bg-green-700/40 text-green-200' : 'bg-gray-600 text-gray-200'}`}>
                                                {game.status}
                                            </span>
                                        </td>
                                        <td className="py-2">
                                            <button
                                                onClick={() => handleToggle(game)}
                                                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                                            >
                                                {game.status === 'active' ? 'Disable' : 'Enable'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {games.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-4 text-gray-400">No games found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default GameManagement;
