import React, { useEffect, useState } from 'react';
import AdminMenu from './AdminMenu';
import { adminApi } from '../utils/api';

const Card = ({ title, value, loading }) => (
    <div className="rounded-xl border border-white/10 bg-[#1f2023] p-4">
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{loading ? '...' : value}</p>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, games: 0, transactions: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError('');
                const [usersRes, gamesRes, txRes] = await Promise.allSettled([
                    adminApi.get('/api/v1/users'),
                    adminApi.get('/api/admin/game/list'),
                    adminApi.get('/api/v1/wallet/transactions'),
                ]);

                const users =
                    usersRes.status === 'fulfilled'
                        ? (usersRes.value?.data?.data?.length || usersRes.value?.data?.count || 0)
                        : 0;
                const games =
                    gamesRes.status === 'fulfilled'
                        ? (gamesRes.value?.data?.data?.length || 0)
                        : 0;
                const transactions =
                    txRes.status === 'fulfilled'
                        ? (txRes.value?.data?.data?.length || 0)
                        : 0;

                setStats({ users, games, transactions });
                if (usersRes.status !== 'fulfilled' && gamesRes.status !== 'fulfilled' && txRes.status !== 'fulfilled') {
                    setError('Unable to load dashboard stats.');
                }
            } catch {
                setError('Unable to load dashboard stats.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-black p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-4">GAP Admin Dashboard</h1>
                <AdminMenu />
                {error && <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card title="Total Users" value={stats.users} loading={loading} />
                    <Card title="Total Games" value={stats.games} loading={loading} />
                    <Card title="Total Transactions" value={stats.transactions} loading={loading} />
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
