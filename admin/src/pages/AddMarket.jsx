import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import MarketForm from '../components/MarketForm';
import { useNavigate } from 'react-router-dom';
import { clearAdminAuth, adminFetch, API_BASE_URL } from '../utils/api';

const AddMarket = () => {
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(true);

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/');
    };

    const handleFormClose = () => {
        navigate('/dashboard');
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Add Market">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6">Add New Market</h1>
                    {showForm && (
                        <MarketForm
                            market={null}
                            onClose={handleFormClose}
                            onSuccess={handleFormClose}
                            apiBaseUrl={API_BASE_URL}
                            authFetch={adminFetch}
                        />
                    )}
        </AdminLayout>
    );
};

export default AddMarket;
