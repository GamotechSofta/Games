import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import MarketList from '../components/MarketList';
import MarketForm from '../components/MarketForm';
import StarlineManagement from './StarlineManagement';
import KingBazaarManagement from './KingBazaarManagement';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { FaChartBar, FaStar, FaCrown } from 'react-icons/fa';
import { clearAdminAuth } from '../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

const TABS = [
    { id: 'regular', label: 'Regular Market', icon: FaChartBar },
    { id: 'starline', label: 'Starline Market', icon: FaStar },
    { id: 'king', label: 'King Bazaar Market', icon: FaCrown },
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
            const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=main`);
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
        fetchMarkets();
    }, [navigate]);

    useRefreshOnMarketReset(fetchMarkets);

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const handleCreate = () => {
        setEditingMarket(null);
        setFormDefaultType('main');
        setShowForm(true);
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

    const getAuthHeaders = () => {
        const admin = JSON.parse(localStorage.getItem('admin') || '{}');
        const password = localStorage.getItem('adminPassword') || sessionStorage.getItem('adminPassword') || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${admin.username}:${password}`)}`,
        };
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Markets">
            <div className="min-w-0">
                {error && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm sm:text-base">
                        {error}
                    </div>
                )}

                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-4 truncate">Markets Management</h1>

                {/* Top tabs: Regular | Starline | King Bazaar */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                                    isActive
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                {tab.label}
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
                        getAuthHeaders={getAuthHeaders}
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
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                    <span className="inline-block w-1 h-6 sm:h-7 bg-gray-500 rounded-full" />
                                    Main / Daily Markets
                                </h2>
                                <button
                                    onClick={handleCreate}
                                    className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl transition-colors text-sm sm:text-base touch-manipulation"
                                >
                                    + Add Market
                                </button>
                            </div>
                            <MarketList
                                markets={mainMarkets}
                                onEdit={handleEdit}
                                onDelete={fetchMarkets}
                                apiBaseUrl={API_BASE_URL}
                                getAuthHeaders={getAuthHeaders}
                            />
                        </section>
                    )
                )}
            </div>
        </AdminLayout>
    );
};

export default Markets;
