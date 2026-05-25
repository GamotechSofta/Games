import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';

const Settings = () => {
    const navigate = useNavigate();
    const [currentSecretPassword, setCurrentSecretPassword] = useState('');
    const [forgotSecret, setForgotSecret] = useState(false);
    const [adminLoginPassword, setAdminLoginPassword] = useState('');
    const [secretDeclarePassword, setSecretDeclarePassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [hasSecret, setHasSecret] = useState(false);

    // Payment limits (admin-only: min/max deposit & withdrawal)
    const [limits, setLimits] = useState({ minDeposit: 100, maxDeposit: 50000, minWithdrawal: 500, maxWithdrawal: 25000 });
    const [limitsLoading, setLimitsLoading] = useState(false);
    const [limitsMsg, setLimitsMsg] = useState('');
    const [limitsSecretPassword, setLimitsSecretPassword] = useState('');

    useEffect(() => {
        adminFetch(`${API_BASE_URL}/admin/me/secret-declare-password-status`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success) setHasSecret(json.hasSecretDeclarePassword || false);
            })
            .catch(() => setHasSecret(false));

        // Fetch payment limits (admin-set)
        adminFetch(`${API_BASE_URL}/payments/limits`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) setLimits(json.data);
            })
            .catch(() => {});
    }, []);

    const handleSetSecret = async (e) => {
        e.preventDefault();
        setStatusMsg('');
        if (hasSecret) {
            const useForgot = forgotSecret ? adminLoginPassword.trim() : currentSecretPassword.trim();
            if (!useForgot) {
                setStatusMsg(forgotSecret ? 'Admin login password is required to reset' : 'Current secret password is required to change it');
                return;
            }
        }
        if (secretDeclarePassword.length < 4) {
            setStatusMsg('Secret declare password must be at least 4 characters');
            return;
        }
        if (secretDeclarePassword !== confirmPassword) {
            setStatusMsg('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const body = { secretDeclarePassword };
            if (hasSecret) {
                if (forgotSecret) {
                    body.adminLoginPassword = adminLoginPassword;
                } else {
                    body.currentSecretDeclarePassword = currentSecretPassword;
                }
            }
            const res = await adminFetch(`${API_BASE_URL}/admin/me/secret-declare-password`, {
                method: 'PATCH',
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (json.success) {
                setCurrentSecretPassword('');
                setAdminLoginPassword('');
                setForgotSecret(false);
                setSecretDeclarePassword('');
                setConfirmPassword('');
                setHasSecret(true);
                setStatusMsg('Secret declare password set successfully');
            } else {
                setStatusMsg(json.message || 'Failed to set password');
            }
        } catch {
            setStatusMsg('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLimits = async (e) => {
        e.preventDefault();
        setLimitsMsg('');
        const minDeposit = parseInt(limits.minDeposit, 10);
        const maxDeposit = parseInt(limits.maxDeposit, 10);
        const minWithdrawal = parseInt(limits.minWithdrawal, 10);
        const maxWithdrawal = parseInt(limits.maxWithdrawal, 10);
        if (Number.isNaN(minDeposit) || minDeposit < 1 || Number.isNaN(maxDeposit) || maxDeposit < minDeposit) {
            setLimitsMsg('Invalid deposit limits (min/max must be positive, max ≥ min)');
            return;
        }
        if (Number.isNaN(minWithdrawal) || minWithdrawal < 1 || Number.isNaN(maxWithdrawal) || maxWithdrawal < minWithdrawal) {
            setLimitsMsg('Invalid withdrawal limits (min/max must be positive, max ≥ min)');
            return;
        }
        if (hasSecret && !limitsSecretPassword.trim()) {
            setLimitsMsg('Secret declare password is required to save payment limits');
            return;
        }
        setLimitsLoading(true);
        setLimitsMsg('');
        try {
            const body = { minDeposit, maxDeposit, minWithdrawal, maxWithdrawal };
            if (hasSecret) body.secretDeclarePassword = limitsSecretPassword.trim();
            const res = await adminFetch(`${API_BASE_URL}/payments/limits`, {
                method: 'PATCH',
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (json.success) {
                if (json.data) setLimits(json.data);
                setLimitsSecretPassword('');
                setLimitsMsg('Payment limits saved successfully');
            } else {
                setLimitsMsg(json.message || 'Failed to save limits');
            }
        } catch {
            setLimitsMsg('Network error');
        } finally {
            setLimitsLoading(false);
        }
    };
    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Settings">
            <div className="w-full min-w-0 px-3 sm:px-4 md:px-6 pb-6 sm:pb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-6">Settings</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="rounded-xl border border-gray-700 bg-gray-800/80 shadow-lg overflow-hidden min-w-0">
                    <h2 className="text-lg font-bold text-yellow-500 bg-gray-800 px-4 py-3 border-b border-gray-700">
                        Secret Declare Password
                    </h2>
                    <div className="p-4 space-y-3">
                        <p className="text-gray-400 text-sm">
                            This password is required when declaring results (Confirm &amp; Declare) for extra security.
                            {hasSecret && <span className="block mt-1 text-green-400">Password is currently set.</span>}
                        </p>
                        <form onSubmit={handleSetSecret} className="space-y-4">
                            {hasSecret && (
                                <div>
                                    {!forgotSecret ? (
                                        <>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                                Current secret password *
                                            </label>
                                            <input
                                                type="password"
                                                value={currentSecretPassword}
                                                onChange={(e) => { setCurrentSecretPassword(e.target.value); setAdminLoginPassword(''); setStatusMsg(''); }}
                                                placeholder=""
                                                className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                                autoComplete="current-password"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Enter current secret password to verify it&apos;s you before changing.</p>
                                            <button
                                                type="button"
                                                onClick={() => { setForgotSecret(true); setCurrentSecretPassword(''); setAdminLoginPassword(''); setStatusMsg(''); }}
                                                className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline"
                                            >
                                                Forgot current secret password?
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                                Admin login password * (reset option)
                                            </label>
                                            <input
                                                type="password"
                                                value={adminLoginPassword}
                                                onChange={(e) => { setAdminLoginPassword(e.target.value); setStatusMsg(''); }}
                                                placeholder=""
                                                className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                                autoComplete="current-password"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Enter the password you use to log into admin panel. This proves you&apos;re the admin and allows you to reset the secret.</p>
                                            <button
                                                type="button"
                                                onClick={() => { setForgotSecret(false); setAdminLoginPassword(''); setCurrentSecretPassword(''); setStatusMsg(''); }}
                                                className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline"
                                            >
                                                I remember my secret password
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    {hasSecret ? 'New secret password' : 'Secret password'}
                                </label>
                                <input
                                    type="password"
                                    value={secretDeclarePassword}
                                    onChange={(e) => setSecretDeclarePassword(e.target.value)}
                                    placeholder=""
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder=""
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                />
                            </div>
                            {statusMsg && (
                                <p className={`text-sm ${statusMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                                    {statusMsg}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Saving...' : 'Set Secret Password'}
                            </button>
                        </form>
                    </div>
                </div>
                {/* Payment limits – admin only: min/max for Add Fund & Withdraw */}
                <div className="rounded-xl border border-gray-700 bg-gray-800/80 shadow-lg overflow-hidden min-w-0">
                    <h2 className="text-lg font-bold text-yellow-500 bg-gray-800 px-4 py-3 border-b border-gray-700">
                        Payment Limits (Add Fund &amp; Withdraw)
                    </h2>
                    <div className="p-4 space-y-3">
                        <p className="text-gray-400 text-sm">
                            Set minimum and maximum amounts for deposits (Add Fund) and withdrawals. Only admins can change these. Users see these limits on the Add Fund and Withdraw screens.
                            {hasSecret && <span className="block mt-1 text-amber-400">Secret declare password required to save.</span>}
                        </p>
                        <form onSubmit={handleSaveLimits} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Min deposit (₹)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={limits.minDeposit}
                                        onChange={(e) => setLimits((p) => ({ ...p, minDeposit: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Max deposit (₹)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={limits.maxDeposit}
                                        onChange={(e) => setLimits((p) => ({ ...p, maxDeposit: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Min withdrawal (₹)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={limits.minWithdrawal}
                                        onChange={(e) => setLimits((p) => ({ ...p, minWithdrawal: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Max withdrawal (₹)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={limits.maxWithdrawal}
                                        onChange={(e) => setLimits((p) => ({ ...p, maxWithdrawal: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            {hasSecret && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Secret declare password *</label>
                                    <input
                                        type="password"
                                        value={limitsSecretPassword}
                                        onChange={(e) => { setLimitsSecretPassword(e.target.value); setLimitsMsg(''); }}
                                        placeholder="Enter secret password to confirm"
                                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                        autoComplete="current-password"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Same password you use for declaring results.</p>
                                </div>
                            )}
                            {limitsMsg && (
                                <p className={`text-sm ${limitsMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                                    {limitsMsg}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={limitsLoading}
                                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {limitsLoading ? 'Saving...' : 'Save Payment Limits'}
                            </button>
                        </form>
                    </div>
                </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Settings;
