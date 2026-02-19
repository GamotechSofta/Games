import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { FaBars, FaSignOutAlt } from 'react-icons/fa';

const AdminLayout = ({ children, onLogout, title }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const pathname = location.pathname || '';

    const admin = (() => {
        try {
            return JSON.parse(localStorage.getItem('admin') || '{}');
        } catch {
            return {};
        }
    })();
    const role = admin.role || 'super_admin';
    const allowedTabs = Array.isArray(admin.allowedTabs) ? admin.allowedTabs : [];

    const isAllowedPath = allowedTabs.some((t) => pathname === t || pathname.startsWith(t + '/'))
        || (allowedTabs.includes('/add-result') && (pathname === '/declare-confirm' || pathname === '/declare-success'));
    if (role === 'specific_admin' && allowedTabs.length > 0 && !isAllowedPath) {
        const first = allowedTabs[0];
        return <Navigate to={first || '/dashboard'} replace />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 text-white">
            {/* Mobile header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 flex items-center justify-between px-3 z-40 shadow-lg">
                <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
                    aria-label="Open menu"
                >
                    <FaBars className="w-5 h-5 text-yellow-500" />
                </button>
                <h1 className="text-base font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent truncate mx-2">{title || 'Admin'}</h1>
                <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                    aria-label="Logout"
                >
                    <FaSignOutAlt className="w-4 h-4 text-red-400" />
                </button>
            </header>

            {/* Backdrop for mobile – render first so sidebar (z-[60]) stays on top and receives clicks */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-[50]"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}

            {/* Sidebar – higher z-index so it receives clicks when open */}
            <Sidebar
                onLogout={onLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main content */}
            <main className="pt-12 lg:pt-0 lg:ml-64 min-h-screen overflow-x-hidden">
                <div className="p-2.5 sm:p-3 md:p-4 lg:p-6 lg:pl-8 min-w-0 max-w-full box-border">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
