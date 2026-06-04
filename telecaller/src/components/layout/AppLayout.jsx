import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import Sidebar from './Sidebar';

const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex items-stretch">
            {sidebarOpen && (
                <button
                    type="button"
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                    aria-label="Close menu overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
                <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg border border-gray-200 text-gray-700"
                        aria-label="Open menu"
                    >
                        <FaBars className="w-5 h-5" />
                    </button>
                    <span className="font-semibold text-gray-900">Telecaller</span>
                </header>

                <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
