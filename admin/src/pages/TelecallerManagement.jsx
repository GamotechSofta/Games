import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTimes, FaToggleOn, FaToggleOff, FaEye, FaEyeSlash, FaCopy } from 'react-icons/fa';
import { adminFetch, API_BASE_URL } from '../utils/api';
import { useAdminSettings } from '../context/AdminSettingsContext';
import TelecallerCallProgressModal from '../components/TelecallerCallProgressModal';

const TelecallerManagement = () => {
    const navigate = useNavigate();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selected, setSelected] = useState(null);
    const [formData, setFormData] = useState({ phone: '', password: '' });

    const PHONE_REGEX = /^[6-9]\d{9}$/;

    const displayPhone = (item) => item?.phone || String(item?.username || '').replace(/\D/g, '').slice(-10) || '—';
    const [editData, setEditData] = useState({ password: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);
    const { hasSecretDeclarePassword } = useAdminSettings();
    const [createdPasswords, setCreatedPasswords] = useState({});
    const [revealedPasswords, setRevealedPasswords] = useState({});
    const [showRevealModal, setShowRevealModal] = useState(false);
    const [pendingReveal, setPendingReveal] = useState(null);
    const [secretPassword, setSecretPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [revealLoading, setRevealLoading] = useState(false);
    const [callProgressTelecaller, setCallProgressTelecaller] = useState(null);

    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    if (admin.role !== 'super_admin') {
        navigate('/dashboard', { replace: true });
        return null;
    }

    const fetchList = async () => {
        try {
            setLoading(true);
            const res = await adminFetch(`${API_BASE_URL}/admin/telecallers`);
            const data = await res.json();
            if (data.success) setList(data.data || []);
            else setError(data.message || 'Failed to fetch telecallers');
        } catch {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, []);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setSuccess('Copied to clipboard');
        setTimeout(() => setSuccess(''), 2000);
    };

    const getDisplayPassword = (item) => {
        const id = String(item._id);
        return revealedPasswords[id] || createdPasswords[id] || null;
    };

    const openRevealPassword = (item) => {
        const existing = getDisplayPassword(item);
        if (existing) return;
        setPendingReveal(item);
        setSecretPassword('');
        setPasswordError('');
        setShowRevealModal(true);
    };

    const performRevealPassword = async (e) => {
        e?.preventDefault();
        if (!pendingReveal?._id) return;
        if (!hasSecretDeclarePassword) {
            setPasswordError('Set your secret declare password in Settings first.');
            return;
        }
        const val = secretPassword.trim();
        if (!val) {
            setPasswordError('Please enter the secret declare password');
            return;
        }
        setRevealLoading(true);
        setPasswordError('');
        try {
            const body = { secretDeclarePassword: val };
            const res = await adminFetch(`${API_BASE_URL}/admin/telecallers/${pendingReveal._id}/reveal-password`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success && data.data?.password) {
                setRevealedPasswords((prev) => ({
                    ...prev,
                    [String(pendingReveal._id)]: data.data.password,
                }));
                setShowRevealModal(false);
                setPendingReveal(null);
                setSecretPassword('');
            } else {
                setPasswordError(data.message || 'Could not reveal password');
            }
        } catch {
            setPasswordError('Network error.');
        } finally {
            setRevealLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const phone = String(formData.phone || '').replace(/\D/g, '').slice(0, 10);
        if (!phone) {
            setError('Mobile number is required');
            return;
        }
        if (!PHONE_REGEX.test(phone)) {
            setError('Enter a valid 10-digit mobile number (starting with 6–9)');
            return;
        }
        if (!formData.password || formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setFormLoading(true);
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/telecallers`, {
                method: 'POST',
                body: JSON.stringify({ phone, password: formData.password }),
            });
            const data = await res.json();
            if (data.success) {
                const newId = (data.data?.id ?? data.data?._id) != null ? String(data.data.id || data.data._id) : null;
                if (newId) {
                    setCreatedPasswords((prev) => ({ ...prev, [newId]: formData.password }));
                }
                setSuccess('Telecaller created. Password is shown in the table (use View after refresh with secret password).');
                setFormData({ phone: '', password: '' });
                setShowForm(false);
                fetchList();
            } else {
                setError(data.message || 'Create failed');
            }
        } catch {
            setError('Network error.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selected) return;
        setError('');
        setSuccess('');
        if (editData.password && editData.password.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }
        setFormLoading(true);
        try {
            const body = {};
            if (editData.password) body.password = editData.password;
            const res = await adminFetch(`${API_BASE_URL}/admin/telecallers/${selected._id}`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                if (editData.password && selected?._id) {
                    setCreatedPasswords((prev) => ({
                        ...prev,
                        [String(selected._id)]: editData.password,
                    }));
                    setRevealedPasswords((prev) => {
                        const next = { ...prev };
                        delete next[String(selected._id)];
                        return next;
                    });
                }
                setSuccess('Telecaller updated.');
                setShowEditModal(false);
                setSelected(null);
                setEditData({ password: '' });
                fetchList();
            } else {
                setError(data.message || 'Update failed');
            }
        } catch {
            setError('Network error.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selected?._id) return;
        setFormLoading(true);
        setError('');
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/telecallers/${selected._id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Telecaller account removed.');
                setShowDeleteModal(false);
                setSelected(null);
                fetchList();
            } else {
                setError(data.message || 'Delete failed');
            }
        } catch {
            setError('Network error.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleToggle = async (item) => {
        setTogglingId(item._id);
        setError('');
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/telecallers/${item._id}/toggle-status`, {
                method: 'PATCH',
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (data.success) {
                fetchList();
            } else {
                setError(data.message || 'Failed to update status');
            }
        } catch {
            setError('Network error.');
        } finally {
            setTogglingId(null);
        }
    };

    const openEdit = (item) => {
        setSelected(item);
        setEditData({ password: '' });
        setShowEditModal(true);
        setError('');
    };

    const openDelete = (item) => {
        setSelected(item);
        setShowDeleteModal(true);
        setError('');
    };

    return (
        <AdminLayout title="Telecaller accounts">
            <div className="max-w-4xl">
                <p className="text-gray-400 text-sm mb-4">
                    Create login IDs for the <strong className="text-gray-300">Telecaller dashboard</strong> app.
                    Telecallers see player contact and activity only (no wallet balances).
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-200 text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-200 text-sm">
                        {success}
                    </div>
                )}

                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            setShowForm(true);
                            setError('');
                            setSuccess('');
                            setFormData({ phone: '', password: '' });
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
                    >
                        <FaPlus className="w-4 h-4" /> Add Telecaller
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-400">Loading...</p>
                ) : (
                    <div className="rounded-xl border border-gray-700 bg-gray-800/80 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-700 bg-gray-800">
                                    <th className="px-4 py-3 text-gray-300 font-semibold">Mobile</th>
                                    <th className="px-4 py-3 text-gray-300 font-semibold">Calls done / players</th>
                                    <th className="px-4 py-3 text-gray-300 font-semibold">Password</th>
                                    <th className="px-4 py-3 text-gray-300 font-semibold">Status</th>
                                    <th className="px-4 py-3 text-gray-300 font-semibold">Created</th>
                                    <th className="px-4 py-3 text-gray-300 font-semibold w-40">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-gray-500 text-center">
                                            No telecaller accounts yet. Add one for your calling team.
                                        </td>
                                    </tr>
                                ) : (
                                    list.map((item) => {
                                        const plainPass = getDisplayPassword(item);
                                        return (
                                        <tr key={item._id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setCallProgressTelecaller(item)}
                                                    className="text-white font-medium font-mono hover:text-yellow-400 hover:underline text-left"
                                                    title="View calls completed"
                                                >
                                                    {displayPhone(item)}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setCallProgressTelecaller(item)}
                                                    className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold"
                                                    title="View call progress"
                                                >
                                                    <span>{item.calledCount ?? 0}</span>
                                                    <span className="text-gray-500 font-normal">
                                                        {' '}/ {item.totalPlayers ?? '—'}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                {plainPass ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-yellow-400 text-sm">{plainPass}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(plainPass)}
                                                            className="text-gray-400 hover:text-yellow-400"
                                                            title="Copy password"
                                                        >
                                                            <FaCopy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : item.hasStoredPassword ? (
                                                    hasSecretDeclarePassword ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openRevealPassword(item)}
                                                            className="inline-flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300"
                                                        >
                                                            <FaEye className="w-3.5 h-3.5" />
                                                            View
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-500" title="Set secret declare password in Settings">
                                                            Set secret in Settings
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-xs text-gray-500" title="Set password via Edit to enable reveal">
                                                        Set in Edit
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        item.status === 'active'
                                                            ? 'bg-green-900/50 text-green-300 border border-green-700'
                                                            : 'bg-gray-700 text-gray-400 border border-gray-600'
                                                    }`}
                                                >
                                                    {item.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                {item.createdAt
                                                    ? new Date(item.createdAt).toLocaleDateString('en-IN')
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggle(item)}
                                                    disabled={togglingId === item._id}
                                                    className="text-gray-300 hover:text-yellow-400 mr-2 disabled:opacity-50"
                                                    title={item.status === 'active' ? 'Deactivate' : 'Activate'}
                                                >
                                                    {item.status === 'active' ? (
                                                        <FaToggleOn className="w-5 h-5 text-green-400" />
                                                    ) : (
                                                        <FaToggleOff className="w-5 h-5" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(item)}
                                                    className="text-yellow-400 hover:text-yellow-300 mr-3"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDelete(item)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {showForm && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-yellow-500">Add Telecaller</h2>
                                <button type="button" onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-white">
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Mobile number *</label>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                                        })}
                                        placeholder="10-digit mobile (6–9xxxxxxxxx)"
                                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Password * (min 6)</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-2.5 pr-10 rounded-lg bg-gray-700 border border-gray-600 text-white"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50"
                                    >
                                        {formLoading ? 'Creating…' : 'Create'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showEditModal && selected && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-yellow-500">Edit telecaller</h2>
                                <button type="button" onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-white">
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-4 space-y-4">
                                <p className="text-gray-400 text-sm">
                                    Mobile: <span className="text-white font-medium font-mono">{displayPhone(selected)}</span>
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">New password (optional)</label>
                                    <div className="relative">
                                        <input
                                            type={showEditPassword ? 'text' : 'password'}
                                            value={editData.password}
                                            onChange={(e) => setEditData({ password: e.target.value })}
                                            placeholder="Leave blank to keep current"
                                            className="w-full px-4 py-2.5 pr-10 rounded-lg bg-gray-700 border border-gray-600 text-white"
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowEditPassword((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        >
                                            {showEditPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50"
                                    >
                                        {formLoading ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showRevealModal && pendingReveal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-yellow-500">View telecaller password</h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRevealModal(false);
                                        setPendingReveal(null);
                                        setSecretPassword('');
                                        setPasswordError('');
                                    }}
                                    className="p-2 text-gray-400 hover:text-white"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={performRevealPassword} className="p-4 space-y-4">
                                <p className="text-gray-300 text-sm">
                                    Mobile: <span className="text-white font-medium font-mono">{displayPhone(pendingReveal)}</span>
                                </p>
                                <p className="text-gray-400 text-xs">
                                    Enter your secret declare password to view this telecaller&apos;s login password.
                                </p>
                                <input
                                    type="password"
                                    value={secretPassword}
                                    onChange={(e) => {
                                        setSecretPassword(e.target.value);
                                        setPasswordError('');
                                    }}
                                    placeholder="Secret declare password"
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white"
                                    autoFocus
                                />
                                {passwordError && (
                                    <p className="text-red-400 text-sm">{passwordError}</p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={revealLoading || !secretPassword.trim()}
                                        className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50"
                                    >
                                        {revealLoading ? 'Loading…' : 'Confirm'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowRevealModal(false);
                                            setPendingReveal(null);
                                            setSecretPassword('');
                                            setPasswordError('');
                                        }}
                                        className="px-4 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showDeleteModal && selected && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-md w-full p-6">
                            <h2 className="text-lg font-bold text-red-400 mb-2">Delete telecaller?</h2>
                            <p className="text-gray-300 text-sm mb-4">
                                Remove <strong className="text-white font-mono">{displayPhone(selected)}</strong>? They will no longer be able to sign in to the telecaller app.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={formLoading}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg disabled:opacity-50"
                                >
                                    {formLoading ? 'Deleting…' : 'Delete'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <TelecallerCallProgressModal
                    telecaller={callProgressTelecaller}
                    onClose={() => setCallProgressTelecaller(null)}
                />
            </div>
        </AdminLayout>
    );
};

export default TelecallerManagement;
