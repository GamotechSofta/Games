import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';
import { FaUserPlus, FaSearch } from 'react-icons/fa';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

const computeIsOnline = (item) => {
    const lastActive = item?.lastActiveAt ? new Date(item.lastActiveAt).getTime() : 0;
    return lastActive > 0 && Date.now() - lastActive < ONLINE_THRESHOLD_MS;
};

const MyUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [, setTick] = useState(0);

    const fetchData = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        if (showLoader) setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                headers: getBookieAuthHeaders(),
            });
            const data = await response.json();
            if (data.success) {
                setUsers(data.data || []);
            } else {
                if (showLoader) setError(data.message || 'Failed to fetch users');
            }
        } catch (err) {
            if (showLoader) setError('Network error. Please check if the server is running.');
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(true);
        // Auto-refresh every 15 seconds
        const refreshInterval = setInterval(() => fetchData(false), 15000);
        // Tick to re-evaluate online status
        const tickInterval = setInterval(() => setTick((t) => t + 1), 5000);
        return () => {
            clearInterval(refreshInterval);
            clearInterval(tickInterval);
        };
    }, []);

    const q = searchQuery.trim().toLowerCase();
    const filteredUsers = q
        ? users.filter((item) => {
            const username = (item.username || '').toLowerCase();
            const email = (item.email || '').toLowerCase();
            const phone = (item.phone || '').toString();
            return username.includes(q) || email.includes(q) || phone.includes(q);
        })
        : users;

    const activeCount = users.filter((u) => u.isActive !== false).length;
    const suspendedCount = users.filter((u) => u.isActive === false).length;
    const onlineCount = users.filter((u) => computeIsOnline(u)).length;

    return (
        <Layout title="My Players">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">My Players</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage and monitor your player base</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/add-user')}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95 text-sm sm:text-base shrink-0 border border-amber-400/20"
                >
                    <FaUserPlus className="w-4 h-4" />
                    Add New Player
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="glass-panel glass-panel-card rounded-xl p-5 border border-white/10 relative overflow-hidden group">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total</p>
                    <p className="text-2xl font-bold text-white font-mono">{users.length}</p>
                    <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FaUserPlus className="w-8 h-8" />
                    </div>
                </div>
                <div className="glass-panel glass-panel-card rounded-xl p-5 border border-white/10 relative overflow-hidden group">
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Active</p>
                    <p className="text-2xl font-bold text-white font-mono">{activeCount}</p>
                    <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-emerald-500"></div>
                    </div>
                </div>
                <div className="glass-panel glass-panel-card rounded-xl p-5 border border-white/10 relative overflow-hidden group">
                    <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">Suspended</p>
                    <p className="text-2xl font-bold text-white font-mono">{suspendedCount}</p>
                    <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-red-500"></div>
                    </div>
                </div>
                <div className="glass-panel glass-panel-card rounded-xl p-5 border border-white/10 relative overflow-hidden group">
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">Online</p>
                    <p className="text-2xl font-bold text-white font-mono">{onlineCount}</p>
                    <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-amber-500"></div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 sm:mb-8">
                <div className="relative max-w-lg glass-panel glass-panel-card rounded-full overflow-hidden flex items-center">
                    <div className="pl-4 text-slate-400">
                        <FaSearch className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name, email or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-3 pr-10 py-3 bg-transparent border-none text-white placeholder-slate-500 focus:outline-none focus:ring-0 text-sm sm:text-base font-medium"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 text-slate-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="glass-panel glass-panel-card rounded-2xl overflow-hidden min-w-0 max-w-full">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">Loading player data...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaUserPlus className="w-6 h-6 text-slate-500" />
                        </div>
                        <h3 className="text-white font-bold mb-1">No Players Found</h3>
                        <p className="text-sm text-slate-500 mb-6">Start building your network by adding players.</p>
                        <button
                            type="button"
                            onClick={() => navigate('/add-user')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors"
                        >
                            <FaUserPlus className="w-4 h-4" /> Add Player
                        </button>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        No results match your search "{searchQuery}"
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="px-4 py-4 text-xs font-bold text-slate-300 uppercase w-12 tracking-wider">#</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Contact</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Wallet</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Account</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((item, index) => {
                                    const isOnline = computeIsOnline(item);
                                    return (
                                        <tr key={item._id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-4 py-4 text-slate-400 block-number">{index + 1}</td>
                                            <td className="px-4 py-4">
                                                <Link to={`/my-users/${item._id}`} className="font-semibold text-amber-500 hover:text-amber-400 hover:underline transition-colors block text-base mb-0.5">
                                                    {item.username}
                                                </Link>
                                                <span className="text-xs text-slate-500">{item.userId}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300">{item.phone || '—'}</span>
                                                    <span className="text-xs text-slate-500 truncate max-w-[150px]">{item.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono font-bold text-emerald-400 text-sm py-1 px-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                                    ₹{Number(item.walletBalance ?? 0).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700/30 text-slate-400 border-slate-700/50'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${item.isActive !== false
                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {item.isActive !== false ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-slate-400 text-xs font-medium">
                                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                }) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Results Count */}
            {!loading && users.length > 0 && (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 px-2">
                    <p>
                        Showing <span className="text-white font-bold">{filteredUsers.length}</span> player{filteredUsers.length !== 1 ? 's' : ''}
                        {searchQuery && filteredUsers.length !== users.length && (
                            <span> (filtered from {users.length})</span>
                        )}
                    </p>
                </div>
            )}
        </Layout>
    );
};

export default MyUsers;
