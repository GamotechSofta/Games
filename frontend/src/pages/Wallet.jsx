import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';

const Wallet = () => {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError('');
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const userId = user?._id || user?.id;
                if (!userId) throw new Error('Please login first');

                const res = await fetch(`${API_BASE_URL}/wallet/balance?userId=${encodeURIComponent(userId)}`);
                const data = await res.json();
                if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to fetch balance');
                setBalance(Number(data?.data?.balance || data?.balance || 0));
            } catch (e) {
                setError(e.message || 'Unable to load wallet');
                try {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    setBalance(Number(user?.balance || user?.walletBalance || 0));
                } catch {
                    setBalance(0);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-black dark:text-white p-4 sm:p-6">
            <div className="max-w-xl mx-auto space-y-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet</h1>
                {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
                <div className="rounded-xl border border-white/10 bg-[#1f2023] p-5">
                    <p className="text-gray-400 text-sm">Current Balance</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{loading ? '...' : `₹${balance.toLocaleString('en-IN')}`}</p>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button className="py-2.5 rounded-lg bg-yellow-500 text-black font-semibold opacity-90">Deposit (UI)</button>
                        <button className="py-2.5 rounded-lg bg-white/10 text-gray-800 dark:text-white font-semibold">Withdraw (UI)</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Wallet;
