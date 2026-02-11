import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';

const Settings = () => {
    const [upiId, setUpiId] = useState('');
    const [bookieType, setBookieType] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [currentUpi, setCurrentUpi] = useState('');

    useEffect(() => {
        fetch(`${API_BASE_URL}/bookie/upi`, { headers: getBookieAuthHeaders() })
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setBookieType(json.data?.bookieType || 'admin_collects');
                    if (json.data?.upiId) {
                        setCurrentUpi(json.data.upiId);
                        setUpiId(json.data.upiId);
                    }
                }
            })
            .catch(() => {});
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setMsg('');
        const trimmed = upiId.trim();
        if (!trimmed) {
            setMsg('Please enter a UPI ID');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/bookie/upi`, {
                method: 'PATCH',
                headers: getBookieAuthHeaders(),
                body: JSON.stringify({ upiId: trimmed }),
            });
            const json = await res.json();
            if (json.success) {
                setCurrentUpi(trimmed);
                setMsg('UPI ID saved successfully');
            } else {
                setMsg(json.message || 'Failed to save');
            }
        } catch {
            setMsg('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Settings">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Settings</h1>

            {bookieType === 'bookie_collects' ? (
                <div className="rounded-xl border border-gray-700 bg-gray-800/80 shadow-lg overflow-hidden max-w-xl">
                    <h2 className="text-lg font-bold text-yellow-500 bg-gray-800 px-4 py-3 border-b border-gray-700">
                        My UPI ID
                    </h2>
                    <div className="p-4 space-y-3">
                        <p className="text-gray-400 text-sm">
                            Your users will see this UPI ID when making deposit payments.
                            {currentUpi && <span className="block mt-1 text-green-400">Current: {currentUpi}</span>}
                        </p>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">UPI ID</label>
                                <input
                                    type="text"
                                    value={upiId}
                                    onChange={(e) => { setUpiId(e.target.value); setMsg(''); }}
                                    placeholder="e.g. yourname@upi"
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                />
                            </div>
                            {msg && (
                                <p className={`text-sm ${msg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                                    {msg}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Saving...' : 'Save UPI ID'}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-gray-700 bg-gray-800/80 shadow-lg overflow-hidden max-w-xl">
                    <div className="p-4">
                        <p className="text-gray-400 text-sm">
                            Your account type is <strong className="text-blue-400">Admin Collects</strong>. The admin manages payment collection and UPI settings.
                        </p>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Settings;
