import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaPlus, FaTimes, FaEye, FaEyeSlash, FaCopy } from 'react-icons/fa';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';

const BookieManagement = () => {
    const navigate = useNavigate();
    const [bookies, setBookies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedBookie, setSelectedBookie] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    
    // Form data - create: firstName, lastName, email, phone, password, confirmPassword, bookieType, commissionPercentage, upiId
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        bookieType: 'admin_collects',
        commissionPercentage: '',
        upiId: '',
    });

    const [formLoading, setFormLoading] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [hasSecretDeclarePassword, setHasSecretDeclarePassword] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [secretPassword, setSecretPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [pendingBookie, setPendingBookie] = useState(null);

    const PHONE_REGEX = /^[6-9]\d{9}$/;

    // Fetch all bookies
    const fetchBookies = async () => {
        try {
            setLoading(true);
            const response = await adminFetch(`${API_BASE_URL}/admin/bookies`);
            const data = await response.json();
            if (data.success) {
                setBookies(data.data);
            } else {
                setError(data.message || 'Failed to fetch bookies');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookies();
    }, []);

    useEffect(() => {
        adminFetch(`${API_BASE_URL}/admin/me/secret-declare-password-status`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success) setHasSecretDeclarePassword(json.hasSecretDeclarePassword || false);
            })
            .catch(() => setHasSecretDeclarePassword(false));
    }, []);

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        const processed = name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
        setFormData({ ...formData, [name]: processed });
        setError('');
    };

    // Create new bookie
    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        const trimmedFirst = (formData.firstName || '').trim();
        const trimmedLast = (formData.lastName || '').trim();
        const username = `${trimmedFirst} ${trimmedLast}`.trim();
        if (!trimmedFirst || !trimmedLast) {
            setError('First name and last name are required');
            return;
        }
        if (!formData.phone || !formData.phone.trim()) {
            setError('Phone number is required (bookies log in with phone + password)');
            return;
        }
        if (!PHONE_REGEX.test(formData.phone.replace(/\D/g, ''))) {
            setError('Please enter a valid 10-digit phone number (starting with 6–9)');
            return;
        }
        if (!formData.password || formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setFormLoading(true);
        try {
            const payload = {
                firstName: trimmedFirst,
                lastName: trimmedLast,
                username,
                email: formData.email.trim(),
                phone: formData.phone.replace(/\D/g, '').slice(0, 10),
                password: formData.password,
                bookieType: formData.bookieType || 'admin_collects',
                commissionPercentage: formData.commissionPercentage !== '' ? Number(formData.commissionPercentage) : 0,
                upiId: formData.bookieType === 'bookie_collects' ? (formData.upiId || '').trim() : '',
            };
            const response = await adminFetch(`${API_BASE_URL}/admin/bookies`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('Bookie account created successfully!');
                setShowCreateModal(false);
                setFormData({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', bookieType: 'admin_collects', commissionPercentage: '', upiId: '' });
                fetchBookies();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.message || 'Failed to create bookie');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setFormLoading(false);
        }
    };

    // Update bookie
    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');
        const trimmedFirst = (formData.firstName || '').trim();
        const trimmedLast = (formData.lastName || '').trim();
        if (!trimmedFirst || !trimmedLast) {
            setError('First name and last name are required');
            return;
        }
        if (formData.phone && !PHONE_REGEX.test(formData.phone.replace(/\D/g, ''))) {
            setError('Please enter a valid 10-digit phone number (starting with 6–9)');
            return;
        }
        if (formData.password && formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setFormLoading(true);
        try {
            const updateData = {
                firstName: trimmedFirst,
                lastName: trimmedLast,
                email: formData.email.trim(),
                phone: formData.phone.replace(/\D/g, '').slice(0, 10) || formData.phone,
                bookieType: formData.bookieType || 'admin_collects',
                commissionPercentage: formData.commissionPercentage !== '' ? Number(formData.commissionPercentage) : 0,
                upiId: formData.bookieType === 'bookie_collects' ? (formData.upiId || '').trim() : '',
            };
            if (formData.password) updateData.password = formData.password;

            const response = await adminFetch(`${API_BASE_URL}/admin/bookies/${selectedBookie._id}`, {
                method: 'PUT',
                body: JSON.stringify(updateData),
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('Bookie updated successfully!');
                setShowEditModal(false);
                setSelectedBookie(null);
                setFormData({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', bookieType: 'admin_collects', commissionPercentage: '', upiId: '' });
                fetchBookies();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.message || 'Failed to update bookie');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setFormLoading(false);
        }
    };

    // Delete bookie
    const handleDelete = async () => {
        if (!selectedBookie?._id) return;
        if (hasSecretDeclarePassword && !secretPassword.trim()) {
            setPasswordError('Please enter the secret declare password');
            return;
        }
        setError('');
        setPasswordError('');
        setFormLoading(true);

        try {
            const opts = { method: 'DELETE' };
            if (hasSecretDeclarePassword) opts.body = JSON.stringify({ secretDeclarePassword: secretPassword.trim() });
            const response = await adminFetch(`${API_BASE_URL}/admin/bookies/${selectedBookie._id}`, opts);
            const data = await response.json();

            if (data.success) {
                setSuccess('Bookie deleted successfully!');
                setShowDeleteModal(false);
                setSelectedBookie(null);
                setSecretPassword('');
                fetchBookies();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                if (data.code === 'INVALID_SECRET_DECLARE_PASSWORD') {
                    setPasswordError(data.message || 'Invalid secret password');
                } else {
                    setError(data.message || 'Failed to delete bookie');
                }
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setFormLoading(false);
        }
    };

    const performToggleStatus = async (bookie, secretDeclarePasswordValue) => {
        if (!bookie?._id) return;
        setTogglingId(bookie._id);
        setError('');
        setPasswordError('');
        try {
            const opts = { method: 'PATCH' };
            if (secretDeclarePasswordValue) opts.body = JSON.stringify({ secretDeclarePassword: secretDeclarePasswordValue });
            const response = await adminFetch(`${API_BASE_URL}/admin/bookies/${bookie._id}/toggle-status`, opts);
            const data = await response.json();
            if (data.success) {
                setShowPasswordModal(false);
                setPendingBookie(null);
                setSecretPassword('');
                setSuccess(`Bookie ${data.data.status === 'active' ? 'unsuspended' : 'suspended'} successfully!`);
                fetchBookies();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                if (data.code === 'INVALID_SECRET_DECLARE_PASSWORD') {
                    setPasswordError(data.message || 'Invalid secret password');
                } else {
                    setError(data.message || 'Failed to toggle status');
                }
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setTogglingId(null);
        }
    };

    const handleToggleStatus = (bookie) => {
        if (!bookie?._id) return;
        if (hasSecretDeclarePassword) {
            setPendingBookie(bookie);
            setShowPasswordModal(true);
            setSecretPassword('');
            setPasswordError('');
        } else {
            performToggleStatus(bookie, '');
        }
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        const val = secretPassword.trim();
        if (hasSecretDeclarePassword && !val) {
            setPasswordError('Please enter the secret declare password');
            return;
        }
        if (pendingBookie) performToggleStatus(pendingBookie, val);
    };

    // Open edit modal - fetch bookie by ID to get decrypted UPI, then populate form
    const openEditModal = async (bookie) => {
        setSelectedBookie(bookie);
        const parts = (bookie.username || '').trim().split(/\s+/);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        setFormData({
            firstName,
            lastName,
            email: bookie.email || '',
            phone: bookie.phone || '',
            password: '',
            confirmPassword: '',
            bookieType: bookie.bookieType || 'admin_collects',
            commissionPercentage: bookie.commissionPercentage ?? '',
            upiId: '',
        });
        setShowEditModal(true);
        // Fetch full bookie to get decrypted UPI ID
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/bookies/${bookie._id}`);
            const json = await res.json();
            if (json.success && json.data) {
                const b = json.data;
                const decryptedUpi = b.upiIdDecrypted || '';
                setFormData(prev => ({ ...prev, upiId: decryptedUpi }));
            }
        } catch {
            // Keep upiId empty on fetch error
        }
    };

    // Open delete modal
    const openDeleteModal = (bookie) => {
        setSelectedBookie(bookie);
        setSecretPassword('');
        setPasswordError('');
        setShowDeleteModal(true);
    };

    // Copy to clipboard
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setSuccess('Copied to clipboard!');
        setTimeout(() => setSuccess(''), 2000);
    };

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Bookie Accounts">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold">Bookie Accounts Management</h1>
                        <button
                            onClick={() => {
                                setFormData({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', bookieType: 'admin_collects', commissionPercentage: '', upiId: '' });
                                setShowCreateModal(true);
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2.5 px-4 rounded-lg transition-colors text-sm sm:text-base"
                        >
                            <FaPlus /> Add New Bookie
                        </button>
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                            {error}
                            <button onClick={() => setError('')} className="float-right">
                                <FaTimes />
                            </button>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
                            {success}
                        </div>
                    )}

                    {/* Bookies Table */}
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
                                <p className="mt-4 text-gray-400">Loading bookies...</p>
                            </div>
                        ) : bookies.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p>No bookie accounts found.</p>
                                <p className="mt-2">Click "Add New Bookie" to create one.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm sm:text-base">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            #
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            Rate
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            Created At
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {bookies.map((bookie, index) => (
                                        <tr key={bookie._id} className="hover:bg-gray-750">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-white">{bookie.username}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(bookie.username)}
                                                        className="text-gray-400 hover:text-yellow-500"
                                                        title="Copy name"
                                                    >
                                                        <FaCopy size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                                {bookie.email || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                                {bookie.phone || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    bookie.bookieType === 'bookie_collects'
                                                        ? 'bg-purple-900/50 text-purple-400 border border-purple-700'
                                                        : 'bg-blue-900/50 text-blue-400 border border-blue-700'
                                                }`}>
                                                    {bookie.bookieType === 'bookie_collects' ? 'Bookie Collects' : 'Admin Collects'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-yellow-400 font-semibold">{bookie.commissionPercentage || 0}%</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    bookie.status === 'active' 
                                                        ? 'bg-green-900/50 text-green-400 border border-green-700' 
                                                        : 'bg-red-900/50 text-red-400 border border-red-700'
                                                }`}>
                                                    {bookie.status === 'active' ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                                {new Date(bookie.createdAt).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleToggleStatus(bookie)}
                                                        disabled={togglingId === bookie._id}
                                                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                                            bookie.status === 'active'
                                                                ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                        }`}
                                                        title={bookie.status === 'active' ? 'Suspend' : 'Unsuspend'}
                                                    >
                                                        {togglingId === bookie._id ? (
                                                            <span className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                                                        ) : bookie.status === 'active' ? (
                                                            <FaToggleOn size={18} />
                                                        ) : (
                                                            <FaToggleOff size={18} />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(bookie)}
                                                        className="p-2 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(bookie)}
                                                        className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <FaTrash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>

                    {/* Info Card */}
                    <div className="mt-4 sm:mt-6 bg-gray-800 rounded-lg p-4 sm:p-6">
                        <h3 className="text-base sm:text-lg font-semibold text-yellow-500 mb-3">Bookie Login Information</h3>
                        <div className="text-gray-300 space-y-2 text-sm sm:text-base">
                            <p><strong>Bookie Panel URL:</strong> <code className="bg-gray-700 px-2 py-1 rounded">/bookie</code></p>
                            <p><strong>Login:</strong> Bookies use their Phone number and the password you set.</p>
                            <p><strong>Status:</strong> Suspended bookies cannot login to the bookie panel.</p>
                        </div>
                    </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Create New Bookie</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-2">First Name *</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            required
                                            placeholder="First name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-2">Last Name *</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            required
                                            placeholder="Last name"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        maxLength={10}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        placeholder="10-digit (6–9 start)"
                                        required
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Bookies log in with phone + password.</p>
                                </div>
                                {/* Bookie Type */}
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">Bookie Type *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setFormData({ ...formData, bookieType: 'admin_collects' })}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${formData.bookieType === 'admin_collects' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'}`}>
                                            <div className="font-semibold">Admin Collects</div>
                                            <div className="text-xs mt-1 opacity-75">Admin pays bookie commission</div>
                                        </button>
                                        <button type="button" onClick={() => setFormData({ ...formData, bookieType: 'bookie_collects' })}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${formData.bookieType === 'bookie_collects' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'}`}>
                                            <div className="font-semibold">Bookie Collects</div>
                                            <div className="text-xs mt-1 opacity-75">Bookie pays admin platform charge</div>
                                        </button>
                                    </div>
                                </div>
                                {/* Commission / Platform Rate */}
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        {formData.bookieType === 'bookie_collects' ? 'Platform Charge %' : 'Commission Rate %'} *
                                    </label>
                                    <input
                                        type="number"
                                        name="commissionPercentage"
                                        value={formData.commissionPercentage}
                                        onChange={(e) => setFormData({ ...formData, commissionPercentage: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        placeholder="e.g. 10"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        {formData.bookieType === 'bookie_collects'
                                            ? 'Percentage bookie pays admin as platform charge'
                                            : 'Percentage admin pays bookie as commission'}
                                    </p>
                                </div>
                                {/* UPI ID (only for bookie_collects) */}
                                {formData.bookieType === 'bookie_collects' && (
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-2">Bookie UPI ID</label>
                                        <input
                                            type="text"
                                            name="upiId"
                                            value={formData.upiId}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            placeholder="e.g. bookie@upi (optional, bookie can set later)"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Users will see this UPI for payments. Bookie can update it later.</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">Password *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 pr-10"
                                            required
                                            minLength={6}
                                            placeholder="Minimum 6 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password *</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        required
                                        placeholder="Re-enter password"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {formLoading ? 'Creating...' : 'Create Bookie'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit Bookie</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-2">First Name *</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-2">Last Name *</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        maxLength={10}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        placeholder="10-digit (6–9 start)"
                                        required
                                    />
                                </div>
                                {/* Bookie Type */}
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">Bookie Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setFormData({ ...formData, bookieType: 'admin_collects' })}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${formData.bookieType === 'admin_collects' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'}`}>
                                            <div className="font-semibold">Admin Collects</div>
                                            <div className="text-xs mt-1 opacity-75">Admin pays bookie commission</div>
                                        </button>
                                        <button type="button" onClick={() => setFormData({ ...formData, bookieType: 'bookie_collects' })}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${formData.bookieType === 'bookie_collects' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'}`}>
                                            <div className="font-semibold">Bookie Collects</div>
                                            <div className="text-xs mt-1 opacity-75">Bookie pays admin platform charge</div>
                                        </button>
                                    </div>
                                </div>
                                {/* Commission / Platform Rate */}
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        {formData.bookieType === 'bookie_collects' ? 'Platform Charge %' : 'Commission Rate %'}
                                    </label>
                                    <input
                                        type="number"
                                        name="commissionPercentage"
                                        value={formData.commissionPercentage}
                                        onChange={(e) => setFormData({ ...formData, commissionPercentage: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        placeholder="e.g. 10"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                                {/* UPI ID (only for bookie_collects) */}
                                {formData.bookieType === 'bookie_collects' && (
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-2">Bookie UPI ID</label>
                                        <input
                                            type="text"
                                            name="upiId"
                                            value={formData.upiId}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            placeholder="Leave empty to keep current UPI"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Leave empty to keep current. Bookie can also update from their panel.</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        New Password (leave empty to keep current)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 pr-10"
                                            minLength={6}
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {formLoading ? 'Updating...' : 'Update Bookie'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-red-500">Delete Bookie</h2>
                            <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <p className="text-gray-300 mb-4">
                            Are you sure you want to delete the bookie account <strong className="text-white">"{selectedBookie?.username}"</strong>?
                        </p>
                        <p className="text-red-400 text-sm mb-4">
                            This action cannot be undone. The bookie will lose access to their account permanently.
                        </p>
                        {hasSecretDeclarePassword && (
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Secret declare password *</label>
                                <input
                                    type="password"
                                    placeholder="Secret declare password"
                                    value={secretPassword}
                                    onChange={(e) => { setSecretPassword(e.target.value); setPasswordError(''); }}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                {passwordError && (
                                    <p className="text-red-400 text-sm mt-2">{passwordError}</p>
                                )}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={formLoading || (hasSecretDeclarePassword && !secretPassword.trim())}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {formLoading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Secret password modal for suspend/unsuspend bookie */}
            {showPasswordModal && pendingBookie && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-gray-800 rounded-xl border border-gray-600 shadow-xl w-full max-w-md">
                        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-yellow-500">Confirm Suspend/Unsuspend Bookie</h3>
                            <button type="button" onClick={() => { setShowPasswordModal(false); setPendingBookie(null); setSecretPassword(''); setPasswordError(''); }} className="text-gray-400 hover:text-white p-1">×</button>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="p-4 space-y-4">
                            <p className="text-gray-300 text-sm">
                                Enter secret declare password to suspend/unsuspend this bookie.
                            </p>
                            <input
                                type="password"
                                placeholder="Secret declare password"
                                value={secretPassword}
                                onChange={(e) => { setSecretPassword(e.target.value); setPasswordError(''); }}
                                className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500"
                                autoFocus
                            />
                            {passwordError && (
                                <div className="rounded-lg bg-red-900/30 border border-red-600/50 text-red-200 text-sm px-3 py-2">{passwordError}</div>
                            )}
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => { setShowPasswordModal(false); setPendingBookie(null); setSecretPassword(''); setPasswordError(''); }} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancel</button>
                                <button type="submit" disabled={togglingId !== null} className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-black font-semibold disabled:opacity-50">
                                    {togglingId ? <span className="animate-spin">⏳</span> : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default BookieManagement;
