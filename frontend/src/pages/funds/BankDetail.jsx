import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';

const BankDetail = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });
    
    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [fetchingBankName, setFetchingBankName] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchBankAccounts();
    }, []);

    const fetchBankAccounts = async () => {
        if (!user.id) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/bank-details?userId=${user.id}`);
            const data = await res.json();
            if (data.success) {
                setBankAccounts(data.data || []);
            }
        } catch (err) {
            setError(t('funds.failedToFetchBankAccounts'));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            accountHolderName: '',
            accountNumber: '',
            ifscCode: '',
            bankName: '',
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (acc) => {
        setFormData({
            accountHolderName: acc.accountHolderName || '',
            accountNumber: acc.accountNumber || '',
            ifscCode: acc.ifscCode || '',
            bankName: acc.bankName || '',
        });
        setEditingId(acc._id);
        setShowForm(true);
    };

    const fetchBankNameFromIFSC = async (ifscCode) => {
        if (!ifscCode || ifscCode.length < 11) return;
        
        const cleanIFSC = ifscCode.trim().toUpperCase();
        if (cleanIFSC.length !== 11) return;

        setFetchingBankName(true);
        try {
            // Using Razorpay IFSC API (free and reliable)
            const res = await fetch(`https://ifsc.razorpay.com/${cleanIFSC}`);
            if (res.ok) {
                const data = await res.json();
                if (data.BANK) {
                    setFormData(prev => ({ ...prev, bankName: data.BANK }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch bank name from IFSC:', err);
            // Silently fail - user can manually enter bank name
        } finally {
            setFetchingBankName(false);
        }
    };

    const handleIFSCChange = (e) => {
        const ifscValue = e.target.value.toUpperCase();
        setFormData({ ...formData, ifscCode: ifscValue });
        
        // Auto-fetch bank name when IFSC is complete (11 characters)
        if (ifscValue.length === 11) {
            fetchBankNameFromIFSC(ifscValue);
        } else if (ifscValue.length < 11) {
            // Clear bank name if IFSC is incomplete
            setFormData(prev => ({ ...prev, bankName: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.accountHolderName) {
            setError(t('funds.accountHolderNameRequired'));
            return;
        }

        if (!formData.accountNumber || !formData.ifscCode) {
            setError(t('funds.accountNumberAndIFSCRequired'));
            return;
        }

        setSubmitting(true);

        try {
            const url = editingId 
                ? `${API_BASE_URL}/bank-details/${editingId}`
                : `${API_BASE_URL}/bank-details`;
            
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    ...formData,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSuccessMessage({
                    title: editingId ? t('funds.bankAccountUpdated') : t('funds.bankAccountAdded'),
                    subtitle: editingId 
                        ? t('funds.bankAccountUpdatedSubtitle')
                        : t('funds.bankAccountAddedSubtitle')
                });
                setShowSuccessModal(true);
                resetForm();
                fetchBankAccounts();
            } else {
                setError(data.message || t('funds.failedToSave'));
            }
        } catch (err) {
            setError(t('funds.networkError'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('funds.confirmDeleteBankAccount'))) return;

        try {
            const res = await fetch(`${API_BASE_URL}/bank-details/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(t('funds.bankAccountDeleted'));
                fetchBankAccounts();
            } else {
                setError(data.message || t('funds.failedToDelete'));
            }
        } catch (err) {
            setError(t('funds.networkError'));
        }
    };

    const handleSetDefault = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/bank-details/${id}/set-default`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(t('funds.bankAccountSetAsDefault'));
                fetchBankAccounts();
            }
        } catch (err) {
            setError(t('funds.failedToSetDefault'));
        }
    };

    return (
        <div className="space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('funds.bankDetails')}</h3>
                    <p className="text-gray-400 text-sm">{bankAccounts.length}/1 {t('funds.accountAdded')}</p>
                </div>
                {bankAccounts.length < 1 && !showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium"
                    >
                        + {t('funds.addBankAccount')}
                    </button>
                )}
            </div>

            {/* Messages */}
            {error && (
                <div className="p-4 bg-red-900/50 border border-red-600 rounded-xl text-red-300 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-green-900/50 border border-green-600 rounded-xl text-green-300 text-sm">
                    {success}
                </div>
            )}

            {/* Add/Edit Form */}
            {showForm && (
                <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-5 border border-blue-500/30">
                    <h4 className="text-gray-900 dark:text-white font-semibold mb-4">
                        {editingId ? t('funds.editBankAccount') : t('funds.addBankAccount')}
                    </h4>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-300 text-sm mb-1">
                                {t('funds.accountHolderName')} <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.accountHolderName}
                                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                                className="w-full bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t('funds.nameAsPerBank')}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm mb-1">{t('funds.accountNumber')}</label>
                            <input
                                type="text"
                                value={formData.accountNumber}
                                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                className="w-full bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t('funds.enterAccountNumber')}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm mb-1">{t('funds.ifscCode')}</label>
                            <input
                                type="text"
                                value={formData.ifscCode}
                                onChange={handleIFSCChange}
                                maxLength="11"
                                className="w-full bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t('funds.ifscPlaceholder')}
                            />
                            {fetchingBankName && (
                                <p className="text-blue-400 text-xs mt-1">{t('funds.fetchingBankName')}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm mb-1">{t('funds.bankName')}</label>
                            <input
                                type="text"
                                value={formData.bankName}
                                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                className="w-full bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t('funds.bankNamePlaceholder')}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                {submitting ? t('common.saving') : (editingId ? t('common.update') : t('funds.addAccount'))}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bank Accounts List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 p-4 flex items-center justify-between gap-4 skeleton-shimmer">
                            <div className="space-y-2 flex-1 min-w-0">
                                <div className="h-5 w-32 bg-white/10 rounded" />
                                <div className="h-4 w-48 bg-white/10 rounded" />
                            </div>
                            <div className="h-9 w-20 rounded-lg bg-white/10 shrink-0" />
                        </div>
                    ))}
                </div>
            ) : bankAccounts.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
                    </svg>
                    <p className="text-gray-400">{t('funds.noBankAccounts')}</p>
                    <p className="text-gray-500 text-sm mt-1">{t('funds.addYourFirstBankAccount')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bankAccounts.map((acc) => (
                        <div
                            key={acc._id}
                            className={`bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-4 border ${
                                acc.isDefault ? 'border-yellow-500/50' : 'border-gray-200 dark:border-white/10'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-gray-900 dark:text-white font-semibold">{acc.accountHolderName}</p>
                                            {acc.isDefault && (
                                                <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-400 text-xs rounded-full">
                                                    {t('funds.default')}
                                                </span>
                                            )}
                                        </div>
                                        {acc.bankName && (
                                            <p className="text-gray-400 text-sm">{acc.bankName}</p>
                                        )}
                                        {acc.accountNumber && (
                                            <p className="text-gray-500 text-sm">
                                                {t('funds.accountNumber')}: ****{acc.accountNumber.slice(-4)} | {t('funds.ifscCode')}: {acc.ifscCode}
                                            </p>
                                        )}
                                        {acc.upiId && (
                                            <p className="text-gray-500 text-sm">UPI: {acc.upiId}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-white/5">
                                {!acc.isDefault && (
                                    <button
                                        onClick={() => handleSetDefault(acc._id)}
                                        className="px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg text-xs"
                                    >
                                        {t('funds.setAsDefault')}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEdit(acc)}
                                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs"
                                >
                                    {t('common.edit')}
                                </button>
                                <button
                                    onClick={() => handleDelete(acc._id)}
                                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs"
                                >
                                    {t('common.delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl max-w-sm w-full p-6 border border-blue-500/30 text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{successMessage.title}</h3>
                        
                        <div className="bg-blue-900/30 rounded-xl p-4 mb-4">
                            <svg className="w-12 h-12 text-blue-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
                            </svg>
                        </div>

                        <p className="text-gray-400 text-sm mb-6">
                            {successMessage.subtitle}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
                            >
                                {t('common.done')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    navigate('/funds?tab=withdraw-fund');
                                }}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-gray-800 dark:text-white font-medium rounded-xl transition-colors"
                            >
                                {t('funds.goToWithdraw')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankDetail;
