import { NavLink, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useCallRequests } from '../../context/CallRequestsContext';
import { NAV_ITEMS } from '../../constants/navItems';

const Sidebar = ({ isOpen, onClose }) => {
    const { session, logout } = useAuth();
    const { requestCount } = useCallRequests();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
        onClose?.();
    };

    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
            isActive
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`;

    return (
        <aside
            className={`fixed lg:sticky lg:top-0 lg:self-start inset-y-0 left-0 z-40 w-64 shrink-0 h-screen max-h-screen bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
                isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
        >
            <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
                        TC
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">Telecaller</p>
                        <p className="text-xs text-gray-500 truncate font-mono">
                            {session?.phone || session?.username || '—'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="lg:hidden p-2 text-gray-400 hover:text-gray-700"
                    aria-label="Close menu"
                >
                    <FaTimes className="w-5 h-5" />
                </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    const badge = item.showRequestBadge && requestCount > 0 ? requestCount : 0;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={linkClass}
                            onClick={onClose}
                        >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="truncate flex-1">{item.label}</span>
                            {badge > 0 && (
                                <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                    {badge > 99 ? '99+' : badge}
                                </span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-3 border-t border-gray-200">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-sm font-medium"
                >
                    <FaSignOutAlt className="w-4 h-4" />
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
