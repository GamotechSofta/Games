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

    // UPI IDs state (multiple)
    const [upiIds, setUpiIds] = useState(['']);
    const [upiLoading, setUpiLoading] = useState(false);
    const [upiMsg, setUpiMsg] = useState('');
    const [currentUpiIds, setCurrentUpiIds] = useState([]);
    const [upiDistributionType, setUpiDistributionType] = useState('all');
    const [upiBatchSize, setUpiBatchSize] = useState(10);

    useEffect(() => {
        adminFetch(`${API_BASE_URL}/admin/me/secret-declare-password-status`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success) setHasSecret(json.hasSecretDeclarePassword || false);
            })
            .catch(() => setHasSecret(false));
        // Fetch current UPI IDs
        adminFetch(`${API_BASE_URL}/admin/me/upi`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) {
                    const ids = json.data.upiIds && json.data.upiIds.length > 0
                        ? json.data.upiIds
                        : (json.data.upiId ? [json.data.upiId] : []);
                    setCurrentUpiIds(ids);
                    setUpiIds(ids.length > 0 ? ids : ['']);
                    setUpiDistributionType(json.data.upiDistributionType || 'all');
                    setUpiBatchSize(json.data.upiBatchSize ?? 10);
                }
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

    const handleSaveUpi = async (e) => {
        e.preventDefault();
        setUpiMsg('');
        const trimmed = upiIds.map((id) => String(id || '').trim()).filter(Boolean);
        if (trimmed.length === 0) {
            setUpiMsg('Please enter at least one UPI ID');
            return;
        }
        setUpiLoading(true);
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/me/upi`, {
                method: 'PATCH',
                body: JSON.stringify({ upiIds: trimmed, upiDistributionType, upiBatchSize }),
            });
            const json = await res.json();
            if (json.success) {
                setCurrentUpiIds(trimmed);
                setUpiMsg('UPI IDs saved successfully');
            } else {
                setUpiMsg(json.message || 'Failed to save UPI IDs');
            }
        } catch {
            setUpiMsg('Network error');
        } finally {
            setUpiLoading(false);
        }
    };

    const addUpiRow = () => setUpiIds((prev) => [...prev, '']);
    const removeUpiRow = (idx) => setUpiIds((prev) => prev.filter((_, i) => i !== idx));
    const updateUpiRow = (idx, val) => setUpiIds((prev) => {
        const next = [...prev];
        next[idx] = val;
        return next;
    });

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
                {/* Admin UPI IDs Section */}
                <div className="rounded-xl border border-gray-700 bg-gray-800/80 shadow-lg overflow-hidden min-w-0">
                    <h2 className="text-lg font-bold text-yellow-500 bg-gray-800 px-4 py-3 border-b border-gray-700">
                        Admin UPI IDs
                    </h2>
                    <div className="p-4 space-y-3">
                        <p className="text-gray-400 text-sm">
                            These UPI IDs are shown to users for deposit payments (for &quot;Admin Collects&quot; type bookies and direct users). You can add multiple UPI IDs.
                            {currentUpiIds.length > 0 && <span className="block mt-1 text-green-400">Current: {currentUpiIds.join(', ')}</span>}
                        </p>
                        <form onSubmit={handleSaveUpi} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">UPI IDs</label>
                                {upiIds.map((id, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={id}
                                            onChange={(e) => { updateUpiRow(idx, e.target.value); setUpiMsg(''); }}
                                            placeholder="e.g. admin@upi"
                                            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeUpiRow(idx)}
                                            disabled={upiIds.length === 1}
                                            className="px-3 py-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                            title="Remove"
                                        >
                                            −
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addUpiRow}
                                    className="text-sm text-yellow-500 hover:text-yellow-400"
                                >
                                    + Add another UPI ID
                                </button>
                                <p className="text-xs text-gray-500">Stored encrypted in database. Not in .env file.</p>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-300">UPI distribution filter</label>
                                <p className="text-xs text-gray-500">How UPI IDs are shown to users</p>
                                <select
                                    value={upiDistributionType}
                                    onChange={(e) => setUpiDistributionType(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500"
                                >
                                    <option value="all">Show all – every user sees all UPI IDs</option>
                                    <option value="round_robin_user">Round robin – each user gets one different UPI ID</option>
                                    <option value="batch_n">Batch – first N users get UPI 1, next N get UPI 2, etc.</option>
                                    <option value="random">Random – each request gets one random UPI ID</option>
                                </select>
                                {upiDistributionType === 'batch_n' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Batch size (users per UPI)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={10000}
                                            value={upiBatchSize}
                                            onChange={(e) => setUpiBatchSize(Math.max(1, Math.min(10000, parseInt(e.target.value, 10) || 10)))}
                                            className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">e.g. 10 = first 10 users get UPI 1, next 10 get UPI 2</p>
                                    </div>
                                )}
                            </div>
                            {upiMsg && (
                                <p className={`text-sm ${upiMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                                    {upiMsg}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={upiLoading}
                                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {upiLoading ? 'Saving...' : 'Save UPI IDs'}
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
