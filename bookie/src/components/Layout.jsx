import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { FaBars } from 'react-icons/fa';

const Layout = ({ children, title }) => {
    const navigate = useNavigate();
    const { bookie, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen text-gray-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
            {/* Mobile header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0B1120]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-40 shadow-sm">
                <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 mr-2 rounded-xl hover:bg-white/5 text-amber-500 transition-colors"
                    aria-label="Open menu"
                >
                    <FaBars className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent truncate mx-auto tracking-tight">
                    {title || 'Bookie Panel'}
                </h1>
                <div className="w-10" />
            </header>

            {/* Sidebar */}
            <Sidebar
                user={bookie}
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-30"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}

            {/* Main content */}
            <main className="pt-14 lg:pt-0 lg:ml-72 min-h-screen overflow-x-hidden">
                <div className="p-3 sm:p-4 md:p-6 lg:p-8 lg:pl-10 min-w-0 max-w-full box-border">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
