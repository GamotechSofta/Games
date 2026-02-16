import React, { useState } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders } from '../utils/api';

const AddUser = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        phone: '',
        role: 'user',
        balance: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === 'balance' ? (value === '' ? '' : (parseFloat(value) || 0)) : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const payload = { ...formData, balance: formData.balance === '' ? 0 : Number(formData.balance) };
            const response = await fetch(`${API_BASE_URL}/users/create`, {
                method: 'POST',
                headers: getBookieAuthHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('Player created successfully! Player is now linked to your account.');
                setFormData({
                    username: '',
                    email: '',
                    password: '',
                    phone: '',
                    role: 'user',
                    balance: '',
                });
            } else {
                setError(data.message || 'Failed to create user');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Add Player">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            Add New Player
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Create a new player account and assign initial balance.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        {success}
                    </div>
                )}

                <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <div className="w-48 h-48 bg-amber-500/20 rounded-full blur-3xl"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    placeholder="Enter username"
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    placeholder="Enter email address"
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    placeholder="Set password (min 6 chars)"
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                                    required
                                    minLength="6"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    placeholder="Enter phone number"
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role <span className="text-red-500">*</span></label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                                    required
                                >
                                    <option value="user">Player</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Initial Balance</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-slate-500 font-bold">₹</span>
                                    </div>
                                    <input
                                        type="number"
                                        name="balance"
                                        value={formData.balance}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        placeholder=""
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                        Creating...
                                    </span>
                                ) : 'Create Player'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default AddUser;
