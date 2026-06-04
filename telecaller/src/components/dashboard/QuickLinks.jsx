import { Link } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/navItems';

const QuickLinks = () => (
    <div className="grid sm:grid-cols-2 gap-3 mt-6">
        {NAV_ITEMS.filter((item) => item.path !== '/dashboard').map((item) => (
            <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all"
            >
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <span className="font-medium text-gray-900 block">{item.label}</span>
                    {item.description && (
                        <span className="text-xs text-gray-500 block mt-0.5">{item.description}</span>
                    )}
                </div>
            </Link>
        ))}
    </div>
);

export default QuickLinks;
