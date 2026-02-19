import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { clearAdminAuth, getAdminAuthHeaders, API_BASE_URL } from '../utils/api';

const TAB_OPTIONS = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/all-users', label: 'All Players' },
    { path: '/markets', label: 'Markets' },
    { path: '/add-result', label: 'Add Result' },
    { path: '/update-rate', label: 'Update Rate' },
    { path: '/bet-history', label: 'Bet History' },
    { path: '/reports', label: 'Report' },
    { path: '/revenue', label: 'Revenue' },
    { path: '/payment-management', label: 'Payments' },
    { path: '/daily-settlement', label: 'Daily Settlement' },
    { path: '/wallet', label: 'Wallet' },
    { path: '/help-desk', label: 'Help Desk' },
    { path: '/logs', label: 'Logs' },
];

const SpecificAdminManagement = () => {
    const navigate = useNavigate();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selected, setSelected] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        allowedTabs: [],
        secretDeclarePassword: '',
    });
    const [editData, setEditData] = useState({ allowedTabs: [], password: '', secretDeclarePassword: '', clearSecretPassword: false });
    const [formLoading, setFormLoading] = useState(false);
    /** Secret password shown in table for just-created admins (id -> plain text). Cleared on refresh. */
    const [createdSecrets, setCreatedSecrets] = useState({});
    const [showEditSecretPassword, setShowEditSecretPassword] = useState(false);
    const [showEditNewPassword, setShowEditNewPassword] = useState(false);

    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    if (admin.role !== 'super_admin') {
        navigate('/dashboard', { replace: true });
        return null;
    }

    const fetchList = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/admin/specific-admins`, { headers: getAdminAuthHeaders() });
            const data = await res.json();
            if (data.success) setList(data.data || []);
            else setError(data.message || 'Failed to fetch');
        } catch (err) {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const loginNumber = (formData.username || '').trim();
        if (!loginNumber) {
            setError('Login number is required');
            return;
        }
        if (!formData.password || formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        const secretVal = (formData.secretDeclarePassword || '').trim();
        if (secretVal.length < 4) {
            setError('Secret password is required (min 4 characters)');
            return;
        }
        setFormLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/specific-admins`, {
                method: 'POST',
                headers: getAdminAuthHeaders(),
                body: JSON.stringify({
                    username: loginNumber,
                    password: formData.password,
                    allowedTabs: formData.allowedTabs || [],
                    secretDeclarePassword: secretVal,
                }),
            });
            const data = await res.json();
            if (data.success) {
                const newId = (data.data?.id ?? data.data?._id) != null ? String(data.data.id || data.data._id) : null;
                if (newId) setCreatedSecrets((prev) => ({ ...prev, [newId]: secretVal }));
                setSuccess(
                    `Specific admin created. Secret password is shown in the table below (copy and share with them).`
                );
                setFormData({ username: '', password: '', allowedTabs: [], secretDeclarePassword: '' });
                setShowForm(false);
                fetchList();
            } else {
                setError(data.message || 'Create failed');
            }
        } catch (err) {
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
        setFormLoading(true);
        try {
            const body = { allowedTabs: editData.allowedTabs || [] };
            if (editData.password && editData.password.length >= 6) body.password = editData.password;
            if (editData.clearSecretPassword) body.secretDeclarePassword = null;
            else if (editData.secretDeclarePassword?.trim().length >= 4) body.secretDeclarePassword = editData.secretDeclarePassword.trim();
            const res = await fetch(`${API_BASE_URL}/admin/specific-admins/${selected._id}`, {
                method: 'PUT',
                headers: getAdminAuthHeaders(),
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Specific admin updated.');
                setShowEditModal(false);
                setSelected(null);
                setEditData({ allowedTabs: [], password: '', secretDeclarePassword: '', clearSecretPassword: false });
                fetchList();
            } else {
                setError(data.message || 'Update failed');
            }
        } catch (err) {
            setError('Network error.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selected) return;
        setFormLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/specific-admins/${selected._id}`, {
                method: 'DELETE',
                headers: getAdminAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Specific admin removed.');
                setShowDeleteModal(false);
                setSelected(null);
                fetchList();
            } else {
                setError(data.message || 'Delete failed');
            }
        } catch (err) {
            setError('Network error.');
        } finally {
            setFormLoading(false);
        }
    };

    const toggleTab = (path, isForm) => {
        if (isForm) {
            const next = formData.allowedTabs.includes(path)
                ? formData.allowedTabs.filter((p) => p !== path)
                : [...formData.allowedTabs, path];
            setFormData({ ...formData, allowedTabs: next });
        } else {
            const next = editData.allowedTabs.includes(path)
                ? editData.allowedTabs.filter((p) => p !== path)
                : [...editData.allowedTabs, path];
            setEditData({ ...editData, allowedTabs: next });
        }
    };

    const openEdit = (item) => {
        setSelected(item);
        setEditData({
            allowedTabs: item.allowedTabs || [],
            password: '',
            secretDeclarePassword: '',
            clearSecretPassword: false,
        });
        setShowEditSecretPassword(false);
        setShowEditNewPassword(false);
        setShowEditModal(true);
        setError('');
    };

    const openDelete = (item) => {
        setSelected(item);
        setShowDeleteModal(true);
        setError('');
    };

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Specific Admin">
            <div className="w-full min-w-0 px-3 sm:px-4 md:px-6 pb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Specific Admin</h1>
                <p className="text-gray-400 text-sm mb-6">
                    Create admins with a login number and password. Choose which tabs they can access; they will only see those after login.
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
                        onClick={() => { setShowForm(true); setError(''); setSuccess(''); setFormData({ username: '', password: '', allowedTabs: [] }); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
                    >
                        <FaPlus className="w-4 h-4" /> Add Specific Admin
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-400">Loading...</p>
                ) : (
                    <div className="rounded-xl border border-gray-700 bg-gray-800/80 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-700 bg-gray-800">
                                    <th className="px-4 py-3 text-gray-300 font-semibold">Login number</th>
                                    <th className="px-4 py-3 text-gray-300 font-semibold">Secret password</th>
                                    <th className="px-4 py-3 text-gray-300 font-semibold">Allowed tabs</th>
                                    <th className="px-4 py-3 text-gray-300 font-semibold w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-6 text-gray-500 text-center">
                                            No specific admins yet. Add one to let another admin log in with limited tabs.
                                        </td>
                                    </tr>
                                ) : (
                                    list.map((item) => (
                                        <tr key={item._id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                            <td className="px-4 py-3 text-white font-medium">{item.username}</td>
                                            <td className="px-4 py-3">
                                                {createdSecrets[String(item._id)] ? (
                                                    <span className="text-sm font-medium text-yellow-400" title="Shown only after create; refresh to hide">
                                                        {createdSecrets[String(item._id)]}
                                                    </span>
                                                ) : item.hasSecretDeclarePassword ? (
                                                    <span className="text-xs font-medium text-green-400">Set</span>
                                                ) : (
                                                    <span className="text-xs text-gray-500">Not set</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                {(item.allowedTabs || []).length === 0
                                                    ? 'None'
                                                    : (item.allowedTabs || [])
                                                          .map((p) => TAB_OPTIONS.find((t) => t.path === p)?.label || p)
                                                          .join(', ')}
                                            </td>
                                            <td className="px-4 py-3">
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Create form modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-yellow-500">Add Specific Admin</h2>
                                <button type="button" onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-white">
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Login number (username) *</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="e.g. 9876543210 or admin2"
                                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Password * (min 6 characters)</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Secret password *</label>
                                    <p className="text-xs text-gray-500 mb-2">Required when this admin declares results or deletes markets. Min 4 characters. Super admin sets it and must share it with them.</p>
                                    <input
                                        type="password"
                                        value={formData.secretDeclarePassword}
                                        onChange={(e) => setFormData({ ...formData, secretDeclarePassword: e.target.value })}
                                        placeholder="Min 4 characters"
                                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700 border border-gray-600 text-white"
                                        required
                                        minLength={4}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Tabs this admin can access</label>
                                    <div className="flex flex-wrap gap-3">
                                        {TAB_OPTIONS.map((tab) => (
                                            <label key={tab.path} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.allowedTabs.includes(tab.path)}
                                                    onChange={() => toggleTab(tab.path, true)}
                                                    className="rounded border-gray-600 bg-gray-700 text-yellow-500"
                                                />
                                                <span className="text-gray-300">{tab.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50"
                                    >
                                        {formLoading ? 'Creating...' : 'Create'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit modal */}
                {showEditModal && selected && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
                                <h2 className="text-lg font-bold text-yellow-500">Edit specific admin</h2>
                                <button type="button" onClick={() => { setShowEditModal(false); setSelected(null); }} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700" aria-label="Close">
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-4 sm:p-5 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Login number</label>
                                    <div className="text-sm text-white font-medium bg-gray-700/60 px-4 py-3 rounded-lg border border-gray-600">
                                        {selected.username}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Login cannot be changed.</p>
                                </div>

                                <div className="rounded-lg border border-gray-600 bg-gray-700/30 p-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-3">Tabs this admin can access</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                                        {TAB_OPTIONS.map((tab) => (
                                            <label key={tab.path} className="flex items-center gap-2 cursor-pointer py-1">
                                                <input
                                                    type="checkbox"
                                                    checked={editData.allowedTabs.includes(tab.path)}
                                                    onChange={() => toggleTab(tab.path, false)}
                                                    className="rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500"
                                                />
                                                <span className="text-gray-300 text-sm">{tab.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-600 bg-gray-700/30 p-4 space-y-4">
                                    <p className="text-sm font-medium text-gray-300">Passwords</p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">
                                            Secret password {selected.hasSecretDeclarePassword ? <span className="text-green-400 font-normal">(set)</span> : <span className="text-gray-500 font-normal">(not set)</span>}
                                        </label>
                                        <p className="text-xs text-gray-500 mb-2">
                                            {selected.hasSecretDeclarePassword
                                                ? 'Enter new value to change, or check Clear to remove.'
                                                : 'Min 4 characters. Required for declare/delete.'}
                                        </p>
                                        <div className="relative">
                                            <input
                                                type={showEditSecretPassword ? 'text' : 'password'}
                                                value={editData.secretDeclarePassword}
                                                onChange={(e) => setEditData({ ...editData, secretDeclarePassword: e.target.value })}
                                                placeholder="Min 4 characters"
                                                disabled={editData.clearSecretPassword}
                                                className="w-full px-4 py-2.5 pr-11 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                                minLength={4}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowEditSecretPassword((s) => !s)}
                                                disabled={editData.clearSecretPassword}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label={showEditSecretPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showEditSecretPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {selected.hasSecretDeclarePassword && (
                                            <label className="mt-2 flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                                                <input
                                                    type="checkbox"
                                                    checked={editData.clearSecretPassword}
                                                    onChange={(e) => setEditData({ ...editData, clearSecretPassword: e.target.checked, ...(e.target.checked ? { secretDeclarePassword: '' } : {}) })}
                                                    className="rounded border-gray-600 bg-gray-700 text-red-500"
                                                />
                                                Clear secret password
                                            </label>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">New login password</label>
                                        <p className="text-xs text-gray-500 mb-2">Leave blank to keep current. Min 6 characters to change.</p>
                                        <div className="relative">
                                            <input
                                                type={showEditNewPassword ? 'text' : 'password'}
                                                value={editData.password}
                                                onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                                                placeholder="Min 6 characters"
                                                className="w-full px-4 py-2.5 pr-11 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500"
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowEditNewPassword((s) => !s)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white"
                                                aria-label={showEditNewPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showEditNewPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => { setShowEditModal(false); setSelected(null); }}
                                        className="px-4 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50"
                                    >
                                        {formLoading ? 'Saving...' : 'Save changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete confirm */}
                {showDeleteModal && selected && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-sm w-full p-4">
                            <p className="text-gray-300 mb-4">
                                Remove specific admin <strong className="text-white">{selected.username}</strong>? They will no longer be able to log in.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={formLoading}
                                    className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg disabled:opacity-50"
                                >
                                    {formLoading ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowDeleteModal(false); setSelected(null); }}
                                    className="px-4 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default SpecificAdminManagement;
