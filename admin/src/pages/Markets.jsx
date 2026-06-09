import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import MarketList from '../components/MarketList';
import MarketForm from '../components/MarketForm';
import StarlineManagement from './StarlineManagement';
import KingBazaarManagement from './KingBazaarManagement';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { FaChartBar, FaStar, FaCrown } from 'react-icons/fa';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';

const TABS = [
    { id: 'regular', label: 'Regular Market', shortLabel: 'Regular', icon: FaChartBar },
    { id: 'starline', label: 'Starline Market', shortLabel: 'Starline', icon: FaStar },
    { id: 'king', label: 'King Bazaar Market', shortLabel: 'King Bazaar', icon: FaCrown },
];

const Markets = () => {
    const location = useLocation();
    const [markets, setMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingMarket, setEditingMarket] = useState(null);
    const [formDefaultType, setFormDefaultType] = useState('main');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('regular');
    const [showAddPasswordModal, setShowAddPasswordModal] = useState(false);
    const [addSecretPassword, setAddSecretPassword] = useState('');
    const [addPasswordError, setAddPasswordError] = useState('');
    const [hasSecretDeclarePassword, setHasSecretDeclarePassword] = useState(false);
    const navigate = useNavigate();

    const mainMarkets = markets || [];

    useEffect(() => {
        const type = (location.state?.marketType || '').toString().toLowerCase();
        if (type === 'starline') setActiveTab('starline');
        if (type === 'king') setActiveTab('king');
    }, [location.state?.marketType]);

    const fetchMarkets = async () => {
        try {
            setLoading(true);
            const response = await adminFetch(`${API_BASE_URL}/markets/get-markets?marketType=main&fields=home`);
            const data = await response.json();
            if (data.success) {
                setMarkets(data.data || []);
            } else {
                setError('Failed to fetch markets');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const admin = localStorage.getItem('admin');
        if (!admin) {
            navigate('/');
            return;
        }
        if (location.pathname === '/markets') {
            fetchMarkets();
        }
    }, [navigate, location.pathname]);

    useRefreshOnMarketReset(fetchMarkets);

    useEffect(() => {
        adminFetch(`${API_BASE_URL}/admin/me/secret-declare-password-status`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success) setHasSecretDeclarePassword(json.hasSecretDeclarePassword || false);
            })
            .catch(() => setHasSecretDeclarePassword(false));
    }, []);

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const handleCreate = () => {
        if (hasSecretDeclarePassword) {
            setShowAddPasswordModal(true);
            setAddSecretPassword('');
            setAddPasswordError('');
        } else {
            openCreateForm();
        }
    };

    const openCreateForm = () => {
        setEditingMarket(null);
        setFormDefaultType('main');
        setShowForm(true);
    };

    const performCreateAfterVerify = async () => {
        const val = addSecretPassword.trim();
        if (!val) {
            setAddPasswordError('Please enter the secret declare password');
            return;
        }
        try {
            const response = await adminFetch(`${API_BASE_URL}/admin/verify-secret-declare-password`, {
                method: 'POST',
                body: JSON.stringify({ secretDeclarePassword: val }),
            });
            const data = await response.json();
            if (data.success) {
                setShowAddPasswordModal(false);
                setAddSecretPassword('');
                setAddPasswordError('');
                openCreateForm();
            } else {
                if (data.code === 'INVALID_SECRET_DECLARE_PASSWORD') {
                    setAddPasswordError(data.message || 'Invalid secret declare password');
                } else {
                    setAddPasswordError(data.message || 'Verification failed');
                }
            }
        } catch (err) {
            setAddPasswordError('Network error');
        }
    };

    const handleEdit = (market) => {
        setEditingMarket(market);
        setFormDefaultType(market.marketType === 'startline' ? 'startline' : 'main');
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingMarket(null);
        fetchMarkets();
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Markets">
            <div className="min-w-0">
                {error && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm sm:text-base">
                        {error}
                    </div>
                )}

                <h1 className="text-base sm:text-lg font-bold mb-2 truncate">Markets Management</h1>

                {/* Top tabs: Regular | Starline | King Bazaar — always one row */}
                <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-3 min-w-0">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                title={tab.label}
                                className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 py-2 sm:px-4 sm:py-2.5 rounded-lg font-semibold text-[10px] sm:text-sm transition-all min-w-0 ${
                                    isActive
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span className="truncate w-full text-center sm:text-left leading-tight sm:hidden">
                                    {tab.shortLabel}
                                </span>
                                <span className="hidden sm:inline truncate">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {showForm && (
                    <MarketForm
                        market={editingMarket}
                        defaultMarketType={formDefaultType}
                        onClose={handleFormClose}
                        onSuccess={handleFormClose}
                        apiBaseUrl={API_BASE_URL}
                        authFetch={adminFetch}
                    />
                )}

                {activeTab === 'starline' && (
                    <StarlineManagement embedded />
                )}

                {activeTab === 'king' && (
                    <KingBazaarManagement embedded />
                )}

                {activeTab === 'regular' && (
                    loading ? (
                        <div className="text-center py-8 sm:py-12">
                            <p className="text-gray-400 text-sm sm:text-base">Loading markets...</p>
                        </div>
                    ) : (
                        <section>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                                    <span className="inline-block w-0.5 h-4 bg-gray-500 rounded-full" />
                                    Main / Daily Markets
                                </h2>
                                <button
                                    onClick={handleCreate}
                                    type="button"
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors text-xs sm:text-sm"
                                >
                                    + Add Market
                                </button>
                            </div>
                            <MarketList
                                markets={mainMarkets}
                                onEdit={handleEdit}
                                onDelete={fetchMarkets}
                                apiBaseUrl={API_BASE_URL}
                                authFetch={adminFetch}
                            />
                        </section>
                    )
                )}

                {/* Secret password modal for Add Market */}
                {showAddPasswordModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-yellow-500 mb-2">Enter Secret Password to Add Market</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Please enter the secret password to add a new market.
                            </p>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    performCreateAfterVerify();
                                }}
                                className="space-y-4"
                            >
                                <input
                                    type="password"
                                    value={addSecretPassword}
                                    onChange={(e) => { setAddSecretPassword(e.target.value); setAddPasswordError(''); }}
                                    placeholder="Secret password"
                                    autoFocus
                                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                />
                                {addPasswordError && <p className="text-red-400 text-sm">{addPasswordError}</p>}
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-semibold rounded-lg"
                                    >
                                        Add Market
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddPasswordModal(false); setAddSecretPassword(''); setAddPasswordError(''); }}
                                        className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg border border-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default Markets;
