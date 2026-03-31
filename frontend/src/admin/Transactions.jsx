import React, { useState } from 'react';
import AdminMenu from './AdminMenu';
import { adminApi } from '../utils/api';

const Transactions = () => {
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    const searchTx = async (e) => {
        e.preventDefault();
        setError('');
        setData(null);
        if (!transactionId.trim()) {
            setError('transactionId is required');
            return;
        }
        try {
            setLoading(true);
            const res = await adminApi.get(`/api/wallet/transaction/${encodeURIComponent(transactionId.trim())}`);
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.message || 'Transaction lookup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-4">Transactions</h1>
                <AdminMenu />

                <div className="rounded-xl border border-white/10 bg-[#1f2023] p-4 mb-4">
                    <form onSubmit={searchTx} className="flex flex-col sm:flex-row gap-3">
                        <input
                            className="flex-1 px-3 py-2 rounded bg-black/40 border border-white/10 text-white"
                            placeholder="Enter transactionId"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                        />
                        <button className="px-4 py-2 rounded bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-50" disabled={loading}>
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>

                {error && <div className="mb-3 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}

                {data && (
                    <div className="rounded-xl border border-white/10 bg-[#1f2023] p-4 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <tbody className="text-white">
                                <tr className="border-b border-white/10"><td className="py-2 pr-3 text-gray-400">transactionId</td><td className="py-2">{data.transactionId || '-'}</td></tr>
                                <tr className="border-b border-white/10"><td className="py-2 pr-3 text-gray-400">status</td><td className="py-2">{data.status || '-'}</td></tr>
                                <tr className="border-b border-white/10"><td className="py-2 pr-3 text-gray-400">userId</td><td className="py-2">{String(data.userId || '-')}</td></tr>
                                <tr className="border-b border-white/10"><td className="py-2 pr-3 text-gray-400">amount</td><td className="py-2">{data.amount ?? '-'}</td></tr>
                                <tr className="border-b border-white/10"><td className="py-2 pr-3 text-gray-400">type</td><td className="py-2">{data.type || '-'}</td></tr>
                                <tr className="border-b border-white/10"><td className="py-2 pr-3 text-gray-400">balanceAfter</td><td className="py-2">{data.balanceAfter ?? '-'}</td></tr>
                                <tr><td className="py-2 pr-3 text-gray-400">createdAt</td><td className="py-2">{data.createdAt ? new Date(data.createdAt).toLocaleString() : '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Transactions;
